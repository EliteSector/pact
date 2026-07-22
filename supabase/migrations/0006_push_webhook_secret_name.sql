-- 0004 originally read a 'service_role_key' vault secret to authorize the webhook call.
-- Superseded: send-push now checks its own random PUSH_WEBHOOK_SECRET instead (deployed with
-- --no-verify-jwt), so the trigger only ever needs to know that secret, never the account's
-- real service role key.

create or replace function public.trigger_send_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  fn_url text;
  webhook_secret text;
begin
  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into webhook_secret from vault.decrypted_secrets where name = 'push_webhook_secret';

  if fn_url is null or webhook_secret is null then
    return new; -- Vault secrets not configured yet; skip push silently rather than erroring inserts.
  end if;

  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || webhook_secret),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;
