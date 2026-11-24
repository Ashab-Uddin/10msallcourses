-- ============================================================================
-- Migration: 0013_selector_icons_badge_tag.sql
-- Project:   10ms Affiliate Portal (10msallcourse.com)
-- Purpose:   Extend `public.selector_icons` with customizable `tag`
--            (Badge / Icon Text) column and add atomic RPC
--            `save_selector_icons_config_v2`.
-- ============================================================================

BEGIN;

ALTER TABLE public.selector_icons
  ADD COLUMN IF NOT EXISTS tag TEXT;

WITH defaults(icon_id, tag) AS (
  VALUES
    ('hsc-26', 'HSC 26'),
    ('hsc-27', 'HSC 27'),
    ('hsc-28', 'HSC 28'),
    ('ssc-27', 'SSC 27'),
    ('ssc-28', 'CLASS 9'),
    ('class-8', 'CLASS 8'),
    ('class-7', 'CLASS 7'),
    ('class-6', 'CLASS 6'),
    ('class-5', 'CLASS 5'),
    ('book-store', 'BOOK STORE'),
    ('skills', 'SKILLS'),
    ('free-course', 'FREE COURSE')
)
UPDATE public.selector_icons s
SET tag = d.tag
FROM defaults d
WHERE s.icon_id = d.icon_id
  AND (s.tag IS NULL OR BTRIM(s.tag) = '');

ALTER TABLE public.selector_icons
  ALTER COLUMN tag SET DEFAULT '',
  ALTER COLUMN tag SET NOT NULL;

CREATE OR REPLACE FUNCTION public.save_selector_icons_config_v2(
  p_ordered_ids TEXT[],
  p_titles      TEXT[],
  p_sub_labels  TEXT[],
  p_tags        TEXT[]
)
RETURNS TABLE (
  icon_id   TEXT,
  "position" INTEGER,
  title     TEXT,
  sub_label TEXT,
  tag       TEXT
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
  v_tag       TEXT;
BEGIN
  v_count := COALESCE(array_length(p_ordered_ids, 1), 0);
  IF v_count = 0
     OR v_count <> COALESCE(array_length(p_titles, 1), 0)
     OR v_count <> COALESCE(array_length(p_sub_labels, 1), 0)
     OR v_count <> COALESCE(array_length(p_tags, 1), 0) THEN
    RAISE EXCEPTION 'Ordered icon IDs, titles, sub_labels, and tags arrays must have equal non-zero lengths.'
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
    v_tag := BTRIM(COALESCE(p_tags[v_idx], ''));

    IF v_title = '' OR v_sub_label = '' OR v_tag = '' THEN
      RAISE EXCEPTION 'Tag, title, and sub_label cannot be empty for icon %.', v_id
        USING ERRCODE = 'invalid_parameter_value';
    END IF;

    INSERT INTO public.selector_icons (icon_id, position, title, sub_label, tag)
    VALUES (v_id, v_idx, v_title, v_sub_label, v_tag)
    ON CONFLICT (icon_id)
    DO UPDATE SET
      position  = EXCLUDED.position,
      title     = EXCLUDED.title,
      sub_label = EXCLUDED.sub_label,
      tag       = EXCLUDED.tag;
  END LOOP;

  RETURN QUERY
  SELECT s.icon_id, s.position, s.title, s.sub_label, s.tag
  FROM public.selector_icons s
  ORDER BY s.position ASC, s.icon_id ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.save_selector_icons_config_v2(TEXT[], TEXT[], TEXT[], TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_selector_icons_config_v2(TEXT[], TEXT[], TEXT[], TEXT[]) TO service_role;

COMMIT;
