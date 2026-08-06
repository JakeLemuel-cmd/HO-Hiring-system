-- Examinee numbers were random 5-char codes (e.g. "K7QXM"). Switch to a sequential,
-- human-readable format: EX-000001, EX-000002, ...

create sequence if not exists exam_attempt_reference_seq;

create or replace function next_examinee_number()
returns text
language sql
as $$
  select 'EX-' || lpad(nextval('exam_attempt_reference_seq')::text, 6, '0');
$$;
