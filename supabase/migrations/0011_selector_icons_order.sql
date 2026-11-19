-- ============================================================================
-- Migration: 0011_selector_icons_order.sql
-- Project:   10ms Affiliate Portal (10msallcourse.com)
-- Purpose:   Persist Main Website ClassSelectorStrip icon display positions,
--            enforce unique positive serial numbers, enable RLS, and provide
--            an atomic transactional save RPC (`save_selector_icon_positions`).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.selector_icons (
  icon_id    TEXT        PRIMARY KEY,
  position   INTEGER     NOT NULL CHECK (position >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_selector_icons_position
    UNIQUE (position) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_selector_icons_position
  ON public.selector_icons (position ASC);

INSERT INTO public.selector_icons (icon_id, position)
VALUES
  ('hsc-26', 1),
  ('hsc-27', 2),
  ('hsc-28', 3),
  ('ssc-27', 4),
  ('ssc-28', 5),
  ('class-8', 6),
  ('class-7', 7),
  ('class-6', 8),
  ('class-5', 9),
  ('book-store', 10),
  ('skills', 11),
  ('free-course', 12)
ON CONFLICT (icon_id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_selector_icons_set_updated_at ON public.selector_icons;
CREATE TRIGGER trg_selector_icons_set_updated_at
  BEFORE UPDATE ON public.selector_icons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.selector_icons ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.selector_icons FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.selector_icons TO anon, authenticated;
GRANT ALL ON TABLE public.selector_icons TO service_role;

DROP POLICY IF EXISTS "Public read selector icons" ON public.selector_icons;
CREATE POLICY "Public read selector icons"
  ON public.selector_icons
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage selector icons" ON public.selector_icons;
CREATE POLICY "Admins manage selector icons"
  ON public.selector_icons
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Atomic transactional position update RPC (zero duplicate or partial-update conflicts)
CREATE OR REPLACE FUNCTION public.save_selector_icon_positions(
  p_ordered_ids TEXT[]
)
RETURNS TABLE (
  icon_id  TEXT,
  position INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
  v_idx   INTEGER;
  v_id    TEXT;
BEGIN
  v_count := COALESCE(array_length(p_ordered_ids, 1), 0);
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Ordered icon ID list cannot be empty.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Lock table rows deterministically for atomic update
  PERFORM 1
  FROM public.selector_icons s
  ORDER BY s.icon_id ASC
  FOR UPDATE;

  -- Upsert contiguous 1..N positions inside transaction (deferrable UNIQUE checks at commit)
  FOR v_idx IN 1..v_count LOOP
    v_id := p_ordered_ids[v_idx];
    INSERT INTO public.selector_icons (icon_id, position)
    VALUES (v_id, v_idx)
    ON CONFLICT (icon_id)
    DO UPDATE SET position = EXCLUDED.position;
  END LOOP;

  RETURN QUERY
  SELECT s.icon_id, s.position
  FROM public.selector_icons s
  ORDER BY s.position ASC, s.icon_id ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.save_selector_icon_positions(TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_selector_icon_positions(TEXT[]) TO service_role;

COMMIT;
