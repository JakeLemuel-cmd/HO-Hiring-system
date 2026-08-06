-- Hiring Examination Management System — consolidated schema
--
-- This file is the combined output of supabase/migrations/0001_init.sql and
-- 0002_rls.sql, kept here for convenience (e.g. pasting into the Supabase SQL
-- Editor in one shot, or reviewing the whole data model at a glance).
--
-- Safe to run more than once: tables/indexes use IF NOT EXISTS, the settings
-- seed row uses ON CONFLICT DO NOTHING, and policies are dropped and
-- recreated so re-running this file after an edit won't error.
--
-- The migrations directory is the source of truth for `supabase db push` /
-- `supabase migration up` — if you change the schema, edit the migrations and
-- regenerate this file, don't hand-edit both independently.

-- =============================================================================
-- Tables
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles (staff accounts, one row per auth.users id)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  role text not null check (role in ('admin', 'talent_acquisition')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and is_active = true and role in ('admin', 'talent_acquisition')
  );
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and is_active = true and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- categories — a pure department-level grouping; position-specific detail
-- (title, position, department, passing score, duration, max attempts) lives on
-- each of its exam sets, since one category can hire for multiple roles at once.
-- ---------------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed', 'archived')),
  opening_date timestamptz,
  closing_date timestamptz,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- exams (a category may have multiple exams/"sets", each for a different role)
-- ---------------------------------------------------------------------------
create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories (id) on delete cascade,
  title text not null,
  position_title text not null default '',
  department text not null default '',
  instructions text not null default '',
  public_code text unique,
  public_slug text,
  public_url text,
  question_count int not null default 0,
  total_points int not null default 0,
  passing_score int not null default 70,
  availability_status text not null default 'draft'
    check (availability_status in ('draft', 'open', 'closed', 'scheduled', 'expired', 'archived')),
  has_time_limit boolean not null default true,
  duration_minutes int default 30,
  opening_date timestamptz,
  closing_date timestamptz,
  timezone text not null default 'Asia/Manila',
  maximum_attempts int not null default 1,
  close_exam_behavior text not null default 'allow_active_attempts_to_finish'
    check (close_exam_behavior in ('allow_active_attempts_to_finish', 'submit_active_attempts_immediately')),
  closed_at timestamptz,
  closed_by uuid references profiles (id),
  closing_reason text,
  published_at timestamptz,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- exam_questions
-- ---------------------------------------------------------------------------
create table if not exists exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams (id) on delete cascade,
  "order" int not null,
  question_text text not null default '',
  options jsonb not null default '[]'::jsonb,
  correct_option_id text not null default '',
  question_type text not null default 'multiple_choice'
    check (question_type in ('multiple_choice', 'true_false', 'fill_blank', 'essay')),
  correct_answer_text text not null default '',
  points int not null default 1,
  explanation text,
  is_required boolean not null default true
);

create index if not exists exam_questions_exam_id_idx on exam_questions (exam_id, "order");

