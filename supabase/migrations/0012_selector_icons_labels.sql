-- ============================================================================
-- Migration: 0012_selector_icons_labels.sql
-- Project:   10ms Affiliate Portal (10msallcourse.com)
-- Purpose:   Extend `public.selector_icons` with customizable Unicode `title`
--            (Icon Name) and `sub_label` (Icon Sub Name) columns while
--            preserving existing positions, and add atomic RPC
--            `save_selector_icons_config`.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.selector_icons (
  icon_id    TEXT        PRIMARY KEY,
  position   INTEGER     NOT NULL CHECK (position >= 1),
  title      TEXT        NOT NULL DEFAULT '',
  sub_label  TEXT        NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_selector_icons_position
    UNIQUE (position) DEFERRABLE INITIALLY DEFERRED
);

ALTER TABLE public.selector_icons
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS sub_label TEXT;

-- Seed default icon rows & fill only missing/empty labels without altering existing positions or custom text
WITH defaults(icon_id, position, title, sub_label) AS (
  VALUES
    ('hsc-26', 1, 'HSC ২৬', 'এডমিশন ভর্তি চলছে'),
    ('hsc-27', 2, 'HSC ২৭', 'অনলাইন ব্যাচ চলছে'),
    ('hsc-28', 3, 'HSC ২৮', 'অনলাইন ব্যাচ চলছে'),
    ('ssc-27', 4, 'দশম শ্রেণি', 'SSC ২০২৭ ব্যাচ'),
    ('ssc-28', 5, '৯ম শ্রেণি', 'SSC ২০২৮ ব্যাচ'),
    ('class-8', 6, '৮ম শ্রেণি', 'বার্ষিক অনলাইন ব্যাচ'),
    ('class-7', 7, '৭ম শ্রেণি', 'বার্ষিক অনলাইন ব্যাচ'),
    ('class-6', 8, '৬ষ্ঠ শ্রেণি', 'বার্ষিক অনলাইন ব্যাচ'),
    ('class-5', 9, '৫ম শ্রেণি', 'প্রাথমিক অনলাইন ব্যাচ'),
    ('book-store', 10, 'বুক স্টোর', 'প্রিন্টেড মাস্টারবুক'),
    ('skills', 11, 'স্কিলস', 'ক্যারিয়ার ও আইটি কোর্স'),
    ('free-course', 12, 'ফ্রি কোর্স', 'বিনামূল্যে শিখুন')
)
INSERT INTO public.selector_icons (icon_id, position, title, sub_label)
SELECT d.icon_id, d.position, d.title, d.sub_label
FROM defaults d
ON CONFLICT (icon_id) DO UPDATE
SET
  title = COALESCE(NULLIF(BTRIM(public.selector_icons.title), ''), EXCLUDED.title),
  sub_label = COALESCE(NULLIF(BTRIM(public.selector_icons.sub_label), ''), EXCLUDED.sub_label);

ALTER TABLE public.selector_icons
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN sub_label SET NOT NULL;

CREATE OR REPLACE FUNCTION public.save_selector_icons_config(
  p_ordered_ids TEXT[],
  p_titles      TEXT[],
  p_sub_labels  TEXT[]
)
RETURNS TABLE (
  icon_id   TEXT,
  "position" INTEGER,
  title     TEXT,
  sub_label TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_count     INTEGER;
  v_idx       INTEGER;
  v_id        TEXT;
  v_title     TEXT;
  v_sub_label TEXT;
BEGIN
  v_count := COALESCE(array_length(p_ordered_ids, 1), 0);
  IF v_count = 0
     OR v_count <> COALESCE(array_length(p_titles, 1), 0)
     OR v_count <> COALESCE(array_length(p_sub_labels, 1), 0) THEN
    RAISE EXCEPTION 'Ordered icon IDs, titles, and sub_labels arrays must have equal non-zero lengths.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  PERFORM 1
  FROM public.selector_icons s
  ORDER BY s.icon_id ASC
  FOR UPDATE;

  FOR v_idx IN 1..v_count LOOP
    v_id := p_ordered_ids[v_idx];
    v_title := BTRIM(COALESCE(p_titles[v_idx], ''));
    v_sub_label := BTRIM(COALESCE(p_sub_labels[v_idx], ''));

    IF v_title = '' OR v_sub_label = '' THEN
      RAISE EXCEPTION 'Title and sub_label cannot be empty for icon %.', v_id
        USING ERRCODE = 'invalid_parameter_value';
    END IF;

    INSERT INTO public.selector_icons (icon_id, position, title, sub_label)
    VALUES (v_id, v_idx, v_title, v_sub_label)
    ON CONFLICT (icon_id)
    DO UPDATE SET
      position  = EXCLUDED.position,
      title     = EXCLUDED.title,
      sub_label = EXCLUDED.sub_label;
  END LOOP;

  RETURN QUERY
  SELECT s.icon_id, s.position, s.title, s.sub_label
  FROM public.selector_icons s
  ORDER BY s.position ASC, s.icon_id ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.save_selector_icons_config(TEXT[], TEXT[], TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_selector_icons_config(TEXT[], TEXT[], TEXT[]) TO service_role;

COMMIT;
