-- ============================================================================
-- Migration: 0015_admin_performance_indexes.sql
-- Project:   10ms Affiliate Portal (10msallcourse.com)
-- Purpose:   Additive composite & partial indexes to accelerate Admin Login,
--            Admin Allowlist checks, Overview queries, Course/Book listings,
--            and Offer Timer lookups as catalog size scales.
-- Safety:
--   - 100% non-destructive & idempotent (`CREATE INDEX IF NOT EXISTS`).
--   - Does NOT modify any table schemas, constraints, RLS policies, or rows.
-- ============================================================================

BEGIN;

-- 1. Partial index for active admin allowlist lookup during auth verification
CREATE INDEX IF NOT EXISTS idx_admin_users_active_user_id
  ON public.admin_users (user_id)
  WHERE is_active = true;

-- 2. Admin courses listing default order (`ORDER BY created_at DESC, id DESC`)
CREATE INDEX IF NOT EXISTS idx_courses_created_at_desc_id_desc
  ON public.courses (created_at DESC, id DESC);

-- 3. Admin categories listing default order (`ORDER BY display_order ASC, id ASC`)
CREATE INDEX IF NOT EXISTS idx_categories_display_order_id
  ON public.categories (display_order ASC, id ASC);

-- 4. Admin offer timers listing default order (`ORDER BY created_at DESC, id DESC`)
CREATE INDEX IF NOT EXISTS idx_offer_timers_created_at_desc_id_desc
  ON public.offer_timers (created_at DESC, id DESC);

-- 5. Admin book categories & books listings (guarded cleanly if Book Store tables exist)
DO $$
BEGIN
  IF to_regclass('public.book_categories') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_book_categories_display_order_id ON public.book_categories (display_order ASC, id ASC)';
  END IF;

  IF to_regclass('public.books') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_books_created_at_desc_id_desc ON public.books (created_at DESC, id DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_books_status_only ON public.books (status)';
  END IF;
END
$$;

COMMIT;
