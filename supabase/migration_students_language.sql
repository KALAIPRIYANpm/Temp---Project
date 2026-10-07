-- Language as free-text on students (no enum check).
-- Run in Supabase SQL Editor if not already applied.

alter table public.students
  add column if not exists language text not null default '';

alter table public.students drop constraint if exists students_language_check;

-- Prefer empty string over legacy 'na' default when present.
alter table public.students alter column language set default '';
update public.students set language = '' where language = 'na';
