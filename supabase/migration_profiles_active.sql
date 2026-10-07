-- Soft-deactivate staff/managers instead of deleting profiles.
-- Keeps attendance "marked by" history and frees UI lists of inactive accounts.

alter table public.profiles
  add column if not exists active boolean not null default true;

create index if not exists profiles_active_idx on public.profiles (active);
