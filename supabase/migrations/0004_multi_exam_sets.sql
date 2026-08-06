-- Allows a hiring category to have more than one exam ("set"), e.g. Set A / Set B,
-- each independently built, published, and linked. Previously a unique index on
-- exams.category_id capped every category to a single exam row.

drop index if exists exams_one_per_category;
