-- Sistema de Metas Integrado — Streak Life v2.0

-- Tabela goals
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null, -- hydration|nutrition|training|sleep|routine|consistency|custom
  type text not null,     -- main|outcome|process|consistency
  target_value numeric,
  current_value numeric default 0,
  unit text,
  frequency text,         -- daily|weekly|monthly
  start_date date default current_date,
  end_date date,
  status text default 'active', -- active|paused|completed|archived
  priority int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela goal_logs (progresso diário/semanal)
create table if not exists public.goal_logs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  value numeric,
  status text default 'logged',
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(goal_id, user_id, date)
);

-- Tabela goal_habits (conexão meta↔hábito)
create table if not exists public.goal_habits (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  impact_weight numeric default 1,
  created_at timestamptz default now(),
  unique(goal_id, habit_id)
);

-- ALTER profiles
alter table public.profiles
  add column if not exists consistency_threshold numeric default 0.7,
  add column if not exists goals_enabled boolean default true;

-- ALTER habit_schedules
alter table public.habit_schedules
  add column if not exists goal_context_enabled boolean default true,
  add column if not exists reminder_priority int default 1;

-- RLS
alter table public.goals enable row level security;
alter table public.goal_logs enable row level security;
alter table public.goal_habits enable row level security;

create policy "Users can read own goals"
  on public.goals for select using (user_id = auth.uid());
create policy "Users can insert own goals"
  on public.goals for insert with check (user_id = auth.uid());
create policy "Users can update own goals"
  on public.goals for update using (user_id = auth.uid());
create policy "Users can delete own goals"
  on public.goals for delete using (user_id = auth.uid());

create policy "Users can read own goal_logs"
  on public.goal_logs for select using (user_id = auth.uid());
create policy "Users can insert own goal_logs"
  on public.goal_logs for insert with check (user_id = auth.uid());
create policy "Users can update own goal_logs"
  on public.goal_logs for update using (user_id = auth.uid());
create policy "Users can delete own goal_logs"
  on public.goal_logs for delete using (user_id = auth.uid());

create policy "Users can read own goal_habits"
  on public.goal_habits for select using (user_id = auth.uid());
create policy "Users can insert own goal_habits"
  on public.goal_habits for insert with check (user_id = auth.uid());
create policy "Users can update own goal_habits"
  on public.goal_habits for update using (user_id = auth.uid());
create policy "Users can delete own goal_habits"
  on public.goal_habits for delete using (user_id = auth.uid());

-- Índices
create index if not exists idx_goals_user_status on public.goals(user_id, status);
create index if not exists idx_goals_user_category on public.goals(user_id, category);
create index if not exists idx_goal_logs_user_date on public.goal_logs(user_id, date);
create index if not exists idx_goal_logs_goal_date on public.goal_logs(goal_id, date);
create index if not exists idx_goal_habits_goal on public.goal_habits(goal_id);
create index if not exists idx_goal_habits_habit on public.goal_habits(habit_id);
create index if not exists idx_goal_habits_user on public.goal_habits(user_id);
