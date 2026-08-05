-- Row Level Security — mirrors the intent of the previous firestore.rules:
-- staff (admin / talent_acquisition) can read/manage operational data; applicants have
-- NO direct table access at all. Every applicant-facing read/write goes through a
-- Supabase Edge Function using the service role key, which bypasses RLS entirely and
-- returns only sanitized data (never correct_option_id, never other applicants' records).

alter table profiles enable row level security;
alter table categories enable row level security;
alter table exams enable row level security;
alter table exam_questions enable row level security;
alter table applicants enable row level security;
alter table exam_attempts enable row level security;
alter table audit_logs enable row level security;
alter table settings enable row level security;

-- profiles: staff can read all profiles; only admins can write; a user can always read their own row
-- (needed so the client can resolve its own role right after sign-in).
create policy "profiles_select_self_or_staff" on profiles
  for select using (auth.uid() = id or is_staff());
create policy "profiles_write_admin_only" on profiles
  for all using (is_admin()) with check (is_admin());

-- categories: staff can read/write; nothing is public.
create policy "categories_select_staff" on categories for select using (is_staff());
create policy "categories_insert_staff" on categories for insert with check (is_staff());
create policy "categories_update_staff" on categories for update using (is_staff()) with check (is_staff());
create policy "categories_delete_admin" on categories for delete using (is_admin());

-- exams: staff can read/write; the public examination page never queries this table
-- directly — it calls the get-public-exam-information Edge Function instead.
create policy "exams_select_staff" on exams for select using (is_staff());
create policy "exams_write_staff" on exams for all using (is_staff()) with check (is_staff());

-- exam_questions: staff only. Contains correct_option_id — must never be exposed to
-- the anon/public role. Applicants receive sanitized questions only via the
-- get-sanitized-exam-questions Edge Function.
create policy "exam_questions_select_staff" on exam_questions for select using (is_staff());
create policy "exam_questions_write_staff" on exam_questions for all using (is_staff()) with check (is_staff());

-- applicants: staff can read (for search/history); no direct client writes at all —
-- applicant records are created only by the register-and-start-attempt Edge Function
-- via the service role key.
create policy "applicants_select_staff" on applicants for select using (is_staff());

-- exam_attempts: staff can read (for dashboards/results); no direct client writes —
-- attempt creation, answer autosave, and scoring all happen inside Edge Functions so
-- an applicant can never forge a score or read another applicant's attempt.
create policy "exam_attempts_select_staff" on exam_attempts for select using (is_staff());

-- audit_logs: append-only. Staff can insert entries attributed to themselves (category/exam
-- management happens directly from the client); applicant-triggered entries (registration,
-- attempt started/submitted) are inserted by Edge Functions via the service role key, which
-- bypasses RLS. No update/delete policy exists for any role, so entries can never be altered.
create policy "audit_logs_select_admin" on audit_logs for select using (is_admin());
create policy "audit_logs_insert_staff" on audit_logs
  for insert with check (is_staff() and (user_id is null or user_id = auth.uid()));

-- settings: staff can read; only admins can write.
create policy "settings_select_staff" on settings for select using (is_staff());
create policy "settings_write_admin" on settings for update using (is_admin()) with check (is_admin());

-- =============================================================================
-- Base table grants
-- =============================================================================
-- RLS policies only *filter rows* — PostgREST also needs the plain SQL GRANT before it
-- will let the `authenticated` role touch these tables at all (otherwise every request
-- fails with 403 "permission denied for table ...", independent of any RLS policy).
-- Supabase Cloud normally pre-configures this automatically, but it's declared here
-- explicitly so this schema behaves the same regardless of how/where it's applied.
-- `anon` gets nothing: unauthenticated applicants never call these tables directly —
-- every applicant-facing read/write goes through an Edge Function using service_role,
-- which bypasses RLS and grants entirely.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
