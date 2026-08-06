-- A category is now a pure department-level grouping (name + status only); position-specific
-- detail (position title, department, passing score, duration, max attempts) moves onto each
-- exam set, since one category/department can hire for multiple roles, each with its own exam.

alter table exams
  add column if not exists position_title text not null default '',
  add column if not exists department text not null default '';

-- Backfill every existing exam set with its category's current values before the category
-- columns are dropped, so no data is lost.
update exams e
set
  position_title = c.position_title,
  department = c.department,
  passing_score = c.passing_score,
  duration_minutes = c.duration_minutes,
  maximum_attempts = c.maximum_attempts
from categories c
where e.category_id = c.id;

alter table categories
  drop column if exists position_title,
  drop column if exists department,
  drop column if exists description,
  drop column if exists passing_score,
  drop column if exists duration_minutes,
  drop column if exists maximum_attempts;
