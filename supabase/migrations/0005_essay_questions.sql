-- Adds an "essay" question type: a free-text response that is NOT auto-graded.
-- When an exam contains essay questions, submission scores only the auto-gradable
-- questions and marks the attempt as needing manual review; staff then enter a
-- per-question score (0..points) which finalizes earned_points/percentage/result.

alter table exam_questions
  drop constraint exam_questions_question_type_check,
  add constraint exam_questions_question_type_check
    check (question_type in ('multiple_choice', 'true_false', 'fill_blank', 'essay'));

alter table exam_attempts
  add column if not exists needs_review boolean not null default false,
  add column if not exists essay_scores jsonb not null default '{}'::jsonb;
