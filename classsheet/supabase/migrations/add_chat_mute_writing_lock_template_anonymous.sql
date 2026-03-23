ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS chat_muted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS writing_locked boolean NOT NULL DEFAULT false;

ALTER TABLE public.worksheets
  ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS chat_anonymous_mode boolean NOT NULL DEFAULT false;
