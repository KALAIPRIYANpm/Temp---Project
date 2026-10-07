-- Harimandir Balopasana — run in Supabase SQL Editor (Dashboard → SQL → New query)

-- Extensions
create extension if not exists "pgcrypto";

-- Branches (must exist before profiles.branch_id)
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  branch_name text not null default '',
  city text not null default '',
  country text not null default '',
  address text not null default '',
  map_location text not null default '',
  contact1_name text not null default '',
  contact1_phone text not null default '',
  contact2_name text not null default '',
  contact2_phone text not null default '',
  created_at timestamptz not null default now()
);

-- Profiles (linked to Supabase Auth users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  role text not null check (role in ('admin', 'manager', 'user')),
  branch_id uuid references public.branches (id) on delete set null,
  phone text not null default '',
  photo_url text,
  address text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Students
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  name text not null,
  roll_number text not null,
  class text not null,
  gender text not null default 'na' check (gender in ('male', 'female', 'other', 'na')),
  medium text not null default 'na' check (medium in ('english', 'kannada', 'marathi', 'na')),
  language text not null default '',
  school_name text not null default '',
  phone text not null default '',
  address text not null default '',
  photo_url text,
  qr_token text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists students_branch_id_idx on public.students (branch_id);
create unique index if not exists students_roll_number_unique_idx on public.students (roll_number);
create index if not exists students_qr_token_idx on public.students (qr_token);

-- Attendance (one check-in per student per calendar day)
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  manager_id uuid not null references public.profiles (id) on delete restrict,
  date text not null,
  marked_at timestamptz not null default now(),
  unique (student_id, date)
);

create index if not exists attendance_branch_date_idx on public.attendance (branch_id, date);

-- Auto-create profile on signup (managers/users created from admin/manager UI)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, branch_id)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'manager'),
    nullif(new.raw_user_meta_data ->> 'branch_id', '')::uuid
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers: current user's role and branch
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select branch_id from public.profiles where id = auth.uid();
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;

-- Profiles
create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated using (true);

create policy "profiles_insert_admin"
  on public.profiles for insert to authenticated
  with check (public.current_role() = 'admin');

create policy "profiles_insert_manager_users"
  on public.profiles for insert to authenticated
  with check (
    public.current_role() = 'manager'
    and role = 'user'
    and branch_id = public.current_branch_id()
  );

create policy "profiles_update_admin"
  on public.profiles for update to authenticated
  using (public.current_role() = 'admin');

create policy "profiles_update_manager_users"
  on public.profiles for update to authenticated
  using (
    public.current_role() = 'manager'
    and role = 'user'
    and branch_id = public.current_branch_id()
  );

create policy "profiles_delete_admin"
  on public.profiles for delete to authenticated
  using (public.current_role() = 'admin');

create policy "profiles_delete_manager_users"
  on public.profiles for delete to authenticated
  using (
    public.current_role() = 'manager'
    and role = 'user'
    and branch_id = public.current_branch_id()
  );

create policy "profiles_update_self"
  on public.profiles for update to authenticated
  using (id = auth.uid());

-- Branches
create policy "branches_select_authenticated"
  on public.branches for select to authenticated using (true);

create policy "branches_write_admin"
  on public.branches for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- Students
create policy "students_select_authenticated"
  on public.students for select to authenticated using (true);

create policy "students_write_authenticated"
  on public.students for insert to authenticated with check (true);

create policy "students_update_authenticated"
  on public.students for update to authenticated using (true);

create policy "students_delete_admin"
  on public.students for delete to authenticated
  using (public.current_role() = 'admin');

create policy "students_delete_branch_staff"
  on public.students for delete to authenticated
  using (
    public.current_role() in ('manager', 'user')
    and branch_id = public.current_branch_id()
  );

-- Attendance
create policy "attendance_select_authenticated"
  on public.attendance for select to authenticated using (true);

create policy "attendance_insert_authenticated"
  on public.attendance for insert to authenticated
  with check (
    manager_id = auth.uid()
    and (
      public.current_role() = 'admin'
      or branch_id = public.current_branch_id()
    )
  );

create policy "attendance_update_branch_staff"
  on public.attendance for update to authenticated
  using (
    public.current_role() in ('manager', 'user')
    and branch_id = public.current_branch_id()
  );

create policy "attendance_delete_branch_staff"
  on public.attendance for delete to authenticated
  using (
    public.current_role() in ('manager', 'user')
    and branch_id = public.current_branch_id()
  );

create policy "attendance_update_admin"
  on public.attendance for update to authenticated
  using (public.current_role() = 'admin');

create policy "attendance_delete_admin"
  on public.attendance for delete to authenticated
  using (public.current_role() = 'admin');

-- Storage bucket for student photos (public read)
insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', true)
on conflict (id) do nothing;

create policy "student_photos_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'student-photos');

create policy "student_photos_write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'student-photos');

create policy "student_photos_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'student-photos');

create policy "student_photos_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'student-photos');

-- Scale helpers (safe to re-run)
create or replace function public.count_active_students_by_branch()
returns table (branch_id uuid, student_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select s.branch_id, count(*)::bigint
  from public.students s
  where s.active = true
  group by s.branch_id;
$$;

grant execute on function public.count_active_students_by_branch() to authenticated;

create index if not exists attendance_date_idx on public.attendance (date);

-- After creating your first admin user in Authentication → Users, run:
-- insert into public.profiles (id, email, name, role)
-- values ('YOUR_USER_UUID', 'admin@tsk.org', 'System Administrator', 'admin');
