-- Notification-generation triggers + realtime publication.
-- Contract model: proposer = the person making the promise, partner = the person the promise is
-- made to (judges completion, is owed the penalty favor on breach) — matches the nc wizard's
-- "Who's this between?" step (the creator picks a partner to promise something to).

alter table public.contracts add column if not exists pending_edit_requested_by uuid references public.profiles(id);

create or replace function public.other_party(c public.contracts, actor uuid)
returns uuid language sql immutable as $$
  select case when actor = c.proposer_id then c.partner_id else c.proposer_id end;
$$;

create or replace function public.notify_contract_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare proposer_name text;
begin
  if new.status = 'proposed' then
    select name into proposer_name from public.profiles where id = new.proposer_id;
    insert into public.notifications (user_id, type, title, body, contract_id)
    values (new.partner_id, 'contract_proposed',
      coalesce(nullif(proposer_name,''), 'Someone') || ' proposed a contract!',
      '"' || new.title || '" — tap to review terms.', new.id);
  end if;
  return new;
end;
$$;

create trigger contracts_after_insert
  after insert on public.contracts
  for each row execute function public.notify_contract_insert();

create or replace function public.notify_contract_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  recipient uuid;
  actor_name text;
begin
  if new.status = old.status and new.pending_edit_title is not distinct from old.pending_edit_title then
    return new;
  end if;

  recipient := public.other_party(new, coalesce(actor, new.proposer_id));
  select name into actor_name from public.profiles where id = coalesce(actor, new.proposer_id);
  actor_name := coalesce(nullif(actor_name,''), 'Your partner');

  if new.status = 'countered' and old.status is distinct from 'countered' then
    insert into public.notifications (user_id, type, title, body, contract_id)
    values (recipient, 'contract_countered', 'Counter-offer received',
      actor_name || ' proposed changes to "' || new.title || '".', new.id);

  elsif new.status = 'active' and old.status in ('proposed','countered') then
    insert into public.notifications (user_id, type, title, body, contract_id)
    values (recipient, 'contract_active', 'Contract is live',
      actor_name || ' accepted "' || new.title || '". Good luck.', new.id);

  elsif new.status = 'pending_confirm' and old.status is distinct from 'pending_confirm' then
    insert into public.notifications (user_id, type, title, body, contract_id)
    values (recipient, 'contract_proof', 'Proof submitted',
      actor_name || ' submitted proof for "' || new.title || '". Confirm or dispute it.', new.id);

  elsif new.status = 'kept' and old.status is distinct from 'kept' then
    insert into public.notifications (user_id, type, title, body, contract_id)
    values (recipient, 'contract_kept', 'Contract kept!',
      'You completed "' || new.title || '" — +' || new.points || ' pts.', new.id);

  elsif new.status = 'breached' and old.status is distinct from 'breached' then
    insert into public.notifications (user_id, type, title, body, contract_id)
    values (recipient, 'contract_breached', 'Contract breached',
      '"' || new.title || '" wasn''t completed — ' ||
      (select name from public.profiles where id = new.partner_id) || ' is owed a favor.', new.id);

  elsif new.status = 'disputed' and old.status is distinct from 'disputed' then
    insert into public.notifications (user_id, type, title, body, contract_id)
    values (recipient, 'contract_disputed', 'Dispute under review',
      actor_name || ' disputed the ruling on "' || new.title || '".', new.id);

  elsif new.status = 'canceled' and old.status is distinct from 'canceled' then
    insert into public.notifications (user_id, type, title, body, contract_id)
    values (recipient, 'contract_canceled', 'Contract canceled',
      '"' || new.title || '" was voided by ' || actor_name || '.', new.id);

  elsif new.status = 'pending_edit' and old.status is distinct from 'pending_edit' then
    new.pending_edit_requested_by := actor;
    insert into public.notifications (user_id, type, title, body, contract_id)
    values (recipient, 'contract_edit_requested', 'Change requested',
      actor_name || ' wants to change "' || new.title || '".', new.id);

  elsif old.status = 'pending_edit' and new.status = 'active' then
    insert into public.notifications (user_id, type, title, body, contract_id)
    values (coalesce(old.pending_edit_requested_by, recipient), 'contract_edit_resolved',
      case when new.title = old.pending_edit_title then 'Change approved' else 'Change rejected' end,
      '"' || old.title || '"', new.id);
    new.pending_edit_requested_by := null;
  end if;

  return new;
end;
$$;

drop trigger if exists contracts_after_update on public.contracts;
create trigger contracts_before_update
  before update on public.contracts
  for each row execute function public.notify_contract_update();

create or replace function public.notify_favor_redeemed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'redeemed' and old.status is distinct from 'redeemed' and new.from_user_id is not null then
    insert into public.notifications (user_id, type, title, body)
    values (new.from_user_id, 'favor_redeemed', 'Favor claimed',
      (select name from public.profiles where id = new.owner_id) || ' claimed: "' || new.text || '"');
  end if;
  return new;
end;
$$;

create trigger favors_before_update
  before update on public.favors
  for each row execute function public.notify_favor_redeemed();

-- Realtime: both phones reflect contract/favor/notification/history changes live.
alter publication supabase_realtime add table public.contracts;
alter publication supabase_realtime add table public.contract_history;
alter publication supabase_realtime add table public.favors;
alter publication supabase_realtime add table public.notifications;
