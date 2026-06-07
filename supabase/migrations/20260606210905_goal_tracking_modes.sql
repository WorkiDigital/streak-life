-- Metas independentes de lembretes
-- manual: meta simples, atualizada manualmente
-- linked_habit: meta acompanha um habito existente
-- habit_with_reminder: meta cria um novo habito com schedule/lembrete

alter table public.goals
  add column if not exists tracking_mode text not null default 'manual',
  add column if not exists reminders_enabled boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'goals_tracking_mode_check'
      and conrelid = 'public.goals'::regclass
  ) then
    alter table public.goals
      add constraint goals_tracking_mode_check
      check (tracking_mode in ('manual', 'linked_habit', 'habit_with_reminder'));
  end if;
end $$;

alter table public.profiles
  add column if not exists default_goal_tracking_mode text not null default 'ask';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_default_goal_tracking_mode_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_default_goal_tracking_mode_check
      check (default_goal_tracking_mode in ('ask', 'manual', 'linked_habit'));
  end if;
end $$;

create index if not exists idx_goals_user_tracking_mode
  on public.goals(user_id, tracking_mode);
