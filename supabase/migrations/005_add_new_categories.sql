-- ============================================================
-- 005_add_new_categories.sql
-- Streak Life — Expandindo categorias de hábitos
-- ============================================================

ALTER TABLE public.habits DROP CONSTRAINT IF EXISTS habits_categoria_check;

ALTER TABLE public.habits ADD CONSTRAINT habits_categoria_check
CHECK (categoria IN (
  'hidratacao',
  'treino',
  'alimentacao',
  'tela',
  'sono',
  'outro',
  'meditacao',
  'leitura',
  'medicamento',
  'ar_livre',
  'autocuidado',
  'alongamento'
));
