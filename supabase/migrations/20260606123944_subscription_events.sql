create table if not exists public.subscription_events (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  revenuecat_customer_id text not null,
  product_id text,
  entitlement_ids text[] not null default '{}'::text[],
  payload jsonb not null,
  received_at timestamptz not null default now()
);

alter table public.subscription_events enable row level security;

create policy "subscription events hidden from clients" on public.subscription_events
  for all using (false) with check (false);

create index if not exists subscription_events_user_received_at_idx
  on public.subscription_events (user_id, received_at desc);

grant select on public.subscription_events to authenticated;
