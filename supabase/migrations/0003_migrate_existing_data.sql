-- ============================================================================
-- Migration: 0003_migrate_existing_data.sql
-- Project:   10ms Affiliate Portal (10msallcourse.com)
-- Purpose:   Idempotently migrate verified production baseline data from
--            Phase 2 `data/database.json` into Supabase PostgreSQL:
--              * 4 Core Categories (IDs 1–4)
--              * 0 Courses (empty table — zero demo courses)
--              * 9 Historical Click Records (exact BIGINT IDs preserved)
--              * 0 Inquiries (empty table — zero demo inquiries)
--              * 1 Website Settings singleton row (all 15 fields preserved)
--              * 0 Offer Timers (empty table)
-- Execution: Run THIRD (after 0001_initial_schema.sql and 0002_rls_and_functions.sql)
--            with privileged SQL Editor / migration role.
-- Safety (Hardened in Stage B.2 Audit):
--   - Idempotent (`ON CONFLICT DO NOTHING`) — safe to re-run without
--     overwriting live production admin edits.
--   - Separates First Migration exact field-by-field parity verification from
--     Safe Re-run verification (preserves live admin edits while rejecting
--     conflicting or corrupted pre-existing rows).
--   - Historical click records (immutable/append-only) ALWAYS enforce exact
--     field-by-field parity across all 7 columns on both first run and re-runs.
--   - Synchronizes identity sequences safely without ever rewinding them.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Stage Exact Baseline Dataset (Single Source of Truth from data/database.json)
--    Temporary tables live in pg_temp and drop automatically at COMMIT/ROLLBACK.
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE _mig_expected_categories (
  id            BIGINT      NOT NULL,
  name          TEXT        NOT NULL,
  slug          TEXT        NOT NULL,
  subtitle      TEXT        NULL,
  badge_color   TEXT        NOT NULL,
  display_order INTEGER     NOT NULL,
  status        TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL
) ON COMMIT DROP;

INSERT INTO pg_temp._mig_expected_categories (
  id,
  name,
  slug,
  subtitle,
  badge_color,
  display_order,
  status,
  created_at,
  updated_at
)
VALUES
  (
    1,
    'HSC অনলাইন ব্যাচ',
    'hsc',
    'কলেজ একাডেমিক প্রোগ্রাম',
    'red',
    1,
    'active',
    '2026-01-01T00:00:00Z'::timestamptz,
    '2026-01-01T00:00:00Z'::timestamptz
  ),
  (
    2,
    '৬ - ১০ শ্রেণি',
    'school',
    'SSC ২০২৭ প্রস্তুতি ও বোর্ড পরীক্ষার ১০০% রিভিশন প্রোগ্রাম',
    'amber',
    2,
    'active',
    '2026-01-01T00:00:00Z'::timestamptz,
    '2026-01-01T00:00:00Z'::timestamptz
  ),
  (
    3,
    'স্কিলস ও আইটি',
    'skills',
    'দেশসেরা প্রফেশনাল ও ক্যারিয়ার স্কিলস কোর্স ভাণ্ডার',
    'blue',
    3,
    'active',
    '2026-01-01T00:00:00Z'::timestamptz,
    '2026-01-01T00:00:00Z'::timestamptz
  ),
  (
    4,
    'বিশ্ববিদ্যালয় ও মেডিকেল এডমিশন',
    'admission',
    'বুয়েট, ঢাবি ‘ক’, ‘খ’, ‘গ’ এবং মেডিকেল ভর্তি প্রস্তুতি',
    'rose',
    4,
    'active',
    '2026-01-01T00:00:00Z'::timestamptz,
    '2026-01-01T00:00:00Z'::timestamptz
  );

CREATE TEMP TABLE _mig_expected_clicks (
  id           BIGINT      NOT NULL,
  course_id    BIGINT      NOT NULL,
  course_slug  TEXT        NOT NULL,
  course_title TEXT        NOT NULL,
  referrer     TEXT        NULL,
  user_agent   TEXT        NULL,
  clicked_at   TIMESTAMPTZ NOT NULL
) ON COMMIT DROP;

