-- ============================================================================
-- Migration 0016: Category-Wise Dynamic Course Position Management
-- ============================================================================
-- 100% Idempotent & Zero Data Loss:
--   - Preserves all existing courses, categories, affiliate links, and display_order.
--   - Creates `public.category_course_orders` so every category maintains its own
--     independent, conflict-free 1..N course order (even if a course appears in
--     multiple categories such as `skills` + `language-learning` or `free-course`).
--   - Provides atomic transactional RPC `public.save_category_course_positions`
--     with row-level locking, deferred unique constraint enforcement, and
--     automatic rollback on any validation/database error.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.category_course_orders (
  category_slug TEXT NOT NULL,
  category_id BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
  course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL CHECK (sort_order >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (category_slug, course_id),
  CONSTRAINT uq_category_course_orders_slot
    UNIQUE (category_slug, sort_order) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_category_course_orders_lookup
  ON public.category_course_orders (category_slug, sort_order ASC, course_id ASC);

CREATE INDEX IF NOT EXISTS idx_category_course_orders_course
  ON public.category_course_orders (course_id);

-- Row Level Security: public read-only, writes strictly via service_role / RPC
ALTER TABLE public.category_course_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'category_course_orders'
      AND policyname = 'Public read category course orders'
  ) THEN
    CREATE POLICY "Public read category course orders"
      ON public.category_course_orders
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Safe, idempotent backfill of existing courses per primary category_slug
-- Preserves exact current order (display_order ASC, created_at DESC, id DESC)
WITH existing_ranked AS (
  SELECT
    LOWER(TRIM(c.category_slug)) AS norm_slug,
    c.category_id,
    c.id AS course_id,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(c.category_slug))
      ORDER BY COALESCE(c.display_order, 999999) ASC, c.created_at DESC, c.id DESC
    )::INTEGER AS next_sort_order
  FROM public.courses c
  WHERE TRIM(COALESCE(c.category_slug, '')) <> ''
)
INSERT INTO public.category_course_orders (
  category_slug,
  category_id,
  course_id,
  sort_order,
  updated_at
)
SELECT
  r.norm_slug,
  r.category_id,
  r.course_id,
  r.next_sort_order,
  now()
FROM existing_ranked r
WHERE NOT EXISTS (
  SELECT 1
  FROM public.category_course_orders existing
  WHERE existing.category_slug = r.norm_slug
)
ON CONFLICT (category_slug, course_id) DO NOTHING;

