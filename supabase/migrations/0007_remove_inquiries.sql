-- ============================================================================
-- Migration: 0007_remove_inquiries.sql
-- Project:   10ms Affiliate Portal (10msallcourse.com)
-- Purpose:   Remove unused Customer Inquiry feature objects (public.inquiries
--            table, RLS policies, indexes, sequence, and submit_customer_inquiry
--            RPC) along with stale public_message rate-limit buckets.
-- Safety:
--   - Does NOT modify or drop any shared tables (courses, categories,
--     click_records, website_settings, offer_timers, admin_users,
--     book_categories, books, or rate_limit_buckets).
-- ============================================================================

BEGIN;

-- 1. Drop RLS policies on public.inquiries if table exists
DROP POLICY IF EXISTS inquiries_public_insert ON public.inquiries;
DROP POLICY IF EXISTS inquiries_admin_select  ON public.inquiries;
DROP POLICY IF EXISTS inquiries_admin_update  ON public.inquiries;
DROP POLICY IF EXISTS inquiries_admin_delete  ON public.inquiries;

-- 2. Drop server-only inquiry submission RPC
DROP FUNCTION IF EXISTS public.submit_customer_inquiry(TEXT, TEXT, TEXT, TEXT);

-- 3. Drop inquiries table, its indexes, and identity sequence
DROP TABLE IF EXISTS public.inquiries CASCADE;

-- 4. Clean up stale rate-limit buckets created solely for /api/public/message
DELETE FROM public.rate_limit_buckets
WHERE bucket_key LIKE 'public_message:%';

COMMIT;