INSERT INTO pg_temp._mig_expected_clicks (
  id,
  course_id,
  course_slug,
  course_title,
  referrer,
  user_agent,
  clicked_at
)
VALUES
  (
    1794836072016,
    27,
    'class-7-annual-batch-2026',
    '৭ম শ্রেণি বার্ষিক অনলাইন ব্যাচ ২০২৬ (নতুন শিক্ষাক্রম - সকল বিষয়)',
    'card_title',
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Mobile Safari/537.36',
    '2026-11-16T13:34:32.016Z'::timestamptz
  ),
  (
    1794836016849,
    31,
    'hsc-28-অনলাইন-ব্যাচ-ফিজিক্স-কেমিস্ট্রি-ম্যাথ-বায়ো',
    'HSC 28 অনলাইন ব্যাচ (ফিজিক্স, কেমিস্ট্রি, ম্যাথ, বায়োলজি)',
    'card_button',
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Mobile Safari/537.36',
    '2026-11-16T13:33:36.849Z'::timestamptz
  ),
  (
    1794836009261,
    31,
    'hsc-28-অনলাইন-ব্যাচ-ফিজিক্স-কেমিস্ট্রি-ম্যাথ-বায়ো',
    'HSC 28 অনলাইন ব্যাচ (ফিজিক্স, কেমিস্ট্রি, ম্যাথ, বায়োলজি)',
    'card_button',
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Mobile Safari/537.36',
    '2026-11-16T13:33:29.261Z'::timestamptz
  ),
  (
    1794823663263,
    31,
    'hsc-28-অনলাইন-ব্যাচ-ফিজিক্স-কেমিস্ট্রি-ম্যাথ-বায়ো',
    'HSC 28 অনলাইন ব্যাচ (ফিজিক্স, কেমিস্ট্রি, ম্যাথ, বায়োলজি)',
    'card_banner',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',
    '2026-11-16T10:07:43.263Z'::timestamptz
  ),
  (
    1794753845708,
    31,
    'hsc-28-অনলাইন-ব্যাচ-ফিজিক্স-কেমিস্ট্রি-ম্যাথ-বায়ো',
    'HSC 28 অনলাইন ব্যাচ (ফিজিক্স, কেমিস্ট্রি, ম্যাথ, বায়োলজি)',
    'card_banner',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    '2026-11-15T14:44:05.708Z'::timestamptz
  ),
  (
    1794753833346,
    31,
    'hsc-28-অনলাইন-ব্যাচ-ফিজিক্স-কেমিস্ট্রি-ম্যাথ-বায়ো',
    'HSC 28 অনলাইন ব্যাচ (ফিজিক্স, কেমিস্ট্রি, ম্যাথ, বায়োলজি)',
    'card_banner',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    '2026-11-15T14:43:53.346Z'::timestamptz
  ),
  (
    1794749877903,
    1,
    'hsc-28-pcmb',
    'HSC 28 অনলাইন ব্যাচ — PCMB সাইকেল ১ [Physics, Chem, Math, Bio]',
    'card_banner',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',
    '2026-11-15T13:37:57.903Z'::timestamptz
  ),
  (
    1794737556899,
    1,
    'hsc-28-pcmb',
    'HSC 28 অনলাইন ব্যাচ — PCMB সাইকেল ১ [Physics, Chem, Math, Bio]',
    'card_title',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',
    '2026-11-15T10:12:36.899Z'::timestamptz
  ),
  (
    1794736842342,
    1,
    'hsc-28-pcmb',
    'HSC 28 অনলাইন ব্যাচ — PCMB সাইকেল ১ [Physics, Chem, Math, Bio]',
    'direct',
    'Python-urllib/3.13',
    '2026-11-15T10:00:42.342Z'::timestamptz
  );

