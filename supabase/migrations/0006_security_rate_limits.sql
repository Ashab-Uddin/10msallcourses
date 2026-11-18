-- ============================================================================
-- Migration: 0006_security_rate_limits.sql
-- Project:   10ms Affiliate Portal (10msallcourse.com)
-- Purpose:   Phase 1 Security Hardening — Distributed PostgreSQL Rate Limiting
--            Store + Atomic Server-Only RPC (`public.consume_rate_limit`).
--            Replaces volatile per-instance in-memory rate-limit maps on
--            Vercel Serverless / Edge deployments with atomic PostgreSQL state.
-- Execution: Run AFTER 0001_initial_schema.sql through 0005_categories_redesign.sql.
-- Safety:
--   - Additive ONLY: creates 1 new table (`rate_limit_buckets`), 1 index, and
--     1 server-only function (`consume_rate_limit`). Zero edits or drops to any
--     existing tables, rows, policies, or migrations.
--   - Fail-closed RLS + REVOKE ALL from PUBLIC, anon, authenticated:
--     clients cannot read, probe, or reset rate-limit buckets directly.
--   - Invoked exclusively via Supabase `service_role` from Next.js API routes.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. public.rate_limit_buckets
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key        TEXT        PRIMARY KEY CHECK (pg_catalog.char_length(pg_catalog.btrim(bucket_key)) BETWEEN 1 AND 220),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  request_count     INTEGER     NOT NULL DEFAULT 1 CHECK (request_count >= 0),
  expires_at        TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_expires_at
  ON public.rate_limit_buckets (expires_at);

COMMENT ON TABLE public.rate_limit_buckets IS 'Server-only distributed fixed-window rate limit buckets managed exclusively by public.consume_rate_limit RPC.';

REVOKE ALL ON TABLE public.rate_limit_buckets FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.rate_limit_buckets TO service_role;

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. public.consume_rate_limit (Atomic Server-Only RPC: service_role)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_bucket_key     TEXT,
  p_max_requests   INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE (
  allowed             BOOLEAN,
  remaining           INTEGER,
  retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clean_key    TEXT        := pg_catalog.left(pg_catalog.btrim(COALESCE(p_bucket_key, '')), 220);
  v_max_req      INTEGER     := GREATEST(1, COALESCE(p_max_requests, 1));
  v_window_sec   INTEGER     := GREATEST(1, COALESCE(p_window_seconds, 60));
  v_now          TIMESTAMPTZ := pg_catalog.now();
  v_new_expiry   TIMESTAMPTZ := v_now + pg_catalog.make_interval(secs => v_window_sec);
  v_count        INTEGER;
  v_expires_at   TIMESTAMPTZ;
BEGIN
  IF v_clean_key = '' THEN
    RAISE EXCEPTION 'p_bucket_key must be a non-empty string.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Bounded opportunistic cleanup of expired buckets (>15m stale) to prevent bloat
  DELETE FROM public.rate_limit_buckets b
  WHERE b.ctid IN (
    SELECT stale.ctid
    FROM public.rate_limit_buckets stale
    WHERE stale.expires_at < (v_now - INTERVAL '15 minutes')
    LIMIT 100
  );

  -- Atomic upsert & window reset/increment under PostgreSQL row lock
  INSERT INTO public.rate_limit_buckets AS rlb (
    bucket_key,
    window_started_at,
    request_count,
    expires_at
  )
  VALUES (
    v_clean_key,
    v_now,
    1,
    v_new_expiry
  )
  ON CONFLICT (bucket_key) DO UPDATE
  SET
    window_started_at = CASE
      WHEN rlb.expires_at <= v_now THEN v_now
      ELSE rlb.window_started_at
    END,
    request_count = CASE
      WHEN rlb.expires_at <= v_now THEN 1
      ELSE LEAST(rlb.request_count + 1, v_max_req + 1)
    END,
    expires_at = CASE
      WHEN rlb.expires_at <= v_now THEN v_new_expiry
      ELSE rlb.expires_at
    END
  RETURNING rlb.request_count, rlb.expires_at
  INTO v_count, v_expires_at;

  IF v_count <= v_max_req THEN
    RETURN QUERY
    SELECT
      true AS allowed,
      GREATEST(0, v_max_req - v_count) AS remaining,
      0 AS retry_after_seconds;
  ELSE
    RETURN QUERY
    SELECT
      false AS allowed,
      0 AS remaining,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_expires_at - v_now)))::INTEGER) AS retry_after_seconds;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) IS 'Server-only atomic rate limiter using PostgreSQL row locks. Accessible strictly to service_role.';

COMMIT;
