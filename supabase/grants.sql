-- Quick fix for "403 permission denied for table ..." errors from PostgREST/supabase-js.
--
-- RLS policies only *filter rows* — Postgres also requires a plain GRANT before the
-- `authenticated` role (i.e. any signed-in user) can touch a table at all. If schema.sql
-- was applied directly through the SQL Editor rather than Supabase's usual migration path,
-- that baseline grant can be missing even though every RLS policy is correct, which is
-- exactly what a 403 on a simple `select ... from profiles where id = eq.<uuid>` means.
--
-- Safe to run any number of times.

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
