-- ============================================================
-- 003_seed_habits.sql
-- Evolui — Biblioteca de hábitos template (user_id = NULL)
-- ============================================================

INSERT INTO public.habits (id, user_id, nome, icone, categoria, ativo)
VALUES
  (gen_random_uuid(), NULL, 'Beber água',        '💧', 'hidratacao', TRUE),
  (gen_random_uuid(), NULL, 'Treinar',            '🏋️', 'treino',     TRUE),
  (gen_random_uuid(), NULL, 'Registrar treino',   '📝', 'treino',     TRUE),
  (gen_random_uuid(), NULL, 'Jantar no horário',  '🍽️', 'alimentacao',TRUE),
  (gen_random_uuid(), NULL, 'Reduzir telas',      '👀', 'tela',       TRUE),
  (gen_random_uuid(), NULL, 'Dormir cedo',        '🌙', 'sono',       TRUE)
ON CONFLICT DO NOTHING;
