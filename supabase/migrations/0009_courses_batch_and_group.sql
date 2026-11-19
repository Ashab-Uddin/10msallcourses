-- ============================================================================
-- Migration: 0009_courses_batch_and_group.sql
-- Project:   10ms Affiliate Portal (10msallcourse.com)
-- Purpose:   Add structured `target_batch` and `target_groups` columns to
--            `public.courses`, index them for exact filtering, and backfill
--            existing course rows from `target_students` / `title`.
-- ============================================================================

BEGIN;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS target_batch TEXT NULL,
  ADD COLUMN IF NOT EXISTS target_groups JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_courses_target_groups_array'
      AND conrelid = 'public.courses'::regclass
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT chk_courses_target_groups_array
      CHECK (jsonb_typeof(target_groups) = 'array');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_courses_category_batch_status
  ON public.courses (category_slug, target_batch, status);

-- Backfill target_batch cleanly from target_students / title for existing courses
UPDATE public.courses
SET target_batch = CASE
  WHEN COALESCE(target_students, '') ~* '(hsc[\s-]*(26|2026)|এইচএসসি[\s-]*(২৬|২০২৬))' THEN 'hsc-26'
  WHEN COALESCE(target_students, '') ~* '(hsc[\s-]*(27|2027)|এইচএসসি[\s-]*(২৭|২০২৭))' THEN 'hsc-27'
  WHEN COALESCE(target_students, '') ~* '(hsc[\s-]*(28|2028)|এইচএসসি[\s-]*(২৮|২০২৮))' THEN 'hsc-28'
  WHEN COALESCE(target_students, '') ~* '(ssc[\s-]*(2027|27)|এসএসসি[\s-]*(২০২৭|২৭)|class[\s-]*10|১০ম)' THEN 'ssc-2027'
  WHEN COALESCE(target_students, '') ~* '(ssc[\s-]*(2028|28)|এসএসসি[\s-]*(২০২৮|২৮)|class[\s-]*9|৯ম)' THEN 'ssc-2028'
  WHEN category_slug IN ('class-5', 'class-6', 'class-7', 'class-8') THEN category_slug
  WHEN COALESCE(title, '') ~* '(hsc[\s-]*(26|2026)|এইচএসসি[\s-]*(২৬|২০২৬))' THEN 'hsc-26'
  WHEN COALESCE(title, '') ~* '(hsc[\s-]*(27|2027)|এইচএসসি[\s-]*(২৭|২০২৭))' THEN 'hsc-27'
  WHEN COALESCE(title, '') ~* '(hsc[\s-]*(28|2028)|এইচএসসি[\s-]*(২৮|২০২৮))' THEN 'hsc-28'
  WHEN COALESCE(title, '') ~* '(ssc[\s-]*(2027|27)|এসএসসি[\s-]*(২০২৭|২৭))' THEN 'ssc-2027'
  WHEN COALESCE(title, '') ~* '(ssc[\s-]*(2028|28)|এসএসসি[\s-]*(২০২৮|২৮))' THEN 'ssc-2028'
  ELSE NULL
END
WHERE target_batch IS NULL;

-- Backfill target_groups cleanly from target_students for existing courses
UPDATE public.courses
SET target_groups = (
  SELECT COALESCE(jsonb_agg(g), '[]'::jsonb)
  FROM (
    SELECT 'science' AS g
    WHERE COALESCE(target_students, '') ~* '(বিজ্ঞান|science|সকল বিভাগ)'
    UNION ALL
    SELECT 'business' AS g
    WHERE COALESCE(target_students, '') ~* '(ব্যবসায়|ব্যবসা|ব্যাবসা|business|commerce|সকল বিভাগ)'
    UNION ALL
    SELECT 'humanities' AS g
    WHERE COALESCE(target_students, '') ~* '(মানবিক|humanities|arts|সকল বিভাগ)'
  ) matched
)
WHERE target_groups = '[]'::jsonb;

COMMIT;