-- ---------------------------------------------------------------------------
-- applicants
-- ---------------------------------------------------------------------------
create table if not exists applicants (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  middle_name text,
  last_name text not null,
  normalized_full_name text not null,
  email text not null,
  normalized_email text not null,
  mobile_number text not null,
  applicant_reference_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applicants_normalized_email_idx on applicants (normalized_email);
create index if not exists applicants_normalized_full_name_idx on applicants (normalized_full_name);

-- ---------------------------------------------------------------------------
-- exam_attempts
-- ---------------------------------------------------------------------------
create table if not exists exam_attempts (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants (id) on delete cascade,
  category_id uuid not null references categories (id) on delete cascade,
  exam_id uuid not null references exams (id) on delete cascade,
  attempt_number int not null default 1,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed', 'expired', 'disqualified')),
  started_at timestamptz,
  expires_at timestamptz,
  submitted_at timestamptz,
  duration_seconds int,
  earned_points int,
  total_points int,
  percentage int,
  result text check (result in ('passed', 'failed')),
  result_reference_number text,
  submission_reason text check (submission_reason in ('applicant_submitted', 'time_expired', 'exam_closed_by_staff')),
  answers jsonb not null default '{}'::jsonb,
  needs_review boolean not null default false,
  essay_scores jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exam_attempts_category_idx on exam_attempts (category_id);
create index if not exists exam_attempts_exam_applicant_idx on exam_attempts (exam_id, applicant_id);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id),
  user_name text,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  description text not null,
  category_id uuid,
  exam_id uuid,
  applicant_id uuid,
  attempt_id uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- settings (single row, id = 'general')
-- ---------------------------------------------------------------------------
create table if not exists settings (
  id text primary key default 'general',
  organization_name text not null default '',
  show_correct_answers_to_applicants boolean not null default false,
  default_timezone text not null default 'Asia/Manila',
  updated_at timestamptz not null default now()
);

insert into settings (id) values ('general') on conflict (id) do nothing;

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Mirrors the intent of the project's previous firestore.rules: staff (admin /
-- talent_acquisition) can read/manage operational data; applicants have NO
-- direct table access at all. Every applicant-facing read/write goes through a
-- Supabase Edge Function using the service role key, which bypasses RLS
-- entirely and returns only sanitized data (never correct_option_id, never
-- other applicants' records).

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
drop policy if exists "profiles_select_self_or_staff" on profiles;
create policy "profiles_select_self_or_staff" on profiles
  for select using (auth.uid() = id or is_staff());
drop policy if exists "profiles_write_admin_only" on profiles;
create policy "profiles_write_admin_only" on profiles
  for all using (is_admin()) with check (is_admin());

-- categories: staff can read/write; nothing is public.
drop policy if exists "categories_select_staff" on categories;
create policy "categories_select_staff" on categories for select using (is_staff());
drop policy if exists "categories_insert_staff" on categories;
create policy "categories_insert_staff" on categories for insert with check (is_staff());
drop policy if exists "categories_update_staff" on categories;
create policy "categories_update_staff" on categories for update using (is_staff()) with check (is_staff());
drop policy if exists "categories_delete_admin" on categories;
create policy "categories_delete_admin" on categories for delete using (is_admin());

-- exams: staff can read/write; the public examination page never queries this table
-- directly — it calls the get-public-exam-information Edge Function instead.
drop policy if exists "exams_select_staff" on exams;
create policy "exams_select_staff" on exams for select using (is_staff());
drop policy if exists "exams_write_staff" on exams;
create policy "exams_write_staff" on exams for all using (is_staff()) with check (is_staff());

-- exam_questions: staff only. Contains correct_option_id — must never be exposed to
-- the anon/public role. Applicants receive sanitized questions only via the
-- get-sanitized-exam-questions Edge Function.
drop policy if exists "exam_questions_select_staff" on exam_questions;
create policy "exam_questions_select_staff" on exam_questions for select using (is_staff());
drop policy if exists "exam_questions_write_staff" on exam_questions;
create policy "exam_questions_write_staff" on exam_questions for all using (is_staff()) with check (is_staff());

-- applicants: staff can read (for search/history); no direct client writes at all —
-- applicant records are created only by the register-and-start-attempt Edge Function
-- via the service role key.
drop policy if exists "applicants_select_staff" on applicants;
create policy "applicants_select_staff" on applicants for select using (is_staff());

-- exam_attempts: staff can read (for dashboards/results); no direct client writes —
-- attempt creation, answer autosave, and scoring all happen inside Edge Functions so
-- an applicant can never forge a score or read another applicant's attempt.
drop policy if exists "exam_attempts_select_staff" on exam_attempts;
create policy "exam_attempts_select_staff" on exam_attempts for select using (is_staff());

-- audit_logs: append-only. Staff can insert entries attributed to themselves (category/exam
-- management happens directly from the client); applicant-triggered entries (registration,
-- attempt started/submitted) are inserted by Edge Functions via the service role key, which
-- bypasses RLS. No update/delete policy exists for any role, so entries can never be altered.
drop policy if exists "audit_logs_select_admin" on audit_logs;
create policy "audit_logs_select_admin" on audit_logs for select using (is_admin());
drop policy if exists "audit_logs_insert_staff" on audit_logs;
create policy "audit_logs_insert_staff" on audit_logs
  for insert with check (is_staff() and (user_id is null or user_id = auth.uid()));

-- settings: staff can read; only admins can write.
drop policy if exists "settings_select_staff" on settings;
create policy "settings_select_staff" on settings for select using (is_staff());
drop policy if exists "settings_write_admin" on settings;
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
