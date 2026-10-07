-- Unique roll number across all students (run in Supabase SQL Editor).
-- Resolve duplicate roll numbers before applying if the index creation fails.

create unique index if not exists students_roll_number_unique_idx
  on public.students (roll_number);
