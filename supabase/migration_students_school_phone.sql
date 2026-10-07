-- Run in Supabase SQL Editor after the main schema.
-- Adds school name and phone for students.

alter table public.students add column if not exists school_name text not null default '';
alter table public.students add column if not exists phone text not null default '';
