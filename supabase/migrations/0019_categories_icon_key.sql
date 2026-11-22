-- Optional icon_key assignment column for categories table
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS icon_key text DEFAULT 'auto';
