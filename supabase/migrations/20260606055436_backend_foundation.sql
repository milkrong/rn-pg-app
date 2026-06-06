create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

alter table public.cycle_logs
  add column if not exists updated_at timestamptz not null default now();

alter table public.coach_sessions
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.coach_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.coach_messages enable row level security;

create policy "coach messages owned by user" on public.coach_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists cycle_logs_user_happened_on_idx
  on public.cycle_logs (user_id, happened_on desc);

create index if not exists cycle_logs_user_client_updated_at_idx
  on public.cycle_logs (user_id, client_updated_at desc);

create index if not exists coach_sessions_user_created_at_idx
  on public.coach_sessions (user_id, created_at desc);

create index if not exists coach_messages_session_created_at_idx
  on public.coach_messages (session_id, created_at);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger cycle_logs_set_updated_at
  before update on public.cycle_logs
  for each row execute function private.set_updated_at();

create trigger coach_sessions_set_updated_at
  before update on public.coach_sessions
  for each row execute function private.set_updated_at();

create trigger entitlements_set_updated_at
  before update on public.entitlements
  for each row execute function private.set_updated_at();

create trigger healthkit_sync_cursors_set_updated_at
  before update on public.healthkit_sync_cursors
  for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, display_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    coalesce(new.raw_app_meta_data ->> 'locale', 'zh-CN')
  )
  on conflict (id) do nothing;

  insert into public.entitlements (user_id, plan)
  values (new.id, 'free')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.cycle_logs to authenticated;
grant select, insert, update, delete on public.coach_sessions to authenticated;
grant select, insert, update, delete on public.coach_messages to authenticated;
grant select on public.ai_usage to authenticated;
grant select on public.entitlements to authenticated;
grant select, insert, update, delete on public.healthkit_sync_cursors to authenticated;
