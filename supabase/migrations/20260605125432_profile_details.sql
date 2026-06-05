-- ============================================================
-- Complete profile details collected by the AI onboarding
-- ============================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS objetivo TEXT,
ADD COLUMN IF NOT EXISTS objetivo_descricao TEXT,
ADD COLUMN IF NOT EXISTS prazo_meta TEXT,
ADD COLUMN IF NOT EXISTS horario_acordar TIME,
ADD COLUMN IF NOT EXISTS horario_dormir TIME,
ADD COLUMN IF NOT EXISTS horario_treino_preferido TIME,
ADD COLUMN IF NOT EXISTS preferencias_alimentares TEXT,
ADD COLUMN IF NOT EXISTS restricoes_alimentares TEXT,
ADD COLUMN IF NOT EXISTS observacoes_saude TEXT,
ADD COLUMN IF NOT EXISTS nivel_estresse TEXT,
ADD COLUMN IF NOT EXISTS horarios_refeicoes JSONB NOT NULL DEFAULT '{}'::jsonb;