CREATE TEMP TABLE _mig_expected_settings (
  id                      SMALLINT    NOT NULL,
  site_title              TEXT        NOT NULL,
  whatsapp_number         TEXT        NOT NULL,
  whatsapp_link           TEXT        NOT NULL,
  call_number             TEXT        NOT NULL,
  messenger_link          TEXT        NOT NULL,
  hero_badge              TEXT        NOT NULL,
  hero_title              TEXT        NOT NULL,
  hero_subtitle           TEXT        NOT NULL,
  show_countdown_timer    BOOLEAN     NOT NULL,
  countdown_label         TEXT        NOT NULL,
  countdown_target_course TEXT        NOT NULL,
  countdown_target_date   TEXT        NOT NULL,
  default_affiliate_ref   TEXT        NOT NULL,
  updated_at              TIMESTAMPTZ NOT NULL
) ON COMMIT DROP;

INSERT INTO pg_temp._mig_expected_settings (
  id,
  site_title,
  whatsapp_number,
  whatsapp_link,
  call_number,
  messenger_link,
  hero_badge,
  hero_title,
  hero_subtitle,
  show_countdown_timer,
  countdown_label,
  countdown_target_course,
  countdown_target_date,
  default_affiliate_ref,
  updated_at
)
VALUES (
  1,
  '১০ মিনিট স্কুল কোর্স ও অফার ড্যাশবোর্ড',
  '+880 1625171822',
  'https://wa.me/8801625171822',
  '+880 1625171822',
  'https://m.me/10minuteschool',
  '১০ মিনিট স্কুল অফিশিয়াল লার্নিং পার্টনার',
  'সেরা শিক্ষকদের সাথে ঘরে বসেই নাও সম্পূর্ণ প্রস্তুতি',
  '৬ষ্ঠ-১২ম শ্রেণি, এইচএসসি ও ভর্তি পরীক্ষার সকল কোর্স পেয়ে যান আকর্ষণীয় ছাড়ে...',
  false,
  'HSC ২৮ আর্লি বার্ড স্পেশাল উপহার সহ ছাড়ে বাকি:',
  'all',
  '',
  '10ms_affiliate',
  '2026-11-16T21:00:00.797Z'::timestamptz
);

-- ----------------------------------------------------------------------------
-- 2. Execute Idempotent Migration + Strict Field-by-Field Parity Verification
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_pre_cat_count          INTEGER;
  v_cat_slug_conflicts     INTEGER;
  v_ins_cat_count          INTEGER;
  v_cat_exact_matches      INTEGER;
  v_cat_valid_matches      INTEGER;

  v_ins_click_count        INTEGER;
  v_click_exact_matches    INTEGER;

  v_pre_set_count          INTEGER;
  v_ins_set_count          INTEGER;
  v_set_exact_matches      INTEGER;
  v_existing_set_updated   TIMESTAMPTZ;

  v_courses_count          INTEGER;
  v_inquiries_count        INTEGER;
  v_timers_count           INTEGER;
