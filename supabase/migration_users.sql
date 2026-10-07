-- Run in Supabase SQL Editor on an EXISTING project (after schema.sql)

-- 1. Add branch_id to profiles
alter table public.profiles
  add column if not exists branch_id uuid references public.branches (id) on delete set null;

-- 2. Allow user role
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'manager', 'user'));

-- 3. Update signup trigger to store branch_id from metadata
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

-- 4. Helpers for RLS
create or replace function public.current_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select branch_id from public.profiles where id = auth.uid();
$$;

-- 5. Managers can create user profiles (managers insert users for their branch)
drop policy if exists "profiles_insert_manager_users" on public.profiles;
create policy "profiles_insert_manager_users"
  on public.profiles for insert to authenticated
  with check (
    public.current_role() = 'manager'
    and role = 'user'
    and branch_id = public.current_branch_id()
  );

-- Managers can update/delete users in their branch
drop policy if exists "profiles_update_manager_users" on public.profiles;
create policy "profiles_update_manager_users"
  on public.profiles for update to authenticated
  using (
    public.current_role() = 'manager'
    and role = 'user'
    and branch_id = public.current_branch_id()
  );

drop policy if exists "profiles_delete_manager_users" on public.profiles;
create policy "profiles_delete_manager_users"
  on public.profiles for delete to authenticated
  using (
    public.current_role() = 'manager'
    and role = 'user'
    and branch_id = public.current_branch_id()
  );

-- Admins can set manager branch_id
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update to authenticated
  using (public.current_role() = 'admin');

-- 6. Attendance: allow update/delete for manager and user on their branch
drop policy if exists "attendance_update_branch_staff" on public.attendance;
create policy "attendance_update_branch_staff"
  on public.attendance for update to authenticated
  using (
    public.current_role() in ('manager', 'user')
    and branch_id = public.current_branch_id()
  );

drop policy if exists "attendance_delete_branch_staff" on public.attendance;
create policy "attendance_delete_branch_staff"
  on public.attendance for delete to authenticated
  using (
    public.current_role() in ('manager', 'user')
    and branch_id = public.current_branch_id()
  );

-- Allow insert for users too (marked_by = auth.uid())
drop policy if exists "attendance_insert_authenticated" on public.attendance;
create policy "attendance_insert_authenticated"
  on public.attendance for insert to authenticated
  with check (
    manager_id = auth.uid()
    and (
      public.current_role() = 'admin'
      or branch_id = public.current_branch_id()
    )
  );

-- Admin can edit/delete attendance for any branch
drop policy if exists "attendance_update_admin" on public.attendance;
create policy "attendance_update_admin"
  on public.attendance for update to authenticated
  using (public.current_role() = 'admin');

drop policy if exists "attendance_delete_admin" on public.attendance;
create policy "attendance_delete_admin"
  on public.attendance for delete to authenticated
  using (public.current_role() = 'admin');

-- Manager/user can delete students in their branch
drop policy if exists "students_delete_branch_staff" on public.students;
create policy "students_delete_branch_staff"
  on public.students for delete to authenticated
  using (
    public.current_role() in ('manager', 'user')
    and branch_id = public.current_branch_id()
  );
