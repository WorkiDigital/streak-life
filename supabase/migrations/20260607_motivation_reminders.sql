-- ============================================================
-- Motivacao pessoal e lembrete diario de motivacao
-- ============================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS motivacao_pessoal TEXT,
ADD COLUMN IF NOT EXISTS horario_motivacao TIME;
