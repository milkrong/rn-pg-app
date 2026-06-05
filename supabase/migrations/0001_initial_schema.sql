create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'zh-CN',
  created_at timestamptz not null default now()
);

create table if not exists public.cycle_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  log_type text not null check (log_type in ('period', 'symptom', 'temperature', 'ovulation_test', 'intercourse', 'supplement')),
  happened_on date not null,
  payload jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, local_id)
);

create table if not exists public.coach_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'AI 备孕教练',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  messages_used integer not null default 0,
  primary key (user_id, usage_date)
);

create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('free', 'pro')) default 'free',
  expires_at timestamptz,
  revenuecat_customer_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.healthkit_sync_cursors (
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null,
  cursor_value text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, capability)
);

alter table public.profiles enable row level security;
alter table public.cycle_logs enable row level security;
alter table public.coach_sessions enable row level security;
alter table public.ai_usage enable row level security;
alter table public.entitlements enable row level security;
alter table public.healthkit_sync_cursors enable row level security;

create policy "profiles owned by user" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "cycle logs owned by user" on public.cycle_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "coach sessions owned by user" on public.coach_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai usage owned by user" on public.ai_usage
  for select using (auth.uid() = user_id);

create policy "entitlements readable by user" on public.entitlements
  for select using (auth.uid() = user_id);

create policy "healthkit cursors owned by user" on public.healthkit_sync_cursors
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
