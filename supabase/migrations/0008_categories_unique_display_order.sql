-- ============================================================================
-- Migration: 0008_categories_unique_display_order.sql
-- Project:   10ms Affiliate Portal (10msallcourse.com)
-- Purpose:   Enforce database-level uniqueness and positive integer constraints
--            on `public.categories.display_order` so two categories can never
--            share the same sort order, and provide an atomic swap RPC.
-- Safety:
--   - Deduplicates any pre-existing duplicate or < 1 display_order values
--     while preserving relative visual order (`display_order ASC, id ASC`).
--   - Zero row deletions; zero changes to slugs, names, or courses.
-- ============================================================================

BEGIN;

-- 1. Normalize any existing duplicate or non-positive display_order values cleanly
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY GREATEST(1, display_order) ASC, id ASC
    )::INTEGER AS normalized_order
  FROM public.categories
)
UPDATE public.categories c
SET display_order = r.normalized_order
FROM ranked r
WHERE c.id = r.id
  AND c.display_order IS DISTINCT FROM r.normalized_order;

-- 2. Enforce strictly positive display_order (>= 1)
DO $$
DECLARE
  v_constraint RECORD;
BEGIN
  FOR v_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.categories'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%display_order%'
  LOOP
    EXECUTE format('ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS %I', v_constraint.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.categories
  ADD CONSTRAINT chk_categories_display_order_positive
  CHECK (display_order >= 1);

-- 3. Enforce unique display_order across all categories at PostgreSQL level
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

-- 4. Atomic two-category order swap RPC (safe with uq_categories_display_order)
CREATE OR REPLACE FUNCTION public.swap_category_display_order(
  p_first_id  BIGINT,
  p_second_id BIGINT
)
RETURNS TABLE (
  id            BIGINT,
  display_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_first_order  INTEGER;
  v_second_order INTEGER;
  v_temp_order   INTEGER;
BEGIN
  IF p_first_id IS NULL OR p_second_id IS NULL OR p_first_id = p_second_id THEN
    RAISE EXCEPTION 'Two distinct valid category IDs are required.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Lock both rows in deterministic ID order to avoid deadlocks
  PERFORM 1
  FROM public.categories c
  WHERE c.id IN (p_first_id, p_second_id)
  ORDER BY c.id ASC
  FOR UPDATE;

  SELECT c.display_order INTO v_first_order
  FROM public.categories c
  WHERE c.id = p_first_id;

  SELECT c.display_order INTO v_second_order
  FROM public.categories c
  WHERE c.id = p_second_id;

  IF v_first_order IS NULL OR v_second_order IS NULL THEN
    RAISE EXCEPTION 'One or both categories not found.'
      USING ERRCODE = 'no_data_found';
  END IF;

  SELECT COALESCE(MAX(c.display_order), 0) + 10000
  INTO v_temp_order
  FROM public.categories c;

  UPDATE public.categories
  SET display_order = v_temp_order
  WHERE public.categories.id = p_first_id;

  UPDATE public.categories
  SET display_order = v_first_order
  WHERE public.categories.id = p_second_id;

  UPDATE public.categories
  SET display_order = v_second_order
  WHERE public.categories.id = p_first_id;

  RETURN QUERY
  SELECT c.id, c.display_order
  FROM public.categories c
  WHERE c.id IN (p_first_id, p_second_id)
  ORDER BY c.display_order ASC, c.id ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.swap_category_display_order(BIGINT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.swap_category_display_order(BIGINT, BIGINT) TO service_role;

COMMIT;
