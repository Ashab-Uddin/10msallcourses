-- ============================================================================
-- Migration: 0005_categories_redesign.sql
-- Project:   10ms Affiliate Portal (10msallcourse.com)
-- Purpose:   Additive, idempotent Category expansion to support the redesigned
--            Main Website Category Cards:
--              * Class 8 (slug: class-8)
--              * Class 7 (slug: class-7)
--              * Class 6 (slug: class-6)
--              * Class 5 (slug: class-5)
--              * Free Course (slug: free-course)
--            Existing categories (`hsc`, `school`, `skills`, `admission`) and
--            Book Store tables (`book_categories`, `books`) remain intact.
-- Execution: Run AFTER 0001_initial_schema.sql, 0002_rls_and_functions.sql,
--            0003_migrate_existing_data.sql, and 0004_bookstore_schema_and_rls.sql.
-- Safety:
--   - Additive ONLY: zero table drops, zero data deletions, zero overwriting
--     of live admin edits (`ON CONFLICT (slug) DO NOTHING`).
--   - Inserts ZERO demo or hardcoded courses/books.
--   - Safely advances `public.categories_id_seq` without ever rewinding it.
-- ============================================================================

BEGIN;

INSERT INTO public.categories (
  name,
  slug,
  subtitle,
  badge_color,
  display_order,
  status
)
VALUES
  (
    '৮ম শ্রেণি',
    'class-8',
    'অষ্টম শ্রেণির বার্ষিক অনলাইন ব্যাচ ও লাইভ ক্লাস',
    'emerald',
    5,
    'active'
  ),
  (
    '৭ম শ্রেণি',
    'class-7',
    'সপ্তম শ্রেণির বার্ষিক অনলাইন ব্যাচ ও লাইভ ক্লাস',
    'emerald',
    6,
    'active'
  ),
  (
    '৬ষ্ঠ শ্রেণি',
    'class-6',
    'ষষ্ঠ শ্রেণির বার্ষিক অনলাইন ব্যাচ ও লাইভ ক্লাস',
    'blue',
    7,
    'active'
  ),
  (
    '৫ম শ্রেণি',
    'class-5',
    'পঞ্চম শ্রেণির প্রাথমিক অনলাইন ব্যাচ ও বৃত্তি প্রস্তুতি',
    'amber',
    8,
    'active'
  ),
  (
    'ফ্রি কোর্স',
    'free-course',
    'সম্পূর্ণ বিনামূল্যের কোর্স, মাস্টারক্লাস ও লার্নিং কনটেন্ট',
    'emerald',
    9,
    'active'
  )
ON CONFLICT (slug) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('public.categories', 'id'),
  GREATEST(
    (SELECT COALESCE(MAX(id), 1) FROM public.categories),
    (SELECT CASE WHEN is_called THEN last_value ELSE 0 END FROM public.categories_id_seq)
  ),
  true
);

COMMIT;
