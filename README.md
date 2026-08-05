# Hiring Examination Management System

A production-ready MVP for managing hiring examinations: create hiring categories, build 10-question
multiple-choice exams, publish a Google Forms–style public link, let applicants register and take the
exam under a server-authoritative timer, score securely in an Edge Function, and generate individual
and consolidated PDF reports.

Built from `md/MasterPrompt.md`, with the public link and availability behavior from
`md/Updated Public Examination Link.md` merged into the examination model (`availabilityStatus`,
`publicCode`/`publicUrl`, scheduling, close/reopen, and the server-side timer).

## Tech Stack

- React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- React Router, React Hook Form + Zod, TanStack Table
- Supabase: Postgres (with Row Level Security), Auth, Edge Functions, Realtime
- jsPDF + qrcode for result PDFs and the examination QR code
- Vitest for unit tests

## Project Structure

```
src/
  app entry: main.tsx, App.tsx
  components/ui          shadcn/ui primitives
  components/common      reusable product components (StatCard, EmptyState, StatusBadge, ConfirmDialog, ...)
  components/tables       DataTable (TanStack Table)
  features/auth          AuthContext (Supabase Auth), role helpers
  features/exams          Examination builder + publish/close/reopen + sharing panel
  features/applicants    Applicants and Results tabs
  features/categories     Category settings tab
  layouts/AppLayout       Sidebar + header shell
  lib/                    supabase.ts (client + invokeFunction), validation.ts (Zod), pdf.ts, permissions.ts, scoring.ts
  pages/auth              Login, Forgot Password
  pages/admin             Dashboard, Categories, Category Detail (tabs), Users, Settings, Audit Logs,
                          Applicant Search, Applicant Profile
  pages/public             Exam Register, Instructions, Take (timer), Result (auto PDF download)
  services/                Supabase table + Edge Function wrappers
  types/                   Shared TypeScript interfaces (camelCase; mapped from Postgres snake_case rows)

supabase/
  migrations/0001_init.sql   Schema: profiles, categories, exams, exam_questions, applicants,
                              exam_attempts, audit_logs, settings
  migrations/0002_rls.sql    Row Level Security policies
  functions/
    _shared/client.ts         Service-role client, staff-auth helpers, small utilities
    get-public-exam-information/  Public exam metadata for the registration page
    start-exam-attempt/           Applicant registration + duplicate/attempt-limit checks + attempt creation
    save-exam-answers/            Autosave, rejects writes after expiry
    submit-exam-attempt/          Server-side scoring (correct answers never leave this function)
    get-sanitized-exam-questions/ Questions without correctOptionId
    get-attempt-state/            Resume state (expiresAt, saved answers) for the exam-taking page
    get-attempt-result/           Result-page data (attempt + applicant + category + exam)
    close-exam/, reopen-exam/     Staff-authenticated exam availability changes (parity endpoints)
    create-staff-user/            Admin-only staff account creation
```

## Key Security Decisions

- Correct answers (`correct_option_id`) never leave the `exam_questions` table to applicants. The
  public exam flow only ever receives sanitized question data, returned by the `start-exam-attempt`
  and `get-sanitized-exam-questions` Edge Functions.
- **Applicants have no Supabase Auth session and no direct table access at all.** RLS policies on
  `applicants` and `exam_attempts` only grant `select` to staff — there is no `insert`/`update` policy
  for any role. Every applicant-facing read or write (register, autosave, submit, view result) goes
  through an Edge Function using the service role key, which bypasses RLS and returns only sanitized
  JSON. This mirrors the original Firebase design (Cloud Functions + Firestore rules) 1:1.
- Scoring happens exclusively inside `submit-exam-attempt` using the service-role client.
- `expires_at` is computed server-side when the attempt is created; the frontend countdown
  (`ExamTakePage.tsx`) is display-only and cannot grant extra time — `submit-exam-attempt` re-checks
  expiration and stamps `submissionReason: "time_expired"` when appropriate.
- Duplicate attempts are prevented in `start-exam-attempt` by re-checking the attempt count for the
  applicant immediately before insert, keyed on normalized email + exam id, respecting `maximumAttempts`.
- Staff-only tables (`categories`, `exams`, `exam_questions`) are governed by `is_staff()` /
  `is_admin()` SQL helper functions checked against the `profiles` table — the same distinction the
  UI enforces via `RoleGuard`.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at https://supabase.com/dashboard, then link it locally:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   ```

3. **Apply the database schema and RLS policies**

   ```bash
   npx supabase db push
   ```

   Alternatively, paste `supabase/schema.sql` (the migrations combined into one file) into the
   Supabase Dashboard → SQL Editor and run it directly.

4. **Deploy the Edge Functions**

   ```bash
   npx supabase functions deploy
   ```

5. **Configure environment variables** — fill in `.env` with your Supabase project URL, anon key, and
   the public URL your exam links should use (`Supabase Dashboard → Project Settings → API`).

6. **Bootstrap the first administrator.** `create-staff-user` requires an existing admin caller, so
   the very first admin has to be created another way:
   1. Supabase Dashboard → Authentication → Users → **Add user** — set the email/password, toggle
      **Auto Confirm User** on, then create it. (Creating the user this way, through Supabase's own
      Auth API, is what actually works reliably — a hand-written `insert into auth.users` can produce
      a row that looks right but fails to log in, since Supabase Cloud's Auth service does extra
      internal bookkeeping on user creation that raw SQL doesn't replicate.)
   2. Run `supabase/link-admin-profile.sql` once (SQL Editor or `psql`) to give that user a `profiles`
      row with `role = 'admin'`.

7. **Run the app locally**

   ```bash
   npm run dev
   ```

   To develop against local Postgres + Edge Functions instead of a hosted project:

   ```bash
   npx supabase start
   npx supabase functions serve
   ```

## Testing

```bash
npm run test
```

Covers Zod validation rules (category, question, publish-exam, applicant registration) and the
pass/fail percentage calculation mirrored from the `submit-exam-attempt` Edge Function scorer.

## Deployment

```bash
npm run build
npx supabase db push
npx supabase functions deploy
```

Deploy the built `dist/` folder to your static host of choice (Vercel, Netlify, Supabase Hosting via a
CDN, etc). Set `VITE_PUBLIC_APP_URL` to your production domain before building, so generated
examination links (`https://your-domain.com/exam/CATEGORY-CODE`) resolve correctly.

## Workflow Covered

1. Staff signs in → creates a hiring category (dashboard starts at all zeros).
2. Staff opens the Examination tab, adds exactly 10 questions, and publishes.
3. Publishing generates a unique `publicCode` / `publicUrl` and a sharing panel with Copy Link, Open
   Link, and a downloadable QR code.
4. An applicant opens the link (no login), fills in name/contact/email, accepts consent, and starts —
   the timer begins only once `start-exam-attempt` creates the row and stamps `started_at`/`expires_at`.
5. The applicant answers all 10 questions (answers autosave); on submit or timer expiry,
   `submit-exam-attempt` scores server-side and returns pass/fail + percentage.
6. The result page auto-downloads a PDF (with QR verification code) and offers a manual download button.
7. Staff can close the exam (public link stays valid, no new registrations) and reopen it later without
   generating a new link; all prior results remain visible in the Applicants/Results tabs.
8. Staff can search applicants globally and view a consolidated PDF across every category they applied to.
