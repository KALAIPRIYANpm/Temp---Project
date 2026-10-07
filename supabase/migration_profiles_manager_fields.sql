-- Run in Supabase SQL Editor after the main schema.
-- Adds phone, photo, and address for manager profiles.

alter table public.profiles add column if not exists phone text not null default '';
alter table public.profiles add column if not exists photo_url text;
alter table public.profiles add column if not exists address text not null default '';
