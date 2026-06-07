-- Partnerships allow a female and male user to link their accounts so the
-- male partner can read the female partner's cycle records (and vice versa).

create table if not exists public.partnerships (
  id uuid primary key default gen_random_uuid(),
  female_user_id uuid references auth.users(id) on delete cascade,
  male_user_id uuid references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'active', 'cancelled')) default 'pending',
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_by_role text not null check (created_by_role in ('female', 'male')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  cancelled_at timestamptz,
  check (
    (created_by_role = 'female' and female_user_id = created_by)
    or (created_by_role = 'male' and male_user_id = created_by)
  ),
  check (
    status <> 'active'
    or (female_user_id is not null and male_user_id is not null and female_user_id <> male_user_id)
  )
);

-- Only one active partnership per user per side. Pending invites are allowed in parallel
-- but the accept_partner_invite RPC will cancel them when one is accepted.
create unique index if not exists partnerships_active_female_idx
  on public.partnerships(female_user_id)
  where status = 'active';

create unique index if not exists partnerships_active_male_idx
  on public.partnerships(male_user_id)
  where status = 'active';

create index if not exists partnerships_invite_code_idx
  on public.partnerships(invite_code)
  where status = 'pending';

alter table public.partnerships enable row level security;

-- Members of the partnership can read it.
create policy "members can read partnership" on public.partnerships
  for select using (
    auth.uid() = female_user_id
    or auth.uid() = male_user_id
    or auth.uid() = created_by
  );

-- Creator can insert a pending invite where they fill in their own slot.
create policy "creator can insert pending invite" on public.partnerships
  for insert with check (
    created_by = auth.uid()
    and status = 'pending'
    and (
      (created_by_role = 'female' and female_user_id = auth.uid() and male_user_id is null)
      or (created_by_role = 'male' and male_user_id = auth.uid() and female_user_id is null)
    )
  );

-- Members can update their own partnership rows (used for cancel).
create policy "members can update partnership" on public.partnerships
  for update using (
    auth.uid() = female_user_id
    or auth.uid() = male_user_id
    or auth.uid() = created_by
  )
  with check (
    auth.uid() = female_user_id
    or auth.uid() = male_user_id
    or auth.uid() = created_by
  );

-- Allow partner to read the other's cycle logs while an active partnership exists.
create policy "partner can read cycle logs" on public.cycle_logs
  for select using (
    exists (
      select 1 from public.partnerships p
      where p.status = 'active'
        and (
          (p.female_user_id = public.cycle_logs.user_id and p.male_user_id = auth.uid())
          or (p.male_user_id = public.cycle_logs.user_id and p.female_user_id = auth.uid())
        )
    )
  );

-- Allow partner to read display_name / locale on the other side's profile.
create policy "partner can read profile" on public.profiles
  for select using (
    exists (
      select 1 from public.partnerships p
      where p.status = 'active'
        and (
          (p.female_user_id = public.profiles.id and p.male_user_id = auth.uid())
          or (p.male_user_id = public.profiles.id and p.female_user_id = auth.uid())
        )
    )
  );

-- Accept an invite: find the pending partnership by code, fill in the caller's
-- slot, and mark active. Runs with SECURITY DEFINER so callers don't need direct
-- update access on rows they don't yet belong to.
create or replace function public.accept_partner_invite(p_invite_code text)
returns public.partnerships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_invite public.partnerships;
  v_role text;
  v_updated public.partnerships;
begin
  if v_caller is null then
    raise exception 'A signed-in user is required.' using errcode = '42501';
  end if;

  select * into v_invite
  from public.partnerships
  where invite_code = p_invite_code
    and status = 'pending'
  limit 1;

  if not found then
    raise exception 'Invite code not found or already used.' using errcode = 'P0002';
  end if;

  if v_invite.created_by = v_caller then
    raise exception 'You cannot accept your own invite.' using errcode = '22023';
  end if;

  -- The opposite role of the creator becomes the caller.
  v_role := case when v_invite.created_by_role = 'female' then 'male' else 'female' end;

  if v_role = 'male' then
    if exists (
      select 1 from public.partnerships
      where male_user_id = v_caller and status = 'active'
    ) then
      raise exception 'You already have an active partnership.' using errcode = '23505';
    end if;
    update public.partnerships
       set male_user_id = v_caller,
           status = 'active',
           accepted_at = now()
     where id = v_invite.id
       and status = 'pending'
     returning * into v_updated;
  else
    if exists (
      select 1 from public.partnerships
      where female_user_id = v_caller and status = 'active'
    ) then
      raise exception 'You already have an active partnership.' using errcode = '23505';
    end if;
    update public.partnerships
       set female_user_id = v_caller,
           status = 'active',
           accepted_at = now()
     where id = v_invite.id
       and status = 'pending'
     returning * into v_updated;
  end if;

  return v_updated;
end;
$$;

grant execute on function public.accept_partner_invite(text) to authenticated;
