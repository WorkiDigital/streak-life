-- ============================================================
-- 002_rls_policies.sql
-- Evolui — Row Level Security para todas as tabelas
-- ============================================================

-- ─── Habilitar RLS ───────────────────────────────────────────
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_schedules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders_sent   ENABLE ROW LEVEL SECURITY;

-- ─── Profiles ────────────────────────────────────────────────
CREATE POLICY "Usuário vê seu próprio perfil"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Usuário atualiza seu próprio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuário cria seu próprio perfil"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ─── Habits ──────────────────────────────────────────────────
-- Templates globais (user_id IS NULL) são visíveis a todos
CREATE POLICY "Usuário vê seus hábitos e templates"
  ON public.habits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Usuário cria hábito para si"
  ON public.habits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuário atualiza seus hábitos"
  ON public.habits FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuário deleta seus hábitos"
  ON public.habits FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ─── Habit Schedules ─────────────────────────────────────────
CREATE POLICY "Usuário vê seus agendamentos"
  ON public.habit_schedules FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuário cria agendamento para si"
  ON public.habit_schedules FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuário atualiza seus agendamentos"
  ON public.habit_schedules FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuário deleta seus agendamentos"
  ON public.habit_schedules FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ─── Habit Logs ──────────────────────────────────────────────
CREATE POLICY "Usuário vê seus logs"
  ON public.habit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuário cria seu log"
  ON public.habit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuário atualiza seu log"
  ON public.habit_logs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuário deleta seu log"
  ON public.habit_logs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ─── Reminders Sent ──────────────────────────────────────────
CREATE POLICY "Usuário vê seus lembretes enviados"
  ON public.reminders_sent FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Escrita via service_role (N8N/Edge Functions) — sem policy INSERT para authenticated
-- N8N usa SUPABASE_SERVICE_ROLE_KEY para inserir
