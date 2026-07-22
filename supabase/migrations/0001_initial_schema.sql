-- Pact initial schema
-- Mirrors Pact.dc.html's Component state shape (contract, network, owedFavor, vault, notifications)
-- per handoff/README.md "Backend/data layer" instruction.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  avatar_id text not null default 'alex',
  points integer not null default 0,
  reliability integer not null default 100,
  kept_count integer not null default 0,
  breached_count integer not null default 0,
  push_enabled boolean not null default true,
  reminders_enabled boolean not null default true,
  public_score boolean not null default true,
  referral_code text unique,
  created_at timestamptz not null default now()
);

create table public.vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  weight text not null default 'med' check (weight in ('low','med','high')),
  source text not null default 'custom' check (source in ('preset','custom')),
  created_at timestamptz not null default now()
);

create table public.network_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  contact_user_id uuid references public.profiles(id) on delete set null,
  contact_name text not null,
  contact_email text,
  status text not null default 'pending' check (status in ('pending','joined')),
  blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.invite_codes (
  code text primary key,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  redeemed_by uuid references public.profiles(id) on delete set null,
  redeemed_at timestamptz
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  proposer_id uuid not null references public.profiles(id) on delete cascade,
  partner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null default 'other',
  description text not null default '',
  deadline timestamptz,
  status text not null default 'proposed' check (status in
    ('proposed','countered','active','pending_confirm','kept','breached','disputed','canceled','pending_edit')),
  progress_value integer not null default 0,
  progress_max integer not null default 1,
  progress_label text not null default '',
  penalty_favor_text text not null default '',
  points integer not null default 150,
  pending_edit_title text,
  dispute_note text,
  disputed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contract_history (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.favors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  from_user_id uuid references public.profiles(id) on delete set null,
  text text not null,
  status text not null default 'owed' check (status in ('owed','redeemed')),
  source_contract_id uuid references public.contracts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  contract_id uuid references public.contracts(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

create index on public.contracts (proposer_id);
create index on public.contracts (partner_id);
create index on public.contract_history (contract_id);
create index on public.favors (owner_id);
create index on public.notifications (user_id);
create index on public.network_connections (user_id);
create index on public.push_subscriptions (user_id);

create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contracts_touch_updated_at
  before update on public.contracts
  for each row execute function public.touch_updated_at();
