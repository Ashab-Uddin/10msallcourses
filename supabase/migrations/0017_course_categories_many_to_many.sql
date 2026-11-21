-- ============================================================================
-- Migration 0017: Many-to-Many Course <-> Category Assignments
-- ============================================================================
-- 100% Idempotent & Zero Data Loss:
--   - Preserves `courses.category_id` and `courses.category_slug` as the primary
--     category so all existing queries, FKs, and legacy code remain intact.
--   - Creates `public.course_categories` join table so a single course record
--     can be assigned to multiple categories simultaneously without duplicating
--     course rows or duplicating prices/titles/affiliate URLs.
--   - Backfills existing `public.courses` primary category mappings safely.
--   - Cascades category slug renames automatically via trigger and deletes join
--     rows cleanly on course deletion (`ON DELETE CASCADE`).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.course_categories (
  course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, category_id),
  CONSTRAINT uq_course_categories_course_slug UNIQUE (course_id, category_slug)
);

CREATE INDEX IF NOT EXISTS idx_course_categories_category_id
  ON public.course_categories (category_id, course_id);

CREATE INDEX IF NOT EXISTS idx_course_categories_category_slug
  ON public.course_categories (category_slug, course_id);

-- Row Level Security: public read-only, writes strictly via service_role
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_categories'
      AND policyname = 'Public read course categories'
  ) THEN
    CREATE POLICY "Public read course categories"
      ON public.course_categories
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Safe, idempotent backfill from every existing course's primary category
INSERT INTO public.course_categories (
  course_id,
  category_id,
  category_slug
)
SELECT
  c.id,
  cat.id,
  cat.slug
FROM public.courses c
JOIN public.categories cat
  ON cat.id = c.category_id
  OR LOWER(TRIM(cat.slug)) = LOWER(TRIM(c.category_slug))
ON CONFLICT (course_id, category_id) DO NOTHING;

-- Keep `course_categories.category_slug` synchronized when a category slug is renamed
CREATE OR REPLACE FUNCTION public.sync_course_categories_slug_on_category_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
    UPDATE public.course_categories
    SET category_slug = NEW.slug
    WHERE category_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_sync_course_categories_slug ON public.categories;
CREATE TRIGGER trg_categories_sync_course_categories_slug
  AFTER UPDATE OF slug ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_course_categories_slug_on_category_update();
