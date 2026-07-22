-- Database webhook: fire the send-push Edge Function whenever a notification is inserted.
-- Reads the function URL + service role key from Supabase Vault (populated once at deploy
-- time via a one-off, un-committed command — see README.md "Deploy") so no secret ever
-- lands in this file or in git history.

create extension if not exists pg_net;
create extension if not exists supabase_vault;

create or replace function public.trigger_send_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  fn_url text;
  svc_key text;
begin
  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into svc_key from vault.decrypted_secrets where name = 'service_role_key';

  if fn_url is null or svc_key is null then
    return new; -- Vault secrets not configured yet; skip push silently rather than erroring inserts.
  end if;

  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || svc_key),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;

create trigger notifications_after_insert_push
  after insert on public.notifications
  for each row execute function public.trigger_send_push();
