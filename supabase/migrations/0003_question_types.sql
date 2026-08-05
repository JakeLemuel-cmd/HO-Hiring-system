-- Adds support for multiple question types (multiple choice, true/false, fill in the blank)
-- to the dynamic exam builder. correct_option_id remains the answer key for option-based
-- questions (multiple_choice, true_false); correct_answer_text is the answer key for
-- fill_blank questions, matched case-insensitively at grading time.

alter table exam_questions
  add column if not exists question_type text not null default 'multiple_choice'
    check (question_type in ('multiple_choice', 'true_false', 'fill_blank')),
  add column if not exists correct_answer_text text not null default '';
