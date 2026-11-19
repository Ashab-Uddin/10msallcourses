-- ============================================================================
-- Migration: 0010_courses_display_order.sql
-- Project:   10ms Affiliate Portal (10msallcourse.com)
-- Purpose:   Add persistent serial/position sorting (`display_order`) for
--            `public.courses`, enforce uniqueness & >= 1 constraint without
--            losing or duplicating courses, and provide atomic reorder RPCs.
-- Safety:
--   - Idempotent (`ADD COLUMN IF NOT EXISTS`, constraint guards).
--   - Backfills existing courses sequentially (`created_at DESC, id DESC`)
--     so initial live website order stays 100% preserved.
-- ============================================================================

BEGIN;

-- 1. Add nullable display_order column first so backfill can run safely
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- 2. Backfill existing courses into contiguous 1..N positions preserving current order
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY
        COALESCE(CASE WHEN display_order >= 1 THEN display_order ELSE NULL END, 2147483647) ASC,
        created_at DESC,
        id DESC
    )::INTEGER AS normalized_order
  FROM public.courses
)
UPDATE public.courses c
SET display_order = r.normalized_order
FROM ranked r
WHERE c.id = r.id
  AND c.display_order IS DISTINCT FROM r.normalized_order;

-- 3. Enforce NOT NULL and default >= 1
ALTER TABLE public.courses
  ALTER COLUMN display_order SET DEFAULT 1;

UPDATE public.courses
SET display_order = 1
WHERE display_order IS NULL OR display_order < 1;

ALTER TABLE public.courses
  ALTER COLUMN display_order SET NOT NULL;

-- 4. Positive integer check constraint
DO $$
DECLARE
  v_constraint RECORD;
BEGIN
  FOR v_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.courses'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%display_order%'
  LOOP
    EXECUTE format('ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS %I', v_constraint.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.courses
  ADD CONSTRAINT chk_courses_display_order_positive
  CHECK (display_order >= 1);

-- 5. Deferrable unique constraint prevents duplicate positions cleanly while allowing atomic multi-row shifts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.courses'::regclass
      AND conname = 'uq_courses_display_order'
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT uq_courses_display_order
      UNIQUE (display_order) DEFERRABLE INITIALLY DEFERRED;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_courses_display_order
  ON public.courses (display_order ASC, created_at DESC, id DESC);

-- 6. Atomic course position move & auto-rebalance RPC (1..N contiguous, zero duplicates)
CREATE OR REPLACE FUNCTION public.reorder_course_display_order(
  p_course_id    BIGINT,
  p_new_position INTEGER
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
  v_total       INTEGER;
  v_current_idx INTEGER;
  v_target_pos  INTEGER;
  v_ordered_ids BIGINT[];
  v_updated_ids BIGINT[];
  v_idx         INTEGER;
BEGIN
  IF p_course_id IS NULL OR p_new_position IS NULL OR p_new_position < 1 THEN
    RAISE EXCEPTION 'Valid course ID and positive position (>= 1) are required.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Lock all course rows deterministically to prevent concurrent position conflicts
  PERFORM 1
  FROM public.courses c
  ORDER BY c.id ASC
  FOR UPDATE;

  SELECT ARRAY_AGG(c.id ORDER BY c.display_order ASC, c.created_at DESC, c.id DESC)
  INTO v_ordered_ids
  FROM public.courses c;

  v_total := COALESCE(array_length(v_ordered_ids, 1), 0);
  IF v_total = 0 THEN
    RETURN;
  END IF;

  v_current_idx := array_position(v_ordered_ids, p_course_id);
  IF v_current_idx IS NULL THEN
    RAISE EXCEPTION 'Course not found.'
      USING ERRCODE = 'no_data_found';
  END IF;

  v_target_pos := LEAST(GREATEST(1, p_new_position), v_total);

  -- Build reordered array with target moved to v_target_pos
  SELECT ARRAY_AGG(elem ORDER BY ord)
  INTO v_updated_ids
  FROM (
    SELECT elem, ord
    FROM (
      WITH without_target AS (
        SELECT
          x.elem,
          ROW_NUMBER() OVER () AS base_pos
        FROM unnest(v_ordered_ids) WITH ORDINALITY AS x(elem, orig_pos)
        WHERE x.elem <> p_course_id
      )
      SELECT
        elem,
        CASE
          WHEN base_pos < v_target_pos THEN base_pos
          ELSE base_pos + 1
        END AS ord
      FROM without_target
      UNION ALL
      SELECT p_course_id AS elem, v_target_pos AS ord
    ) merged
  ) final_rows;

  -- Assign contiguous 1..N display_order values (deferrable unique constraint checks at commit)
  FOR v_idx IN 1..v_total LOOP
    UPDATE public.courses
    SET display_order = v_idx
    WHERE public.courses.id = v_updated_ids[v_idx]
      AND public.courses.display_order IS DISTINCT FROM v_idx;
  END LOOP;

  RETURN QUERY
  SELECT c.id, c.display_order
  FROM public.courses c
  ORDER BY c.display_order ASC, c.created_at DESC, c.id DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_course_display_order(BIGINT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_course_display_order(BIGINT, INTEGER) TO service_role;

-- 7. Atomic two-course position swap RPC
CREATE OR REPLACE FUNCTION public.swap_course_display_order(
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
BEGIN
  IF p_first_id IS NULL OR p_second_id IS NULL OR p_first_id = p_second_id THEN
    RAISE EXCEPTION 'Two distinct valid course IDs are required.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  PERFORM 1
  FROM public.courses c
  WHERE c.id IN (p_first_id, p_second_id)
  ORDER BY c.id ASC
  FOR UPDATE;

  SELECT c.display_order INTO v_first_order FROM public.courses c WHERE c.id = p_first_id;
  SELECT c.display_order INTO v_second_order FROM public.courses c WHERE c.id = p_second_id;

  IF v_first_order IS NULL OR v_second_order IS NULL THEN
    RAISE EXCEPTION 'One or both courses not found.'
      USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE public.courses SET display_order = v_second_order WHERE public.courses.id = p_first_id;
  UPDATE public.courses SET display_order = v_first_order  WHERE public.courses.id = p_second_id;

  RETURN QUERY
  SELECT c.id, c.display_order
  FROM public.courses c
  ORDER BY c.display_order ASC, c.created_at DESC, c.id DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.swap_course_display_order(BIGINT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.swap_course_display_order(BIGINT, BIGINT) TO service_role;

COMMIT;
