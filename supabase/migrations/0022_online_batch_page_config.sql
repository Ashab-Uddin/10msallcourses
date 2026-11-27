-- ============================================================================
-- Migration: 0022_online_batch_page_config.sql
-- Project:   10ms Affiliate Portal (10msallcourses.com)
-- Purpose:   DB-persisted configuration for `/online-batch` page:
--            - Header texts (title, subtitle, description)
--            - Section ordering & texts (`academic_program`, `online_batch`)
--            - Class/Batch icon order, positions, labels & icons
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.online_batch_page_config (
  id                 INTEGER     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  header_title       TEXT        NOT NULL DEFAULT 'একাডেমিক অনলাইন ব্যাচ 2027'
                                 CHECK (char_length(btrim(header_title)) BETWEEN 1 AND 120),
  header_subtitle    TEXT        NOT NULL DEFAULT 'এসএসসি ও এইচএসসি একাডেমিক প্রোগ্রাম'
                                 CHECK (char_length(btrim(header_subtitle)) BETWEEN 1 AND 120),
  header_description TEXT        NOT NULL DEFAULT 'আপনার শ্রেণি বা ব্যাচ নির্বাচন করে সরাসরি নির্ধারিত একাডেমিক ক্যাটাগরি ও লাইভ কোর্সসমূহে যান।'
                                 CHECK (char_length(btrim(header_description)) BETWEEN 1 AND 400),
  sections           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  class_icons        JSONB       NOT NULL DEFAULT '[]'::jsonb,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.online_batch_page_config IS 'Singleton configuration table for the /online-batch page header, section order, and class icon positions.';

DROP TRIGGER IF EXISTS trg_online_batch_page_config_set_updated_at ON public.online_batch_page_config;
CREATE TRIGGER trg_online_batch_page_config_set_updated_at
  BEFORE UPDATE ON public.online_batch_page_config
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

REVOKE ALL ON TABLE public.online_batch_page_config FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.online_batch_page_config TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.online_batch_page_config TO authenticated;
GRANT ALL ON TABLE public.online_batch_page_config TO service_role;

ALTER TABLE public.online_batch_page_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS online_batch_page_config_public_select ON public.online_batch_page_config;
CREATE POLICY online_batch_page_config_public_select
  ON public.online_batch_page_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS online_batch_page_config_admin_all ON public.online_batch_page_config;
CREATE POLICY online_batch_page_config_admin_all
  ON public.online_batch_page_config
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.online_batch_page_config (
  id,
  header_title,
  header_subtitle,
  header_description,
  sections,
  class_icons
)
VALUES (
  1,
  'একাডেমিক অনলাইন ব্যাচ 2027',
  'এসএসসি ও এইচএসসি একাডেমিক প্রোগ্রাম',
  'আপনার শ্রেণি বা ব্যাচ নির্বাচন করে সরাসরি নির্ধারিত একাডেমিক ক্যাটাগরি ও লাইভ কোর্সসমূহে যান।',
  '[
    {
      "id": "academic_program",
      "title": "এসএসসি ও এইচএসসি একাডেমিক প্রোগ্রাম",
      "description": "আপনার শ্রেণি বা ব্যাচ নির্বাচন করে সরাসরি নির্ধারিত একাডেমিক ক্যাটাগরি ও লাইভ কোর্সসমূহে যান।",
      "position": 1,
      "isVisible": true
    },
    {
      "id": "online_batch",
      "title": "একাডেমিক অনলাইন ব্যাচ",
      "description": "শ্রেণি ও ব্যাচভিত্তিক চলমান লাইভ কোর্সসমূহ দেখুন এবং সরাসরি পছন্দের ব্যাচে ভর্তি হোন।",
      "position": 2,
      "isVisible": true
    }
  ]'::jsonb,
  '[
    { "id": "hsc-27", "tag": "HSC 27", "title": "HSC ২৭", "subLabel": "অনলাইন ব্যাচ চলছে", "iconKey": "target", "position": 1, "isVisible": true },
    { "id": "hsc-28", "tag": "HSC 28", "title": "HSC ২৮", "subLabel": "অনলাইন ব্যাচ চলছে", "iconKey": "compass", "position": 2, "isVisible": true },
    { "id": "class-6", "tag": "CLASS 6", "title": "৬ষ্ঠ শ্রেণি", "subLabel": "বার্ষিক অনলাইন ব্যাচ", "iconKey": "notebook-pen", "position": 3, "isVisible": true },
    { "id": "class-7", "tag": "CLASS 7", "title": "৭ম শ্রেণি", "subLabel": "বার্ষিক অনলাইন ব্যাচ", "iconKey": "book-marked", "position": 4, "isVisible": true },
    { "id": "class-8", "tag": "CLASS 8", "title": "৮ম শ্রেণি", "subLabel": "বার্ষিক অনলাইন ব্যাচ", "iconKey": "backpack", "position": 5, "isVisible": true },
    { "id": "ssc-28", "tag": "SSC 29", "title": "৯ম শ্রেণি", "subLabel": "SSC ২০২৯ ব্যাচ", "iconKey": "lightbulb", "position": 6, "isVisible": true },
    { "id": "ssc-27", "tag": "SSC 28", "title": "দশম শ্রেণি", "subLabel": "SSC ২০২৮ ব্যাচ", "iconKey": "book-open", "position": 7, "isVisible": true }
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
