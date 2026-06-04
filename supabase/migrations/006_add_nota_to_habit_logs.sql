-- ============================================================
-- 006_add_nota_to_habit_logs.sql
-- Streak Life — Adicionar coluna nota na tabela habit_logs
-- ============================================================

ALTER TABLE public.habit_logs ADD COLUMN IF NOT EXISTS nota TEXT;
