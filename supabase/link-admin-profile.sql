-- Links an existing Supabase Auth user to a `profiles` row with role = 'admin'.
--
-- Use this AFTER creating the user through Supabase's own Auth API — the
-- reliable way to do that without the CLI is:
--
--   Supabase Dashboard → Authentication → Users → Add user
--     Email:    admin@barbazampc.coop
--     Password: BmpcAdmin1964
--     Toggle "Auto Confirm User" ON, then Create user.
--
-- (This matters because Supabase Cloud's GoTrue service does extra internal
-- bookkeeping on user creation — hashing, identity records, etc. — that a
-- hand-written `insert into auth.users` can miss or get subtly wrong across
-- project/GoTrue versions, which is why the previous admin.sql approach
-- produced a user that couldn't actually log in. Creating the user through
-- the Dashboard/Auth API sidesteps that entirely.)
--
-- Once the user exists in Authentication → Users, run this file once (SQL
-- Editor or psql) to give it the admin role and an active profile.

do $$
declare
  target_user_id uuid;
  target_email text := 'admin@barbazampc.coop';
  target_first_name text := 'System';
  target_last_name text := 'Administrator';
begin
  select id into target_user_id from auth.users where email = target_email;

  if target_user_id is null then
    raise exception
      'No auth user found for %. Create it first via Dashboard → Authentication → Users → Add user.',
      target_email;
  end if;

  insert into public.profiles (id, first_name, last_name, email, role, is_active)
  values (target_user_id, target_first_name, target_last_name, target_email, 'admin', true)
  on conflict (id) do update
    set role = 'admin',
        is_active = true,
        first_name = excluded.first_name,
        last_name = excluded.last_name;
end $$;
