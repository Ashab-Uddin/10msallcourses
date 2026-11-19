-- ============================================================================
-- Migration: 0014_course_meta_fields.sql
-- Project:   10ms Affiliate Portal (10msallcourse.com)
-- Purpose:   Remove hardcoded fake defaults from `public.courses` metadata
--            columns (`duration`, `student_count`, `rating`) so Admin Dashboard
--            inputs fully control them and empty fields remain genuinely empty
--            without displaying placeholder/fake values on the frontend.
-- Safety:    Non-destructive & idempotent; preserves 100% of existing rows.
-- ============================================================================

BEGIN;

ALTER TABLE public.courses
  ALTER COLUMN duration SET DEFAULT '',
  ALTER COLUMN student_count SET DEFAULT '',
  ALTER COLUMN rating SET DEFAULT '';

COMMENT ON COLUMN public.courses.duration IS
  'Dynamic admin-managed course duration text (e.g., "৬ মাস", "১ বছর"). Empty string when omitted.';

COMMENT ON COLUMN public.courses.student_count IS
  'Dynamic admin-managed total students count stored as numeric string (e.g., "12500") or legacy text; formatted as "১২,৫০০+ শিক্ষার্থী" on frontend. Empty string when omitted.';

COMMENT ON COLUMN public.courses.rating IS
  'Dynamic admin-managed decimal course rating between 0 and 5 (e.g., "4.9"). Empty string when omitted.';

COMMIT;
