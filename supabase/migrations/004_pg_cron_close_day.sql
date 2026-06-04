-- ============================================================
-- 004_pg_cron_close_day.sql
-- Evolui — Job diário para fechar hábitos pendentes do dia anterior
-- ============================================================

-- Habilitar extensão pg_cron (já deve estar disponível no Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Dar permissão ao role padrão
GRANT USAGE ON SCHEMA cron TO postgres;

-- ─── Job: fechar pendentes às 00:05 (horário Fortaleza = UTC-3, então 03:05 UTC)
SELECT cron.schedule(
  'close-pending-habits',          -- nome do job (único)
  '5 3 * * *',                     -- 03:05 UTC = 00:05 BRT
  $$
    UPDATE public.habit_logs
    SET status = 'nao_feito'
    WHERE status = 'pendente'
      AND data < CURRENT_DATE;
  $$
);

-- Para verificar o job:
-- SELECT * FROM cron.job;
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Para remover o job se necessário:
-- SELECT cron.unschedule('close-pending-habits');
