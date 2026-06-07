-- Add an immutable role to profiles. The value is confirmed at signup and
-- cannot be changed afterwards (a trigger blocks UPDATE attempts that alter a
-- non-null role).

alter table public.profiles
  add column if not exists role text;

alter table public.profiles
  drop constraint if exists profiles_role_valid;
alter table public.profiles
  add constraint profiles_role_valid check (role is null or role in ('female', 'male'));

create or replace function public.profiles_prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if old.role is not null and new.role is distinct from old.role then
    raise exception 'Profile role cannot be changed once confirmed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_immutable on public.profiles;
create trigger profiles_role_immutable
  before update of role on public.profiles
  for each row
  execute function public.profiles_prevent_role_change();
