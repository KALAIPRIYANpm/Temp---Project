-- Address + NA defaults for gender and medium.
-- Run in Supabase SQL Editor.

alter table public.students
  add column if not exists address text not null default '';

alter table public.students drop constraint if exists students_gender_check;
alter table public.students
  add constraint students_gender_check
  check (gender in ('male', 'female', 'other', 'na'));

alter table public.students drop constraint if exists students_medium_check;
alter table public.students
  add constraint students_medium_check
  check (medium in ('english', 'kannada', 'marathi', 'na'));

-- Default new rows to NA (change per student later in the app).
alter table public.students alter column gender set default 'na';
alter table public.students alter column medium set default 'na';

-- Set all existing students to NA for now.
update public.students set gender = 'na';
update public.students set medium = 'na';
