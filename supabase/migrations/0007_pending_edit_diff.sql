-- Diff-summary reviews: Change Requests now carry a real per-field diff instead of a flat
-- pendingEditTitle string, matching the July 22 Pact.dc.html update.

alter table public.contracts add column if not exists pending_edit jsonb;
alter table public.contracts add column if not exists penalty_vault_item_id uuid references public.vault_items(id) on delete set null;
alter table public.contracts drop column if exists pending_edit_title;

-- The approved-vs-rejected notification text used to compare new.title against the old flat
-- pending_edit_title column; now that the title only changes on approval (rejectEdit never
-- touches title/deadline/penalty), comparing new vs old directly is simpler and doesn't need
-- the jsonb payload at all.
create or replace function public.notify_contract_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  recipient uuid;
  actor_name text;
begin
  if new.status = old.status and new.pending_edit is not distinct from old.pending_edit then
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
      case when new.title is distinct from old.title
             or new.deadline is distinct from old.deadline
             or new.penalty_favor_text is distinct from old.penalty_favor_text
           then 'Change approved' else 'Change rejected' end,
      '"' || old.title || '"', new.id);
    new.pending_edit_requested_by := null;
  end if;

  return new;
end;
$$;