-- Atomic transactional RPC: saves full 1..N course order for ONE category only
-- Never alters any other category's sort_order or display_order.
CREATE OR REPLACE FUNCTION public.save_category_course_positions(
  p_category_slug TEXT,
  p_category_id BIGINT DEFAULT NULL,
  p_course_ids BIGINT[] DEFAULT ARRAY[]::BIGINT[]
)
RETURNS TABLE (
  out_category_slug TEXT,
  out_course_id BIGINT,
  out_sort_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_slug TEXT;
  v_cat_id BIGINT;
  v_clean_ids BIGINT[];
  v_expected_count INTEGER;
  v_existing_count INTEGER;
  v_primary_slots INTEGER[];
  v_primary_ids BIGINT[];
  v_idx INTEGER;
BEGIN
  v_slug := LOWER(TRIM(COALESCE(p_category_slug, '')));
  IF v_slug = 'free' THEN
    v_slug := 'free-course';
  END IF;

  IF v_slug = '' THEN
    RAISE EXCEPTION 'category_slug cannot be empty' USING ERRCODE = '22023';
  END IF;

  IF p_course_ids IS NULL OR COALESCE(array_length(p_course_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'p_course_ids must contain at least one course id' USING ERRCODE = '22023';
  END IF;

  -- Preserve input order while rejecting invalid or duplicate IDs
  SELECT ARRAY_AGG(elem ORDER BY ord)
  INTO v_clean_ids
  FROM unnest(p_course_ids) WITH ORDINALITY AS t(elem, ord)
  WHERE elem IS NOT NULL AND elem > 0;

  v_expected_count := COALESCE(array_length(v_clean_ids, 1), 0);
  IF v_expected_count <> array_length(p_course_ids, 1) THEN
    RAISE EXCEPTION 'p_course_ids contains invalid course id values' USING ERRCODE = '22023';
  END IF;

  IF (SELECT COUNT(DISTINCT x) FROM unnest(v_clean_ids) AS x) <> v_expected_count THEN
    RAISE EXCEPTION 'p_course_ids contains duplicate course ids' USING ERRCODE = '23505';
  END IF;

  -- Verify all referenced courses exist
  SELECT COUNT(*)
  INTO v_existing_count
  FROM public.courses
  WHERE id = ANY(v_clean_ids);

  IF v_existing_count <> v_expected_count THEN
    RAISE EXCEPTION 'One or more course ids were not found' USING ERRCODE = 'P0002';
  END IF;

  -- Resolve category_id if not explicitly supplied
  v_cat_id := p_category_id;
  IF v_cat_id IS NULL THEN
    SELECT id INTO v_cat_id
    FROM public.categories
    WHERE LOWER(TRIM(slug)) = v_slug
    LIMIT 1;
  END IF;

  -- Defer unique constraints during atomic swap/reorder within this transaction
  SET CONSTRAINTS public.uq_category_course_orders_slot DEFERRED;

  -- Lock existing rows for this category only
  PERFORM 1
  FROM public.category_course_orders
  WHERE category_slug = v_slug
  FOR UPDATE;

  -- Remove entries for courses no longer part of this category's ordered list
  DELETE FROM public.category_course_orders
  WHERE category_slug = v_slug
    AND NOT (course_id = ANY(v_clean_ids));

  -- Upsert contiguous 1..N sort_order atomically
  INSERT INTO public.category_course_orders (
    category_slug,
    category_id,
    course_id,
    sort_order,
    updated_at
  )
  SELECT
    v_slug,
    v_cat_id,
    t.cid,
    t.ord::INTEGER,
    now()
  FROM unnest(v_clean_ids) WITH ORDINALITY AS t(cid, ord)
  ON CONFLICT (category_slug, course_id)
  DO UPDATE SET
    category_id = COALESCE(EXCLUDED.category_id, public.category_course_orders.category_id),
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

  -- Also keep primary-category courses' display_order slots synchronized
  -- strictly within their own existing display_order slot pool (zero impact on other categories)
  SELECT
    ARRAY_AGG(c.display_order ORDER BY c.display_order ASC)
  INTO v_primary_slots
  FROM public.courses c
  WHERE LOWER(TRIM(c.category_slug)) = v_slug
    AND c.id = ANY(v_clean_ids)
    AND c.display_order IS NOT NULL;

  SELECT
    ARRAY_AGG(t.cid ORDER BY t.ord ASC)
  INTO v_primary_ids
  FROM unnest(v_clean_ids) WITH ORDINALITY AS t(cid, ord)
  JOIN public.courses c ON c.id = t.cid
  WHERE LOWER(TRIM(c.category_slug)) = v_slug
    AND c.display_order IS NOT NULL;

  IF COALESCE(array_length(v_primary_slots, 1), 0) > 1
     AND array_length(v_primary_slots, 1) = array_length(v_primary_ids, 1) THEN
    BEGIN
      SET CONSTRAINTS public.uq_courses_display_order DEFERRED;
    EXCEPTION WHEN undefined_object THEN
      NULL;
    END;

    FOR v_idx IN 1..array_length(v_primary_ids, 1) LOOP
      UPDATE public.courses
      SET display_order = v_primary_slots[v_idx],
          updated_at = now()
      WHERE id = v_primary_ids[v_idx];
    END LOOP;
  END IF;

  RETURN QUERY
  SELECT
    cco.category_slug AS out_category_slug,
    cco.course_id AS out_course_id,
    cco.sort_order AS out_sort_order
  FROM public.category_course_orders cco
  WHERE cco.category_slug = v_slug
  ORDER BY cco.sort_order ASC, cco.course_id ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.save_category_course_positions(TEXT, BIGINT, BIGINT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_category_course_positions(TEXT, BIGINT, BIGINT[]) TO service_role;
