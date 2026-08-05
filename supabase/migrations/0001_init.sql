-- Hiring Examination Management System — initial schema
-- Mirrors the Firestore data model 1:1 as normalized Postgres tables.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles (staff accounts, one row per auth.users id)
-- ---------------------------------------------------------------------------
create table profiles (
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
-- categories
-- ---------------------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position_title text not null,
  department text not null,
  description text not null default '',
  passing_score int not null default 70 check (passing_score between 0 and 100),
  duration_minutes int not null default 30 check (duration_minutes > 0),
  maximum_attempts int not null default 1 check (maximum_attempts > 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'closed', 'archived')),
  opening_date timestamptz,
  closing_date timestamptz,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- exams (one primary exam per category in this MVP)
-- ---------------------------------------------------------------------------
create table exams (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories (id) on delete cascade,
  title text not null,
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

create unique index exams_one_per_category on exams (category_id);

-- ---------------------------------------------------------------------------
-- exam_questions
-- ---------------------------------------------------------------------------
create table exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams (id) on delete cascade,
  "order" int not null,
  question_text text not null default '',
  options jsonb not null default '[]'::jsonb,
  correct_option_id text not null default '',
  points int not null default 1,
  explanation text,
  is_required boolean not null default true
);

create index exam_questions_exam_id_idx on exam_questions (exam_id, "order");

-- ---------------------------------------------------------------------------
-- applicants
-- ---------------------------------------------------------------------------
create table applicants (
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

create index applicants_normalized_email_idx on applicants (normalized_email);
create index applicants_normalized_full_name_idx on applicants (normalized_full_name);

-- ---------------------------------------------------------------------------
-- exam_attempts
-- ---------------------------------------------------------------------------
create table exam_attempts (
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exam_attempts_category_idx on exam_attempts (category_id);
create index exam_attempts_exam_applicant_idx on exam_attempts (exam_id, applicant_id);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table audit_logs (
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
create table settings (
  id text primary key default 'general',
  organization_name text not null default '',
  show_correct_answers_to_applicants boolean not null default false,
  default_timezone text not null default 'Asia/Manila',
  updated_at timestamptz not null default now()
);

insert into settings (id) values ('general');
