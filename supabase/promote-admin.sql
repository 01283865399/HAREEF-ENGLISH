-- Run manually in the Supabase SQL Editor after verifying ownership of this account.
-- This is intentionally separate from schema.sql so public registration cannot
-- race an automatic administrator promotion during schema setup.
do $$
declare
  verified_admin_id uuid;
begin
  select u.id
  into verified_admin_id
  from auth.users u
  where lower(u.email) = lower('dyba8561@gmail.com')
    and u.email_confirmed_at is not null;

  if verified_admin_id is null then
    raise exception 'The administrator account must exist and have a confirmed email before promotion.';
  end if;

  update public.profiles p
  set role = 'admin'
  where p.id = verified_admin_id;

  if not found then
    raise exception 'The administrator profile was not found. Run schema.sql and retry.';
  end if;
end;
$$;
