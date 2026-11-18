-- ============================================================================
-- Migration: 0002_rls_and_functions.sql
-- Project:   10ms Affiliate Portal (10msallcourse.com)
-- Purpose:   Configure PostgreSQL triggers, hardened SECURITY DEFINER functions,
--            server-only atomic RPCs (preventing PostgREST rate-limit bypass),
--            least-privilege GRANTs, and Row Level Security (RLS) on all 7 tables.
-- Execution: Run SECOND (immediately after 0001_initial_schema.sql).
-- Security Architecture (Hardened in Stage B.1 Audit):
--   - All functions enforce `SET search_path = ''` with explicit schema qualifiers.
--   - Course Public Visibility (Approved Option 2):
--       * Public visitors (`anon` & non-admin `authenticated`) read `active` and
--         `closed` courses only; `inactive` courses are strictly hidden.
--       * Active admins (`public.is_admin()`) have full CRUD across all statuses.
--   - Anti-Spam / Rate-Limit Protection:
--       * Public click tracking (`record_active_course_click`) and public inquiry
--         submission (`submit_customer_inquiry`) are restricted to `service_role`
--         so direct PostgREST calls using the public publishable key CANNOT bypass
--         Next.js server-side rate limiting and validation.
--   - Historical Click Records:
--       * Zero public access; admin read-only SELECT (append-only protection).
--   - Admin Self-Escalation Prevention:
--       * `admin_users` grants SELECT-only (own active row) to `authenticated`.
--       * No client or admin can INSERT, UPDATE, or DELETE `admin_users` rows.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TIMESTAMP & REFERENTIAL SYNC TRIGGERS
-- ============================================================================

-- Generic updated_at trigger for tables without special click_count logic
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

-- Courses updated_at trigger: preserves updated_at when ONLY click_count changes
CREATE OR REPLACE FUNCTION public.set_courses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (pg_catalog.to_jsonb(NEW) - 'click_count' - 'updated_at')
     IS DISTINCT FROM
     (pg_catalog.to_jsonb(OLD) - 'click_count' - 'updated_at') THEN
    NEW.updated_at := pg_catalog.now();
  END IF;
  RETURN NEW;
END;
$$;

-- Enforce courses.category_slug always matches referenced categories.slug
CREATE OR REPLACE FUNCTION public.enforce_course_category_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_cat_slug TEXT;
BEGIN
  SELECT c.slug INTO v_cat_slug
  FROM public.categories c
  WHERE c.id = NEW.category_id;

  IF v_cat_slug IS NULL THEN
    RAISE EXCEPTION 'Invalid category_id: %', NEW.category_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  NEW.category_slug := v_cat_slug;
  RETURN NEW;
END;
$$;

-- Cascade category slug rename to linked courses automatically
CREATE OR REPLACE FUNCTION public.sync_courses_on_category_slug_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
    UPDATE public.courses
    SET category_slug = NEW.slug
    WHERE category_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Prevent direct RPC probing of internal trigger functions via PostgREST
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_courses_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_course_category_slug() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_courses_on_category_slug_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_categories_set_updated_at ON public.categories;
CREATE TRIGGER trg_categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_sync_course_slug ON public.categories;
CREATE TRIGGER trg_categories_sync_course_slug
  AFTER UPDATE OF slug ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_courses_on_category_slug_change();

DROP TRIGGER IF EXISTS trg_courses_enforce_category_slug ON public.courses;
CREATE TRIGGER trg_courses_enforce_category_slug
  BEFORE INSERT OR UPDATE OF category_id, category_slug ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_course_category_slug();

DROP TRIGGER IF EXISTS trg_courses_set_updated_at ON public.courses;
CREATE TRIGGER trg_courses_set_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_courses_updated_at();

DROP TRIGGER IF EXISTS trg_website_settings_set_updated_at ON public.website_settings;
CREATE TRIGGER trg_website_settings_set_updated_at
  BEFORE UPDATE ON public.website_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_offer_timers_set_updated_at ON public.offer_timers;
CREATE TRIGGER trg_offer_timers_set_updated_at
  BEFORE UPDATE ON public.offer_timers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_admin_users_set_updated_at ON public.admin_users;
CREATE TRIGGER trg_admin_users_set_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 2. ADMIN AUTHORIZATION HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

COMMENT ON FUNCTION public.is_admin() IS 'Returns true iff the authenticated Supabase Auth user is an active entry in public.admin_users.';

