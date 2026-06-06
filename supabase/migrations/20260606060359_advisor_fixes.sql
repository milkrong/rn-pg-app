create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index if not exists coach_messages_user_id_idx
  on public.coach_messages (user_id);

drop policy if exists "profiles owned by user" on public.profiles;
drop policy if exists "cycle logs owned by user" on public.cycle_logs;
drop policy if exists "coach sessions owned by user" on public.coach_sessions;
drop policy if exists "ai usage owned by user" on public.ai_usage;
drop policy if exists "entitlements readable by user" on public.entitlements;
drop policy if exists "healthkit cursors owned by user" on public.healthkit_sync_cursors;
drop policy if exists "coach messages owned by user" on public.coach_messages;

create policy "profiles owned by user" on public.profiles
  for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "cycle logs owned by user" on public.cycle_logs
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "coach sessions owned by user" on public.coach_sessions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "ai usage owned by user" on public.ai_usage
  for select using ((select auth.uid()) = user_id);

create policy "entitlements readable by user" on public.entitlements
  for select using ((select auth.uid()) = user_id);

create policy "healthkit cursors owned by user" on public.healthkit_sync_cursors
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "coach messages owned by user" on public.coach_messages
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

do $$
begin
  if exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
  end if;
end;
$$;
