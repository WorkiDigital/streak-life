ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS canais_preferidos TEXT[] NOT NULL DEFAULT '{push,whatsapp}';
