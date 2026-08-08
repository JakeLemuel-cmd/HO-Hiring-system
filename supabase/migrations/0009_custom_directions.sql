-- Lets each exam override the default DIRECTIONS line shown per question-type part
-- (e.g. "Part 1: Multiple Choice"). Keyed by question_type; a missing key falls back
-- to the app's built-in default text.

alter table exams add column if not exists custom_directions jsonb not null default '{}'::jsonb;