BEGIN
  -- ==========================================================================
  -- A. Migrate & Verify 4 Core Categories (IDs 1–4)
  -- ==========================================================================
  SELECT COUNT(*)
  INTO v_pre_cat_count
  FROM public.categories c
  JOIN pg_temp._mig_expected_categories e ON e.id = c.id;

  -- Detect blocking slug conflict before insert (missing baseline ID whose slug is taken)
  SELECT COUNT(*)
  INTO v_cat_slug_conflicts
  FROM pg_temp._mig_expected_categories e
  WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.id = e.id)
    AND EXISTS (SELECT 1 FROM public.categories c WHERE lower(c.slug) = lower(e.slug));

  IF v_cat_slug_conflicts > 0 THEN
    RAISE EXCEPTION
      'Migration conflict in public.categories: % missing baseline slug(s) already occupied by non-baseline ID(s). Aborting.',
      v_cat_slug_conflicts;
  END IF;

  INSERT INTO public.categories (
    id,
    name,
    slug,
    subtitle,
    badge_color,
    display_order,
    status,
    created_at,
    updated_at
  )
  SELECT
    id,
    name,
    slug,
    subtitle,
    badge_color,
    display_order,
    status,
    created_at,
    updated_at
  FROM pg_temp._mig_expected_categories
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_ins_cat_count = ROW_COUNT;

  IF v_pre_cat_count = 0 THEN
    -- First Migration: require all 4 rows inserted AND 100% exact field-by-field parity
    IF v_ins_cat_count <> 4 THEN
      RAISE EXCEPTION
        'First migration failed in public.categories: expected 4 inserted rows, got %.',
        v_ins_cat_count;
    END IF;

    SELECT COUNT(*)
    INTO v_cat_exact_matches
    FROM public.categories c
    JOIN pg_temp._mig_expected_categories e ON e.id = c.id
    WHERE c.name          IS NOT DISTINCT FROM e.name
      AND c.slug          IS NOT DISTINCT FROM e.slug
      AND c.subtitle      IS NOT DISTINCT FROM e.subtitle
      AND c.badge_color   IS NOT DISTINCT FROM e.badge_color
      AND c.display_order IS NOT DISTINCT FROM e.display_order
      AND c.status        IS NOT DISTINCT FROM e.status
      AND c.created_at    IS NOT DISTINCT FROM e.created_at
      AND c.updated_at    IS NOT DISTINCT FROM e.updated_at;

    IF v_cat_exact_matches <> 4 THEN
      RAISE EXCEPTION
        'First migration parity check failed in public.categories: expected 4 exact 9-column matches, found %.',
        v_cat_exact_matches;
    END IF;
  ELSE
    -- Re-run: never overwrite live admin edits, but reject corrupted or conflicting rows
    IF v_pre_cat_count + v_ins_cat_count <> 4 THEN
      RAISE EXCEPTION
        'Re-run migration conflict in public.categories: pre_existing=% + inserted=% <> 4.',
        v_pre_cat_count, v_ins_cat_count;
    END IF;

    SELECT COUNT(*)
    INTO v_cat_valid_matches
    FROM public.categories c
    JOIN pg_temp._mig_expected_categories e ON e.id = c.id
    WHERE (
      -- Unedited baseline row: must match all 9 columns verbatim
      c.updated_at = e.updated_at
      AND c.name          IS NOT DISTINCT FROM e.name
      AND c.slug          IS NOT DISTINCT FROM e.slug
      AND c.subtitle      IS NOT DISTINCT FROM e.subtitle
      AND c.badge_color   IS NOT DISTINCT FROM e.badge_color
      AND c.display_order IS NOT DISTINCT FROM e.display_order
      AND c.status        IS NOT DISTINCT FROM e.status
      AND c.created_at    IS NOT DISTINCT FROM e.created_at
    )
    OR (
      -- Live admin-edited baseline row: updated_at advanced, original created_at preserved
      c.updated_at > e.updated_at
      AND c.created_at = e.created_at
      AND char_length(btrim(c.name)) > 0
      AND char_length(btrim(c.slug)) > 0
    );

    IF v_cat_valid_matches <> 4 THEN
      RAISE EXCEPTION
        'Re-run parity check failed in public.categories: conflicting or corrupted pre-existing row among IDs 1-4 (valid=%/4).',
        v_cat_valid_matches;
    END IF;
  END IF;

  -- ==========================================================================
  -- B. Migrate & Verify ALL 9 Historical Click Records (Immutable / Append-Only)
  -- ==========================================================================
  INSERT INTO public.click_records (
    id,
    course_id,
    course_slug,
    course_title,
    referrer,
    user_agent,
    clicked_at
  )
  SELECT
    id,
    course_id,
    course_slug,
    course_title,
    referrer,
    user_agent,
    clicked_at
  FROM pg_temp._mig_expected_clicks
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_ins_click_count = ROW_COUNT;

  -- Historical clicks are immutable: ALWAYS require 9/9 exact 7-column matches
  SELECT COUNT(*)
  INTO v_click_exact_matches
  FROM public.click_records r
  JOIN pg_temp._mig_expected_clicks e ON e.id = r.id
  WHERE r.course_id    IS NOT DISTINCT FROM e.course_id
    AND r.course_slug  IS NOT DISTINCT FROM e.course_slug
    AND r.course_title IS NOT DISTINCT FROM e.course_title
    AND r.referrer     IS NOT DISTINCT FROM e.referrer
    AND r.user_agent   IS NOT DISTINCT FROM e.user_agent
    AND r.clicked_at   IS NOT DISTINCT FROM e.clicked_at;

  IF v_click_exact_matches <> 9 THEN
    RAISE EXCEPTION
      'Migration parity check failed in public.click_records: expected 9 exact 7-column matches, found % (conflicting or altered historical click record).',
      v_click_exact_matches;
  END IF;

  -- ==========================================================================
  -- C. Migrate & Verify Website Settings Singleton Row (id = 1, 15 Fields)
  -- ==========================================================================
  SELECT COUNT(*)
  INTO v_pre_set_count
  FROM public.website_settings
  WHERE id = 1;

  INSERT INTO public.website_settings (
    id,
    site_title,
    whatsapp_number,
    whatsapp_link,
    call_number,
    messenger_link,
    hero_badge,
    hero_title,
    hero_subtitle,
    show_countdown_timer,
    countdown_label,
    countdown_target_course,
    countdown_target_date,
    default_affiliate_ref,
    updated_at
  )
  SELECT
    id,
    site_title,
    whatsapp_number,
    whatsapp_link,
    call_number,
    messenger_link,
    hero_badge,
    hero_title,
    hero_subtitle,
    show_countdown_timer,
    countdown_label,
    countdown_target_course,
    countdown_target_date,
    default_affiliate_ref,
    updated_at
  FROM pg_temp._mig_expected_settings
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_ins_set_count = ROW_COUNT;

  IF v_pre_set_count = 0 THEN
    -- First Migration: require exact 15-column match
    IF v_ins_set_count <> 1 THEN
      RAISE EXCEPTION
        'First migration failed in public.website_settings: expected 1 inserted row, got %.',
        v_ins_set_count;
    END IF;

    SELECT COUNT(*)
    INTO v_set_exact_matches
    FROM public.website_settings s
    JOIN pg_temp._mig_expected_settings e ON e.id = s.id
    WHERE s.site_title              IS NOT DISTINCT FROM e.site_title
      AND s.whatsapp_number         IS NOT DISTINCT FROM e.whatsapp_number
      AND s.whatsapp_link           IS NOT DISTINCT FROM e.whatsapp_link
      AND s.call_number             IS NOT DISTINCT FROM e.call_number
      AND s.messenger_link          IS NOT DISTINCT FROM e.messenger_link
      AND s.hero_badge              IS NOT DISTINCT FROM e.hero_badge
      AND s.hero_title              IS NOT DISTINCT FROM e.hero_title
      AND s.hero_subtitle           IS NOT DISTINCT FROM e.hero_subtitle
      AND s.show_countdown_timer    IS NOT DISTINCT FROM e.show_countdown_timer
      AND s.countdown_label         IS NOT DISTINCT FROM e.countdown_label
      AND s.countdown_target_course IS NOT DISTINCT FROM e.countdown_target_course
      AND s.countdown_target_date   IS NOT DISTINCT FROM e.countdown_target_date
      AND s.default_affiliate_ref   IS NOT DISTINCT FROM e.default_affiliate_ref
      AND s.updated_at              IS NOT DISTINCT FROM e.updated_at;

    IF v_set_exact_matches <> 1 THEN
      RAISE EXCEPTION
        'First migration parity check failed in public.website_settings: expected exact 15-column match.';
    END IF;
  ELSE
    -- Re-run: preserve live admin edits if updated_at advanced; verify exact parity if unedited
    SELECT updated_at
    INTO v_existing_set_updated
    FROM public.website_settings
    WHERE id = 1;

    IF v_existing_set_updated = '2026-11-16T21:00:00.797Z'::timestamptz THEN
      SELECT COUNT(*)
      INTO v_set_exact_matches
      FROM public.website_settings s
      JOIN pg_temp._mig_expected_settings e ON e.id = s.id
      WHERE s.site_title              IS NOT DISTINCT FROM e.site_title
        AND s.whatsapp_number         IS NOT DISTINCT FROM e.whatsapp_number
        AND s.whatsapp_link           IS NOT DISTINCT FROM e.whatsapp_link
        AND s.call_number             IS NOT DISTINCT FROM e.call_number
        AND s.messenger_link          IS NOT DISTINCT FROM e.messenger_link
        AND s.hero_badge              IS NOT DISTINCT FROM e.hero_badge
        AND s.hero_title              IS NOT DISTINCT FROM e.hero_title
        AND s.hero_subtitle           IS NOT DISTINCT FROM e.hero_subtitle
        AND s.show_countdown_timer    IS NOT DISTINCT FROM e.show_countdown_timer
        AND s.countdown_label         IS NOT DISTINCT FROM e.countdown_label
        AND s.countdown_target_course IS NOT DISTINCT FROM e.countdown_target_course
        AND s.countdown_target_date   IS NOT DISTINCT FROM e.countdown_target_date
        AND s.default_affiliate_ref   IS NOT DISTINCT FROM e.default_affiliate_ref
        AND s.updated_at              IS NOT DISTINCT FROM e.updated_at;

      IF v_set_exact_matches <> 1 THEN
        RAISE EXCEPTION
          'Re-run parity check failed in public.website_settings: unedited baseline row id=1 has unexpected field mismatch.';
      END IF;
    ELSIF v_existing_set_updated > '2026-11-16T21:00:00.797Z'::timestamptz THEN
      RAISE NOTICE
        'Re-run preserved live admin edits on public.website_settings (updated_at=%).',
        v_existing_set_updated;
    ELSE
      RAISE EXCEPTION
        'Re-run parity check failed in public.website_settings: unexpected pre-existing row with older updated_at (%).',
        v_existing_set_updated;
    END IF;
  END IF;

  -- ==========================================================================
  -- D. First-Migration Zero Demo Data Guard
  -- ==========================================================================
  IF v_pre_cat_count = 0 AND v_pre_set_count = 0 THEN
    SELECT COUNT(*) INTO v_courses_count   FROM public.courses;
    SELECT COUNT(*) INTO v_inquiries_count FROM public.inquiries;
    SELECT COUNT(*) INTO v_timers_count    FROM public.offer_timers;

    IF v_courses_count <> 0 OR v_inquiries_count <> 0 OR v_timers_count <> 0 THEN
      RAISE EXCEPTION
        'First migration guard failed: expected 0 courses/inquiries/offer_timers (zero demo data), found courses=%, inquiries=%, offer_timers=%.',
        v_courses_count, v_inquiries_count, v_timers_count;
    END IF;
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Safely Synchronize Identity Sequences (Never Rewind Advanced Sequences)
-- ----------------------------------------------------------------------------
SELECT setval(
  pg_get_serial_sequence('public.categories', 'id'),
  GREATEST(
    (SELECT COALESCE(MAX(id), 1) FROM public.categories),
    (SELECT CASE WHEN is_called THEN last_value ELSE 0 END FROM public.categories_id_seq)
  ),
  true
);

SELECT setval(
  pg_get_serial_sequence('public.click_records', 'id'),
  GREATEST(
    (SELECT COALESCE(MAX(id), 1) FROM public.click_records),
    (SELECT CASE WHEN is_called THEN last_value ELSE 0 END FROM public.click_records_id_seq)
  ),
  true
);

COMMIT;
