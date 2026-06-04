-- ============================================================
-- 001_initial_schema.sql
-- Evolui — Schema inicial do banco de dados
-- ============================================================

-- ─── Extensões ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL DEFAULT '',
  whatsapp      TEXT,                                     -- E.164: +5585999999999
  timezone      TEXT NOT NULL DEFAULT 'America/Fortaleza',
  push_token    TEXT,                                     -- Web Push subscription JSON
  tom_preferido TEXT NOT NULL DEFAULT 'amigavel'
                CHECK (tom_preferido IN ('amigavel','direto','motivacional')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Habits ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.habits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL = template global
  nome        TEXT NOT NULL,
  icone       TEXT,
  categoria   TEXT DEFAULT 'outro'
              CHECK (categoria IN ('hidratacao','treino','alimentacao','tela','sono','outro')),
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Habit Schedules ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.habit_schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id     UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  horario      TIME NOT NULL,                             -- ex: 19:00
  dias_semana  INT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}', -- 0=Dom ... 6=Sab
  canais       TEXT[] NOT NULL DEFAULT '{push,whatsapp}',
  ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Habit Logs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id    UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data        DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pendente'
              CHECK (status IN ('feito','nao_feito','pendente')),
  valor       TEXT,                                       -- registro livre (ex: "45 min")
  marcado_em  TIMESTAMPTZ,
  UNIQUE (habit_id, user_id, data)
);

-- ─── Reminders Sent ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reminders_sent (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id  UUID REFERENCES public.habit_schedules(id) ON DELETE SET NULL,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data         DATE NOT NULL,
  canal        TEXT NOT NULL,                             -- push | whatsapp
  mensagem     TEXT,
  enviado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_id, data, canal)
);

-- ─── Índices de Performance ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_habits_user_id       ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user_id    ON public.habit_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_horario    ON public.habit_schedules(horario);
CREATE INDEX IF NOT EXISTS idx_logs_user_date       ON public.habit_logs(user_id, data);
CREATE INDEX IF NOT EXISTS idx_logs_habit_date      ON public.habit_logs(habit_id, data);
CREATE INDEX IF NOT EXISTS idx_reminders_schedule   ON public.reminders_sent(schedule_id, data);

-- ─── Trigger: updated_at em profiles ─────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── Trigger: auto-criar profile no signup ────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
