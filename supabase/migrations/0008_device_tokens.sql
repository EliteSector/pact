-- APNs device tokens for the native iOS build (pact-ios), parallel to the
-- existing Web Push `push_subscriptions` table used by the PWA. Same
-- notifications table and insert trigger (migration 0004/0006) feed both —
-- send-push (or a sibling function) needs a second code path to also POST to
-- Apple's APNs HTTP/2 API using these tokens. That requires real Apple
-- Developer credentials (a .p8 auth key, Key ID, Team ID) to sign the JWT
-- APNs requires, which aren't available in this environment — the client-side
-- registration/upload here is real and complete, but the server dispatch half
-- is not wired up yet. See pact-ios/PUSH_NOTES.md for exact next steps.

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null default 'ios' check (platform in ('ios')),
  created_at timestamptz not null default now()
);

alter table public.device_tokens enable row level security;

create policy "device_tokens owner select" on public.device_tokens
  for select using (auth.uid() = user_id);
create policy "device_tokens owner insert" on public.device_tokens
  for insert with check (auth.uid() = user_id);
create policy "device_tokens owner upsert" on public.device_tokens
  for update using (auth.uid() = user_id);
create policy "device_tokens owner delete" on public.device_tokens
  for delete using (auth.uid() = user_id);

create index device_tokens_user_id_idx on public.device_tokens(user_id);
