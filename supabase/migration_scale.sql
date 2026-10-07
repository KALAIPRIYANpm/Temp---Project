-- Scale helpers for large student counts
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

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