-- ============================================================================
-- 3A. ATOMIC AFFILIATE CLICK TRACKING RPC (SERVER-ONLY: service_role)
-- Invoked exclusively by rate-limited Next.js server routes
-- (`/api/public/click/[slug]` and `/go/[slug]`).
-- Validates `status = ''active''`, atomically increments `courses.click_count`
-- under PostgreSQL row lock, and appends a snapshot into `click_records`.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_active_course_click(
  p_slug       TEXT,
  p_referrer   TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  affiliate_url TEXT,
  course_title  TEXT,
  click_count   BIGINT,
  status        TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clean_slug TEXT := pg_catalog.btrim(COALESCE(p_slug, ''));
  v_course     RECORD;
  v_new_count  BIGINT;
  v_referrer   TEXT := pg_catalog.left(COALESCE(NULLIF(pg_catalog.btrim(COALESCE(p_referrer, '')), ''), 'direct'), 300);
  v_user_agent TEXT := pg_catalog.left(COALESCE(NULLIF(pg_catalog.btrim(COALESCE(p_user_agent, '')), ''), 'unknown'), 300);
BEGIN
  IF v_clean_slug = '' THEN
    RETURN;
  END IF;

  -- Row-locked atomic increment exclusively for active courses
  UPDATE public.courses c
  SET click_count = c.click_count + 1
  WHERE c.slug = v_clean_slug
    AND c.status = 'active'
  RETURNING c.id, c.slug, c.title, c.affiliate_url, c.click_count, c.status
  INTO v_course;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_new_count := v_course.click_count;

  INSERT INTO public.click_records (
    course_id,
    course_slug,
    course_title,
    referrer,
    user_agent,
    clicked_at
  )
  VALUES (
    v_course.id,
    v_course.slug,
    v_course.title,
    v_referrer,
    v_user_agent,
    pg_catalog.now()
  );

  RETURN QUERY
  SELECT
    v_course.affiliate_url,
    v_course.title,
    v_new_count,
    v_course.status;
END;
$$;

REVOKE ALL ON FUNCTION public.record_active_course_click(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_active_course_click(TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.record_active_course_click(TEXT, TEXT, TEXT) IS 'Server-only atomic RPC: validates active course status, increments click_count safely under concurrency, and appends click snapshot.';

-- ============================================================================
-- 3B. PUBLIC CUSTOMER INQUIRY SUBMISSION RPC (SERVER-ONLY: service_role)
-- Invoked exclusively by rate-limited Next.js server route `/api/public/message`.
-- Prevents direct PostgREST spam while returning the created inquiry row cleanly
-- without ever exposing SELECT on private inquiries to non-admins.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_customer_inquiry(
  p_name           TEXT,
  p_phone_or_email TEXT,
  p_message        TEXT,
  p_course_title   TEXT DEFAULT NULL
)
RETURNS TABLE (
  id             BIGINT,
  name           TEXT,
  phone_or_email TEXT,
  message        TEXT,
  course_title   TEXT,
  status         TEXT,
  created_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name           TEXT := pg_catalog.left(COALESCE(NULLIF(pg_catalog.btrim(COALESCE(p_name, '')), ''), 'Anonymous'), 100);
  v_phone_or_email TEXT := pg_catalog.left(pg_catalog.btrim(COALESCE(p_phone_or_email, '')), 120);
  v_message        TEXT := pg_catalog.left(pg_catalog.btrim(COALESCE(p_message, '')), 2000);
  v_course_title   TEXT := NULLIF(pg_catalog.left(pg_catalog.btrim(COALESCE(p_course_title, '')), 200), '');
BEGIN
  IF pg_catalog.char_length(v_message) < 2 THEN
    RAISE EXCEPTION 'Message must be at least 2 characters.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN QUERY
  INSERT INTO public.inquiries (
    name,
    phone_or_email,
    message,
    course_title,
    status
  )
  VALUES (
    v_name,
    v_phone_or_email,
    v_message,
    v_course_title,
    'new'
  )
  RETURNING
    inquiries.id,
    inquiries.name,
    inquiries.phone_or_email,
    inquiries.message,
    inquiries.course_title,
    inquiries.status,
    inquiries.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_customer_inquiry(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_customer_inquiry(TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.submit_customer_inquiry(TEXT, TEXT, TEXT, TEXT) IS 'Server-only validated inquiry submission RPC called by rate-limited /api/public/message.';

-- ============================================================================
-- 4. LEAST-PRIVILEGE TABLE & SEQUENCE GRANTS
-- ============================================================================

REVOKE ALL ON TABLE
  public.categories,
  public.courses,
  public.click_records,
  public.inquiries,
  public.website_settings,
  public.offer_timers,
  public.admin_users
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON SEQUENCE
  public.categories_id_seq,
  public.courses_id_seq,
  public.click_records_id_seq,
  public.inquiries_id_seq,
  public.offer_timers_id_seq
FROM PUBLIC, anon, authenticated;

-- Public visitor (`anon`) grants — strictly read-only on public catalog/config
-- Zero direct write privileges (clicks & inquiries go through rate-limited server APIs)
GRANT SELECT ON TABLE public.categories       TO anon;
GRANT SELECT ON TABLE public.courses          TO anon;
GRANT SELECT ON TABLE public.website_settings TO anon;
GRANT SELECT ON TABLE public.offer_timers     TO anon;

-- Authenticated user grants — strictly gated by RLS policies below
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.courses          TO authenticated;
GRANT SELECT                         ON TABLE public.click_records    TO authenticated;
GRANT SELECT, UPDATE, DELETE         ON TABLE public.inquiries        TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON TABLE public.website_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.offer_timers     TO authenticated;
GRANT SELECT                         ON TABLE public.admin_users      TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE
  public.categories_id_seq,
  public.courses_id_seq,
  public.offer_timers_id_seq
TO authenticated;

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS) ON ALL 7 TABLES
-- ============================================================================

ALTER TABLE public.categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.click_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_timers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users      ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

-- ---- A. public.categories ----
DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_public_read
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS categories_admin_all ON public.categories;
CREATE POLICY categories_admin_all
  ON public.categories
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---- B. public.courses (Approved Option 2: active + closed visible; inactive hidden) ----
DROP POLICY IF EXISTS courses_public_read ON public.courses;
CREATE POLICY courses_public_read
  ON public.courses
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('active', 'closed'));

DROP POLICY IF EXISTS courses_admin_all ON public.courses;
CREATE POLICY courses_admin_all
  ON public.courses
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---- C. public.click_records (Zero public access; admin read-only; writes via server RPC) ----
DROP POLICY IF EXISTS click_records_admin_read ON public.click_records;
CREATE POLICY click_records_admin_read
  ON public.click_records
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ---- D. public.inquiries (Zero direct public access; submissions via rate-limited server RPC; admin SELECT/UPDATE/DELETE) ----
DROP POLICY IF EXISTS inquiries_public_insert ON public.inquiries;

DROP POLICY IF EXISTS inquiries_admin_select ON public.inquiries;
CREATE POLICY inquiries_admin_select
  ON public.inquiries
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS inquiries_admin_update ON public.inquiries;
CREATE POLICY inquiries_admin_update
  ON public.inquiries
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS inquiries_admin_delete ON public.inquiries;
CREATE POLICY inquiries_admin_delete
  ON public.inquiries
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---- E. public.website_settings (Public read singleton; admin INSERT/UPDATE only; no DELETE) ----
DROP POLICY IF EXISTS website_settings_public_read ON public.website_settings;
CREATE POLICY website_settings_public_read
  ON public.website_settings
  FOR SELECT
  TO anon, authenticated
  USING (id = 1);

DROP POLICY IF EXISTS website_settings_admin_write ON public.website_settings;

DROP POLICY IF EXISTS website_settings_admin_insert ON public.website_settings;
CREATE POLICY website_settings_admin_insert
  ON public.website_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() AND id = 1);

DROP POLICY IF EXISTS website_settings_admin_update ON public.website_settings;
CREATE POLICY website_settings_admin_update
  ON public.website_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin() AND id = 1)
  WITH CHECK (public.is_admin() AND id = 1);

-- ---- F. public.offer_timers (Public read non-paused, non-expired timers of active courses; admin all) ----
DROP POLICY IF EXISTS offer_timers_public_read ON public.offer_timers;
CREATE POLICY offer_timers_public_read
  ON public.offer_timers
  FOR SELECT
  TO anon, authenticated
  USING (
    is_paused = false
    AND end_at > now()
    AND EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = offer_timers.course_id
        AND c.status = 'active'
    )
  );

DROP POLICY IF EXISTS offer_timers_admin_all ON public.offer_timers;
CREATE POLICY offer_timers_admin_all
  ON public.offer_timers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---- G. public.admin_users (Active admin reads ONLY own row; zero client INSERT/UPDATE/DELETE) ----
DROP POLICY IF EXISTS admin_users_self_read ON public.admin_users;
CREATE POLICY admin_users_self_read
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND is_active = true);

COMMIT;
