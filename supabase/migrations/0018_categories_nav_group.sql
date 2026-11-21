-- Optional nav_group assignment column for categories table
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS nav_group text DEFAULT 'auto';
