-- Fix: attendance deletes were blocked (no DELETE RLS policies).
-- Without these, "mark absent" looks successful but the row stays,
-- so marking present again fails on unique (student_id, date).

drop policy if exists "attendance_delete_branch_staff" on public.attendance;
create policy "attendance_delete_branch_staff"
  on public.attendance for delete to authenticated
  using (
    public.current_role() in ('manager', 'user')
    and branch_id = public.current_branch_id()
  );

drop policy if exists "attendance_delete_admin" on public.attendance;
create policy "attendance_delete_admin"
  on public.attendance for delete to authenticated
  using (public.current_role() = 'admin');

drop policy if exists "attendance_update_branch_staff" on public.attendance;
create policy "attendance_update_branch_staff"
  on public.attendance for update to authenticated
  using (
    public.current_role() in ('manager', 'user')
    and branch_id = public.current_branch_id()
  );

drop policy if exists "attendance_update_admin" on public.attendance;
create policy "attendance_update_admin"
  on public.attendance for update to authenticated
  using (public.current_role() = 'admin');

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
