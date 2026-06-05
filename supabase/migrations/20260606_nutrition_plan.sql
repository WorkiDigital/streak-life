-- ============================================================
-- Plano Nutricional Opcional — Streak Life v1.0
-- ============================================================

-- 1. Tabelas novas

create table if not exists public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',
  mode text not null default 'simples',
  objetivo text,
  objetivo_descricao text,
  observacoes_gerais text,
  safety_status text default 'ok',
  safety_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.nutrition_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  calorias_estimadas int,
  proteina_g int,
  carboidrato_g int,
  gordura_g int,
  agua_litros numeric,
  observacao text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.nutrition_meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.nutrition_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  categoria text default 'alimentacao',
  horario time,
  ordem int default 0,
  descricao_simples text,
  objetivo_refeicao text,
  proteina_g int,
  carboidrato_g int,
  gordura_g int,
  calorias_estimadas int,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.nutrition_meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.nutrition_meals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  alimento text not null,
  quantidade_min numeric,
  quantidade_max numeric,
  unidade text default 'g',
  grupo text,
  observacao text,
  ordem int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.nutrition_substitutions (
  id uuid primary key default gen_random_uuid(),
  meal_item_id uuid references public.nutrition_meal_items(id) on delete cascade,
  meal_id uuid references public.nutrition_meals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  alimento_original text,
  substituto text not null,
  quantidade_min numeric,
  quantidade_max numeric,
  unidade text default 'g',
  observacao text,
  created_at timestamptz default now()
);

create table if not exists public.nutrition_meal_logs (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.nutrition_meals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  status text not null default 'feito',
  observacao text,
  adaptacao text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(meal_id, user_id, data)
);

-- 2. Alterações em tabelas existentes

alter table public.profiles
  add column if not exists nutrition_enabled boolean default false,
  add column if not exists nutrition_mode text default 'simples',
  add column if not exists nutrition_safety_status text default 'ok';

alter table public.habits
  add column if not exists nutrition_meal_id uuid references public.nutrition_meals(id) on delete set null;

alter table public.habit_logs
  add column if not exists nutrition_meal_log_id uuid references public.nutrition_meal_logs(id) on delete set null;

-- 3. RLS

alter table public.nutrition_plans enable row level security;
alter table public.nutrition_targets enable row level security;
alter table public.nutrition_meals enable row level security;
alter table public.nutrition_meal_items enable row level security;
alter table public.nutrition_substitutions enable row level security;
alter table public.nutrition_meal_logs enable row level security;

-- nutrition_plans
create policy "nutrition_plans_select" on public.nutrition_plans for select using (user_id = auth.uid());
create policy "nutrition_plans_insert" on public.nutrition_plans for insert with check (user_id = auth.uid());
create policy "nutrition_plans_update" on public.nutrition_plans for update using (user_id = auth.uid());
create policy "nutrition_plans_delete" on public.nutrition_plans for delete using (user_id = auth.uid());

-- nutrition_targets
create policy "nutrition_targets_select" on public.nutrition_targets for select using (user_id = auth.uid());
create policy "nutrition_targets_insert" on public.nutrition_targets for insert with check (user_id = auth.uid());
create policy "nutrition_targets_update" on public.nutrition_targets for update using (user_id = auth.uid());
create policy "nutrition_targets_delete" on public.nutrition_targets for delete using (user_id = auth.uid());

-- nutrition_meals
create policy "nutrition_meals_select" on public.nutrition_meals for select using (user_id = auth.uid());
create policy "nutrition_meals_insert" on public.nutrition_meals for insert with check (user_id = auth.uid());
create policy "nutrition_meals_update" on public.nutrition_meals for update using (user_id = auth.uid());
create policy "nutrition_meals_delete" on public.nutrition_meals for delete using (user_id = auth.uid());

-- nutrition_meal_items
create policy "nutrition_meal_items_select" on public.nutrition_meal_items for select using (user_id = auth.uid());
create policy "nutrition_meal_items_insert" on public.nutrition_meal_items for insert with check (user_id = auth.uid());
create policy "nutrition_meal_items_update" on public.nutrition_meal_items for update using (user_id = auth.uid());
create policy "nutrition_meal_items_delete" on public.nutrition_meal_items for delete using (user_id = auth.uid());

-- nutrition_substitutions
create policy "nutrition_substitutions_select" on public.nutrition_substitutions for select using (user_id = auth.uid());
create policy "nutrition_substitutions_insert" on public.nutrition_substitutions for insert with check (user_id = auth.uid());
create policy "nutrition_substitutions_update" on public.nutrition_substitutions for update using (user_id = auth.uid());
create policy "nutrition_substitutions_delete" on public.nutrition_substitutions for delete using (user_id = auth.uid());

-- nutrition_meal_logs
create policy "nutrition_meal_logs_select" on public.nutrition_meal_logs for select using (user_id = auth.uid());
create policy "nutrition_meal_logs_insert" on public.nutrition_meal_logs for insert with check (user_id = auth.uid());
create policy "nutrition_meal_logs_update" on public.nutrition_meal_logs for update using (user_id = auth.uid());
create policy "nutrition_meal_logs_delete" on public.nutrition_meal_logs for delete using (user_id = auth.uid());

-- 4. Índices de performance

create index if not exists idx_nutrition_plans_user_status on public.nutrition_plans(user_id, status);
create index if not exists idx_nutrition_targets_plan on public.nutrition_targets(plan_id);
create index if not exists idx_nutrition_meals_plan_user on public.nutrition_meals(plan_id, user_id);
create index if not exists idx_nutrition_meals_user_active on public.nutrition_meals(user_id, ativo);
create index if not exists idx_nutrition_meal_items_meal on public.nutrition_meal_items(meal_id);
create index if not exists idx_nutrition_substitutions_meal on public.nutrition_substitutions(meal_id);
create index if not exists idx_nutrition_meal_logs_user_date on public.nutrition_meal_logs(user_id, data);
