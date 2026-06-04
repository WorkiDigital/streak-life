-- ============================================================
-- AI chat, onboarding profile fields, and reminder actions
-- ============================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS idade INT,
ADD COLUMN IF NOT EXISTS sexo TEXT,
ADD COLUMN IF NOT EXISTS altura_cm INT,
ADD COLUMN IF NOT EXISTS peso_kg NUMERIC(6,2),
ADD COLUMN IF NOT EXISTS peso_meta_kg NUMERIC(6,2),
ADD COLUMN IF NOT EXISTS nivel_atividade TEXT,
ADD COLUMN IF NOT EXISTS treina BOOLEAN,
ADD COLUMN IF NOT EXISTS dias_treino INT,
ADD COLUMN IF NOT EXISTS tipo_treino TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_data JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'app' CHECK (source IN ('app', 'whatsapp', 'system')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created
  ON public.chat_messages(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.reminder_snoozes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.habit_schedules(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  canal TEXT NOT NULL DEFAULT 'whatsapp' CHECK (canal IN ('push', 'whatsapp')),
  remind_at TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_snoozes_due
  ON public.reminder_snoozes(user_id, remind_at)
  WHERE delivered_at IS NULL;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_snoozes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario ve suas mensagens" ON public.chat_messages;
CREATE POLICY "Usuario ve suas mensagens"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuario cria suas mensagens" ON public.chat_messages;
CREATE POLICY "Usuario cria suas mensagens"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuario ve seus adiamentos" ON public.reminder_snoozes;
CREATE POLICY "Usuario ve seus adiamentos"
  ON public.reminder_snoozes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuario cria seus adiamentos" ON public.reminder_snoozes;
CREATE POLICY "Usuario cria seus adiamentos"
  ON public.reminder_snoozes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuario atualiza seus adiamentos" ON public.reminder_snoozes;
CREATE POLICY "Usuario atualiza seus adiamentos"
  ON public.reminder_snoozes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
