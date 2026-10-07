-- Run in Supabase SQL Editor after the main schema.
-- Adds branch location and contact fields.

alter table public.branches add column if not exists branch_name text not null default '';
alter table public.branches add column if not exists city text not null default '';
alter table public.branches add column if not exists country text not null default '';
alter table public.branches add column if not exists address text not null default '';
alter table public.branches add column if not exists map_location text not null default '';
alter table public.branches add column if not exists contact1_name text not null default '';
alter table public.branches add column if not exists contact1_phone text not null default '';
alter table public.branches add column if not exists contact2_name text not null default '';
alter table public.branches add column if not exists contact2_phone text not null default '';

-- Copy legacy single-line location into address when empty
update public.branches
set address = location
where address = '' and coalesce(location, '') <> '';
