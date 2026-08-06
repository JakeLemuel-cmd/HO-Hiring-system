-- Deleting a category should remove it and its exam sets (existing ON DELETE CASCADE from
-- exams.category_id is correct and unchanged), but must NOT delete applicant exam_attempts —
-- those are historical records (results) that must survive the category/exam being deleted.
--
-- Snapshot columns preserve the category/exam/position label on each attempt at the time it was
-- taken, so results still display meaningfully after the source category or exam is gone.

alter table exam_attempts
  add column if not exists category_name text,
  add column if not exists exam_title text,
  add column if not exists position_title text;

update exam_attempts a
set
  category_name = c.name,
  exam_title = e.title,
  position_title = e.position_title
from categories c, exams e
where a.category_id = c.id and a.exam_id = e.id
  and (a.category_name is null or a.exam_title is null or a.position_title is null);

alter table exam_attempts
  drop constraint exam_attempts_category_id_fkey,
  drop constraint exam_attempts_exam_id_fkey,
  alter column category_id drop not null,
  alter column exam_id drop not null,
  add constraint exam_attempts_category_id_fkey foreign key (category_id) references categories (id) on delete set null,
  add constraint exam_attempts_exam_id_fkey foreign key (exam_id) references exams (id) on delete set null;
