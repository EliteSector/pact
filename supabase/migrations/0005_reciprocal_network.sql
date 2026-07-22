-- When someone redeems an invite code, they insert their own network_connections row
-- (RLS only lets you insert rows you own). This trigger creates the mirror-image row for
-- the inviter server-side so both accounts show up in each other's Network/leaderboard —
-- the "resolve to a real second account" requirement from the handoff README.

create or replace function public.mirror_network_connection()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  reverse_exists boolean;
  my_name text;
begin
  if new.status = 'joined' and new.contact_user_id is not null then
    select exists(
      select 1 from public.network_connections
      where user_id = new.contact_user_id and contact_user_id = new.user_id
    ) into reverse_exists;

    if not reverse_exists then
      select name into my_name from public.profiles where id = new.user_id;
      insert into public.network_connections (user_id, contact_user_id, contact_name, status)
      values (new.contact_user_id, new.user_id, coalesce(nullif(my_name,''), 'New contact'), 'joined');
    end if;
  end if;
  return new;
end;
$$;

create trigger network_connections_mirror
  after insert on public.network_connections
  for each row execute function public.mirror_network_connection();
