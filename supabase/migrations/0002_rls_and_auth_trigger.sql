-- RLS policies + auto-profile-on-signup trigger.

alter table public.profiles enable row level security;
alter table public.vault_items enable row level security;
alter table public.network_connections enable row level security;
alter table public.invite_codes enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_history enable row level security;
alter table public.favors enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

-- profiles: any authenticated user can read (needed for partner names/avatars/leaderboard),
-- only the owner can write.
create policy "profiles readable by authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles updatable by owner" on public.profiles
  for update using (auth.uid() = id);

-- vault_items: owner only.
create policy "vault_items owner select" on public.vault_items
  for select using (auth.uid() = user_id);
create policy "vault_items owner insert" on public.vault_items
  for insert with check (auth.uid() = user_id);
create policy "vault_items owner update" on public.vault_items
  for update using (auth.uid() = user_id);
create policy "vault_items owner delete" on public.vault_items
  for delete using (auth.uid() = user_id);

-- network_connections: owner only (each side of a connection has its own row).
create policy "network owner select" on public.network_connections
  for select using (auth.uid() = user_id);
create policy "network owner insert" on public.network_connections
  for insert with check (auth.uid() = user_id);
create policy "network owner update" on public.network_connections
  for update using (auth.uid() = user_id);
create policy "network owner delete" on public.network_connections
  for delete using (auth.uid() = user_id);

-- invite_codes: inviter can read/manage their own code; any authenticated user can look up
-- a code by value to redeem it (needed for "Invite a Partner" real cross-device linking).
create policy "invite_codes inviter select" on public.invite_codes
  for select using (auth.role() = 'authenticated');
create policy "invite_codes inviter insert" on public.invite_codes
  for insert with check (auth.uid() = inviter_id);
create policy "invite_codes redeem update" on public.invite_codes
  for update using (auth.role() = 'authenticated' and redeemed_by is null)
  with check (redeemed_by = auth.uid());

-- contracts: readable/writable by proposer or partner only.
create policy "contracts party select" on public.contracts
  for select using (auth.uid() = proposer_id or auth.uid() = partner_id);
create policy "contracts party insert" on public.contracts
  for insert with check (auth.uid() = proposer_id);
create policy "contracts party update" on public.contracts
  for update using (auth.uid() = proposer_id or auth.uid() = partner_id);

-- contract_history: readable by either party of the parent contract; insertable by either party.
create policy "contract_history party select" on public.contract_history
  for select using (exists (
    select 1 from public.contracts c where c.id = contract_id
    and (c.proposer_id = auth.uid() or c.partner_id = auth.uid())
  ));
create policy "contract_history party insert" on public.contract_history
  for insert with check (auth.uid() = actor_id and exists (
    select 1 from public.contracts c where c.id = contract_id
    and (c.proposer_id = auth.uid() or c.partner_id = auth.uid())
  ));

-- favors: owner reads their own vault; either the owner or the person who owes it can insert.
create policy "favors owner select" on public.favors
  for select using (auth.uid() = owner_id or auth.uid() = from_user_id);
create policy "favors party insert" on public.favors
  for insert with check (auth.uid() = owner_id or auth.uid() = from_user_id);
create policy "favors owner update" on public.favors
  for update using (auth.uid() = owner_id);

-- notifications: owner only. Inserts happen via the contracts trigger below (security definer),
-- so no general insert policy is needed for normal users.
create policy "notifications owner select" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications owner update" on public.notifications
  for update using (auth.uid() = user_id);

-- push_subscriptions: owner only.
create policy "push_subscriptions owner select" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push_subscriptions owner insert" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push_subscriptions owner delete" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- Auto-create a profile (+ unique referral code) whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(md5(random()::text || new.id::text), 1, 6));
    exit when not exists (select 1 from public.invite_codes where code = candidate);
  end loop;

  insert into public.profiles (id, name, referral_code)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), candidate);

  insert into public.invite_codes (code, inviter_id) values (candidate, new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
