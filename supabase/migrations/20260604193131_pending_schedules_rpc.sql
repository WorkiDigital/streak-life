-- ============================================================
-- Pending schedules RPC for n8n reminder delivery
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_pending_schedules()
RETURNS TABLE (
  schedule_id UUID,
  snooze_id UUID,
  user_id UUID,
  habit_id UUID,
  nome_usuario TEXT,
  nome_habito TEXT,
  categoria TEXT,
  whatsapp TEXT,
  push_token TEXT,
  canais TEXT[],
  canal TEXT,
  tom TEXT,
  timezone TEXT,
  data DATE,
  horario TIME,
  source TEXT
)
LANGUAGE sql
STABLE
AS $$
  WITH base AS (
    SELECT
      hs.id AS schedule_id,
      NULL::uuid AS snooze_id,
      hs.user_id,
      h.id AS habit_id,
      p.nome AS nome_usuario,
      h.nome AS nome_habito,
      h.categoria,
      p.whatsapp,
      p.push_token,
      hs.canais,
      NULL::text AS canal,
      p.tom_preferido AS tom,
      p.timezone,
      ((now() AT TIME ZONE p.timezone)::date) AS data,
      hs.horario,
      'schedule'::text AS source
    FROM public.habit_schedules hs
    JOIN public.habits h ON h.id = hs.habit_id
    JOIN public.profiles p ON p.id = hs.user_id
    WHERE hs.ativo = TRUE
      AND h.ativo = TRUE
      AND COALESCE(p.silent_mode, FALSE) = FALSE
      AND EXTRACT(DOW FROM (now() AT TIME ZONE p.timezone))::int = ANY(hs.dias_semana)
      AND hs.horario <= ((now() AT TIME ZONE p.timezone)::time)
      AND hs.horario > (((now() - interval '16 minutes') AT TIME ZONE p.timezone)::time)
  ),
  regular_due AS (
    SELECT
      b.schedule_id,
      b.snooze_id,
      b.user_id,
      b.habit_id,
      b.nome_usuario,
      b.nome_habito,
      b.categoria,
      b.whatsapp,
      b.push_token,
      ARRAY(
        SELECT c
        FROM unnest(b.canais) c
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.reminders_sent rs
          WHERE rs.schedule_id = b.schedule_id
            AND rs.data = b.data
            AND rs.canal = c
        )
      ) AS canais,
      b.canal,
      b.tom,
      b.timezone,
      b.data,
      b.horario,
      b.source
    FROM base b
    WHERE EXISTS (
      SELECT 1
      FROM unnest(b.canais) c
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.reminders_sent rs
        WHERE rs.schedule_id = b.schedule_id
          AND rs.data = b.data
          AND rs.canal = c
      )
    )
  ),
  snooze_due AS (
    SELECT
      rs.schedule_id,
      rs.id AS snooze_id,
      rs.user_id,
      h.id AS habit_id,
      p.nome AS nome_usuario,
      h.nome AS nome_habito,
      h.categoria,
      p.whatsapp,
      p.push_token,
      ARRAY[rs.canal]::text[] AS canais,
      rs.canal,
      p.tom_preferido AS tom,
      p.timezone,
      ((now() AT TIME ZONE p.timezone)::date) AS data,
      ((rs.remind_at AT TIME ZONE p.timezone)::time) AS horario,
      'snooze'::text AS source
    FROM public.reminder_snoozes rs
    JOIN public.habits h ON h.id = rs.habit_id
    JOIN public.profiles p ON p.id = rs.user_id
    WHERE rs.delivered_at IS NULL
      AND rs.remind_at <= now()
      AND COALESCE(p.silent_mode, FALSE) = FALSE
      AND h.ativo = TRUE
  )
  SELECT * FROM regular_due
  UNION ALL
  SELECT * FROM snooze_due
  ORDER BY horario ASC;
$$;
