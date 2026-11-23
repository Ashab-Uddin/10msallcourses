-- ============================================================================
-- Migration: 0020_categories_auto_order_rpc.sql
-- Project:   10ms Affiliate Portal (10msallcourse.com)
-- Purpose:   Provide atomic, concurrency-safe PostgreSQL RPC functions for
--            generating the next category display_order (`MAX(display_order) + 1`)
--            and inserting new categories without duplicate orders even under
--            simultaneous requests or after category deletions.
-- Safety:
--   - Does NOT modify or reorder any existing category rows.
--   - Uses pg_advisory_xact_lock to serialize concurrent category creations.
--   - Enforces positive + unique display_order constraints idempotently.
-- ============================================================================

BEGIN;

-- 1. Ensure display_order >= 1 check constraint exists (idempotent, NO row edits)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.categories'::regclass
      AND conname = 'chk_categories_display_order_positive'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT chk_categories_display_order_positive
      CHECK (display_order >= 1) NOT VALID;
    ALTER TABLE public.categories
      VALIDATE CONSTRAINT chk_categories_display_order_positive;
  END IF;
END;
$$;

-- 2. Ensure unique display_order constraint exists (idempotent, NO row edits)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.categories'::regclass
      AND conname = 'uq_categories_display_order'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT uq_categories_display_order UNIQUE (display_order);
  END IF;
END;
$$;

-- 3. Read-only helper RPC: returns COALESCE(MAX(display_order), 0) + 1
CREATE OR REPLACE FUNCTION public.get_next_category_display_order()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (COALESCE(MAX(c.display_order), 0) + 1)::INTEGER
  FROM public.categories c;
$$;

REVOKE ALL ON FUNCTION public.get_next_category_display_order() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_category_display_order() TO service_role;

-- 4. Atomic category creation RPC with advisory transaction lock
CREATE OR REPLACE FUNCTION public.create_category_with_auto_order(
  p_name          TEXT,
  p_slug          TEXT,
  p_subtitle      TEXT DEFAULT NULL,
  p_badge_color   TEXT DEFAULT 'red',
  p_display_order INTEGER DEFAULT NULL,
  p_status        TEXT DEFAULT 'active'
)
RETURNS SETOF public.categories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name          TEXT := left(btrim(COALESCE(p_name, '')), 120);
  v_slug          TEXT := left(btrim(COALESCE(p_slug, '')), 120);
  v_subtitle      TEXT := NULLIF(left(btrim(COALESCE(p_subtitle, '')), 250), '');
  v_badge_color   TEXT := COALESCE(NULLIF(left(btrim(COALESCE(p_badge_color, 'red')), 30), ''), 'red');
  v_status        TEXT := CASE WHEN p_status = 'inactive' THEN 'inactive' ELSE 'active' END;
  v_display_order INTEGER;
  v_existing_id   BIGINT;
BEGIN
  IF v_name = '' OR v_slug = '' THEN
    RAISE EXCEPTION 'Category name and slug are required.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Serialize concurrent category creations / order allocations within PostgreSQL
  PERFORM pg_advisory_xact_lock(918273645);

  SELECT c.id INTO v_existing_id
  FROM public.categories c
  WHERE lower(c.slug) = lower(v_slug)
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Category slug already exists: %', v_slug
      USING ERRCODE = 'unique_violation',
            CONSTRAINT = 'uq_categories_slug_lower';
  END IF;

  IF p_display_order IS NULL THEN
    SELECT (COALESCE(MAX(c.display_order), 0) + 1)::INTEGER
    INTO v_display_order
    FROM public.categories c;
  ELSE
    IF p_display_order < 1 OR p_display_order > 1000000 THEN
      RAISE EXCEPTION 'Category display_order must be between 1 and 1000000.'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;

    SELECT c.id INTO v_existing_id
    FROM public.categories c
    WHERE c.display_order = p_display_order
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RAISE EXCEPTION 'Category display_order already exists: %', p_display_order
        USING ERRCODE = 'unique_violation',
              CONSTRAINT = 'uq_categories_display_order';
    END IF;

    v_display_order := p_display_order;
  END IF;

  RETURN QUERY
  INSERT INTO public.categories (
    name,
    slug,
    subtitle,
    badge_color,
    display_order,
    status
  )
  VALUES (
    v_name,
    v_slug,
    v_subtitle,
    v_badge_color,
    v_display_order,
    v_status
  )
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.create_category_with_auto_order(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_category_with_auto_order(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) TO service_role;

COMMIT;
