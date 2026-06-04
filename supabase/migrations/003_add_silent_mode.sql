-- ============================================================
-- 003_add_silent_mode.sql
-- Evolui — Adicionar modo silêncio ao perfil
-- ============================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS silent_mode BOOLEAN NOT NULL DEFAULT FALSE;
