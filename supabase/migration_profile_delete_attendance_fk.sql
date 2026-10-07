-- Superseded: prefer soft-deactivate via migration_profiles_active.sql
-- so attendance "marked by" keeps the profile reference.
-- This file is kept only if you already hard-delete profiles and need FK safety.

alter table public.attendance
  alter column manager_id drop not null;

alter table public.attendance
  drop constraint if exists attendance_manager_id_fkey;

alter table public.attendance
  add constraint attendance_manager_id_fkey
  foreign key (manager_id) references public.profiles (id)
  on delete set null;
