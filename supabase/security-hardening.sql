-- Apply to an existing project after deploying the matching application code.
-- Course outlines remain public, but lesson video URLs are not included.

begin;

create or replace function public.can_access_course(p_course_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select public.is_admin()) or exists (
    select 1 from public.courses c
    where c.id = p_course_id and c.is_free
  ) or exists (
    select 1 from public.orders o
    where o.course_id = p_course_id
      and o.user_id = (select auth.uid())
      and o.status = 'approved'
  );
$$;
revoke all on function public.can_access_course(text) from public;
grant execute on function public.can_access_course(text) to anon, authenticated;

drop policy if exists "Lessons are publicly readable" on public.lessons;
drop policy if exists "Enrolled users can read course lessons" on public.lessons;
create policy "Enrolled users can read course lessons"
  on public.lessons for select to authenticated
  using (
    (select public.can_access_course(course_id))
    or (select public.is_admin())
  );

create or replace function public.get_lesson_catalog()
returns table (
  id text,
  course_id text,
  title text,
  summary text,
  duration text,
  key_points jsonb,
  sort_order integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.id,
    l.course_id,
    l.title,
    l.summary,
    l.duration,
    l.key_points,
    l.sort_order
  from public.lessons l
  order by l.course_id, l.sort_order;
$$;
revoke all on function public.get_lesson_catalog() from public;
grant execute on function public.get_lesson_catalog() to anon, authenticated;

commit;
