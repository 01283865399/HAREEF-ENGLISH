-- Run once in the Supabase SQL Editor. The frontend must only use the anon key.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists role text not null default 'student';

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('student', 'admin'));
alter table public.profiles enable row level security;

insert into public.profiles (id, full_name, email, phone)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'phone', '')
from auth.users u
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email;

create table if not exists public.courses (
  id text primary key,
  title text not null,
  description text not null default '',
  price numeric(10, 2) not null default 0 check (price >= 0),
  thumbnail_url text not null default '',
  is_free boolean not null default false,
  category text not null default 'نحو' check (category in ('نحو', 'صرف', 'بلاغة', 'أدب')),
  level text not null default 'مبتدئ',
  lesson_count integer not null default 0 check (lesson_count >= 0),
  duration_text text not null default '',
  grade text,
  academic_system text,
  term text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.courses
  add column if not exists category text not null default 'نحو',
  add column if not exists level text not null default 'مبتدئ',
  add column if not exists lesson_count integer not null default 0,
  add column if not exists duration_text text not null default '',
  add column if not exists grade text,
  add column if not exists academic_system text,
  add column if not exists term text,
  add column if not exists created_by uuid references public.profiles (id) on delete set null;
update public.courses set
  category = case id
    when 'course-sarf' then 'صرف'
    when 'course-balagha' then 'بلاغة'
    when 'course-adab' then 'أدب'
    else 'نحو'
  end,
  level = case id
    when 'course-nahw' then 'Beginner'
    when 'course-balagha' then 'Advanced'
    else 'Intermediate'
  end,
  lesson_count = case id
    when 'course-nahw' then 6
    when 'course-sarf' then 10
    when 'course-balagha' then 8
    when 'course-adab' then 11
    else lesson_count
  end,
  duration_text = case id
    when 'course-nahw' then '٤ أسابيع'
    when 'course-sarf' then '٣ أسابيع'
    when 'course-balagha' then 'أسبوعان'
    when 'course-adab' then '٤ أسابيع'
    else duration_text
  end
where id in ('course-nahw', 'course-sarf', 'course-balagha', 'course-adab');
alter table public.courses enable row level security;
revoke all on public.courses from anon, authenticated;
grant select on public.courses to anon, authenticated;
grant insert, update, delete on public.courses to authenticated;

insert into public.courses (
  id, title, description, price, thumbnail_url, is_free, category, level
)
values
  ('course-nahw', 'English Grammar Foundations', 'Build English grammar foundations with clear explanations and focused practice.', 0, '05-course-1.png', true, 'نحو', 'Beginner'),
  ('course-sarf', 'Verb Forms and Tenses', 'Practice English verb forms and tenses in clear sentence contexts.', 179, '06-course-2.png', false, 'صرف', 'Intermediate'),
  ('course-balagha', 'Reading for Meaning', 'Develop reading comprehension through main ideas, details, and context clues.', 169, '07-course-3.png', false, 'بلاغة', 'Advanced'),
  ('course-adab', 'Literature and Text Analysis', 'Read English texts and practice analyzing theme, tone, and literary devices.', 189, '08-course-4.png', false, 'أدب', 'Intermediate')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  price = excluded.price,
  thumbnail_url = excluded.thumbnail_url,
  is_free = excluded.is_free,
  category = excluded.category,
  level = excluded.level;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
drop policy if exists "Courses are publicly readable" on public.courses;
create policy "Courses are publicly readable"
  on public.courses for select to anon, authenticated
  using (true);
drop policy if exists "Admins manage courses" on public.courses;
create policy "Admins manage courses"
  on public.courses for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create table if not exists public.lessons (
  id text primary key,
  course_id text not null references public.courses (id) on delete cascade,
  title text not null,
  summary text not null default '',
  video_src text not null default '',
  duration text not null default '',
  key_points jsonb not null default '[]'::jsonb
    check (jsonb_typeof(key_points) = 'array'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lessons_course_sort_idx
  on public.lessons (course_id, sort_order);
create or replace function public.sync_course_lesson_count()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.courses
    set lesson_count = (
      select count(*)::integer from public.lessons where course_id = old.course_id
    )
    where id = old.course_id;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.course_id is distinct from new.course_id then
    update public.courses
    set lesson_count = (
      select count(*)::integer from public.lessons where course_id = old.course_id
    )
    where id = old.course_id;
  end if;

  update public.courses
  set lesson_count = (
    select count(*)::integer from public.lessons where course_id = new.course_id
  )
  where id = new.course_id;
  return new;
end;
$$;
drop trigger if exists sync_course_lesson_count on public.lessons;
create trigger sync_course_lesson_count
  after insert or update of course_id or delete on public.lessons
  for each row execute function public.sync_course_lesson_count();
alter table public.lessons enable row level security;
revoke all on public.lessons from anon, authenticated;
grant select on public.lessons to anon, authenticated;
grant insert, update, delete on public.lessons to authenticated;
drop policy if exists "Lessons are publicly readable" on public.lessons;
drop policy if exists "Admins manage lessons" on public.lessons;
create policy "Admins manage lessons"
  on public.lessons for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

insert into public.lessons
  (id, course_id, title, summary, video_src, duration, key_points, sort_order)
values
  ('lesson-1', 'course-nahw', 'Parts of Speech: Nouns and Verbs', 'Learn how nouns and verbs work in English sentences with clear examples.', '', 'Coming soon', '[]'::jsonb, 1),
  ('lesson-2', 'course-nahw', 'Present Simple and Present Continuous', 'Compare the present simple and present continuous and practice when to use each tense.', '', 'Coming soon', '[]'::jsonb, 2),
  ('lesson-3', 'course-nahw', 'Sentence Structure and Word Order', 'Build clear English sentences by arranging subjects, verbs, and objects.', '', 'Coming soon', '[]'::jsonb, 3),
  ('lesson-4', 'course-nahw', 'Vocabulary in Context', 'Use context clues, word families, and collocations to understand new vocabulary.', '', 'Coming soon', '[]'::jsonb, 4),
  ('lesson-5', 'course-nahw', 'Prepositions of Time and Place', 'Practice choosing prepositions of time and place in everyday English sentences.', '', 'Coming soon', '[]'::jsonb, 5),
  ('lesson-6', 'course-nahw', 'Reading Comprehension: Finding the Main Idea', 'Identify the main idea, supporting details, and meaning from context in a short passage.', '', 'Coming soon', '[]'::jsonb, 6)
on conflict (id) do update set
  course_id = excluded.course_id,
  title = excluded.title,
  summary = excluded.summary,
  video_src = excluded.video_src,
  duration = excluded.duration,
  key_points = excluded.key_points,
  sort_order = excluded.sort_order;
update public.courses c set lesson_count = (
  select count(*)::integer from public.lessons l where l.course_id = c.id
);

create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  details text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists admin_activity_log_created_at_idx
  on public.admin_activity_log (created_at desc);
alter table public.admin_activity_log enable row level security;
revoke all on public.admin_activity_log from anon, authenticated;
grant select, insert on public.admin_activity_log to authenticated;
drop policy if exists "Admins read activity log" on public.admin_activity_log;
drop policy if exists "Admins write activity log" on public.admin_activity_log;
create policy "Admins read activity log"
  on public.admin_activity_log for select to authenticated
  using ((select public.is_admin()));
create policy "Admins write activity log"
  on public.admin_activity_log for insert to authenticated
  with check (actor_id = (select auth.uid()) and (select public.is_admin()));

drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Profiles are visible to owner or admin" on public.profiles;
drop policy if exists "Users can create their own student profile" on public.profiles;
drop policy if exists "Users can update their own profile fields" on public.profiles;
create policy "Profiles are visible to owner or admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Users can create their own student profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and role = 'student');
create policy "Users can update their own profile fields"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, full_name, email, phone, role) on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = case
      when excluded.phone <> '' then excluded.phone
      else public.profiles.phone
    end,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_insert on auth.users;
create trigger on_auth_user_profile_insert
  after insert on auth.users
  for each row execute procedure public.sync_profile_from_auth_user();
drop trigger if exists on_auth_user_profile_update on auth.users;
create trigger on_auth_user_profile_update
  after update of email, raw_user_meta_data on auth.users
  for each row execute procedure public.sync_profile_from_auth_user();

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id text not null references public.courses (id) on delete restrict,
  amount numeric(10, 2) not null default 0 check (amount >= 0),
  payment_method text not null check (
    payment_method in (
      'Vodafone Cash', 'Etisalat Cash', 'InstaPay', 'Fawry', 'Orange Cash'
    )
  ),
  sender_wallet_number text not null check (
    char_length(trim(sender_wallet_number)) between 7 and 32
  ),
  receipt_image_path text not null,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected')
  ),
  created_at timestamptz not null default now()
);
alter table public.orders
  add column if not exists amount numeric(10, 2) not null default 0;
alter table public.orders
  drop constraint if exists orders_payment_method_check;
alter table public.orders
  drop constraint if exists orders_payment_method_allowed;
alter table public.orders
  add constraint orders_payment_method_allowed check (
    payment_method in (
      'Vodafone Cash', 'Etisalat Cash', 'InstaPay', 'Fawry', 'Orange Cash'
    )
  );
update public.orders o set amount = c.price
from public.courses c
where c.id = o.course_id and o.amount = 0;
create or replace function public.set_order_amount()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  course_price numeric(10, 2);
  course_is_free boolean;
begin
  select c.price, c.is_free into course_price, course_is_free
  from public.courses c
  where c.id = new.course_id;
  if not found then
    raise exception 'الكورس المطلوب غير موجود.';
  end if;
  if course_is_free then
    raise exception 'لا يمكن إنشاء طلب دفع لكورس مجاني.';
  end if;
  new.amount := course_price;
  return new;
end;
$$;
revoke all on function public.set_order_amount() from public;
drop trigger if exists set_order_amount on public.orders;
create trigger set_order_amount
  before insert on public.orders
  for each row execute function public.set_order_amount();
create index if not exists orders_user_course_status_idx
  on public.orders (user_id, course_id, status);
create index if not exists orders_status_created_at_idx
  on public.orders (status, created_at desc);
create unique index if not exists orders_one_pending_per_course
  on public.orders (user_id, course_id) where status = 'pending';
alter table public.orders enable row level security;

create table if not exists public.course_enrollments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id text not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);
create index if not exists course_enrollments_course_id_idx
  on public.course_enrollments (course_id);
alter table public.course_enrollments enable row level security;
revoke all on public.course_enrollments from anon, authenticated;
grant select, insert on public.course_enrollments to authenticated;
drop policy if exists "Students can view own enrollments" on public.course_enrollments;
drop policy if exists "Students can enroll in free courses" on public.course_enrollments;
create policy "Students can view own enrollments"
  on public.course_enrollments for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Students can enroll in free courses"
  on public.course_enrollments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.is_free
    )
  );

create table if not exists public.student_progress (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  progress jsonb not null default '{}'::jsonb
    check (jsonb_typeof(progress) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.student_progress enable row level security;
revoke all on public.student_progress from anon, authenticated;
grant select, insert, update on public.student_progress to authenticated;
drop policy if exists "Students can read own progress" on public.student_progress;
drop policy if exists "Students can create own progress" on public.student_progress;
drop policy if exists "Students can update own progress" on public.student_progress;
create policy "Students can read own progress"
  on public.student_progress for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Students can create own progress"
  on public.student_progress for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Students can update own progress"
  on public.student_progress for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

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

create or replace function public.has_approved_course_order(p_course_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.course_id = p_course_id
      and o.user_id = (select auth.uid())
      and o.status = 'approved'
  );
$$;
revoke all on function public.has_approved_course_order(text) from public;
grant execute on function public.has_approved_course_order(text) to authenticated;

revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
grant insert (user_id, course_id, payment_method, sender_wallet_number, receipt_image_path)
  on public.orders to authenticated;
grant update (status) on public.orders to authenticated;

drop policy if exists "Students can view own orders" on public.orders;
drop policy if exists "Students can create pending orders" on public.orders;
drop policy if exists "Admins can view all orders" on public.orders;
drop policy if exists "Admins can decide pending orders" on public.orders;
create policy "Students can view own orders"
  on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Students can create pending orders"
  on public.orders for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and receipt_image_path like ((select auth.uid())::text || '/%')
    and exists (
      select 1 from storage.objects so
      where so.bucket_id = 'payment-receipts'
        and so.name = receipt_image_path
    )
    and not (select public.has_approved_course_order(course_id))
    and exists (
      select 1 from public.courses c
      where c.id = course_id and not c.is_free and c.price = amount
    )
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()))
  );
create policy "Admins can decide pending orders"
  on public.orders for update to authenticated
  using ((select public.is_admin()) and status = 'pending')
  with check ((select public.is_admin()) and status in ('approved', 'rejected'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('payment-receipts', 'payment-receipts', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('course-videos', 'course-videos', false, 2147483648, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Students upload own receipts" on storage.objects;
drop policy if exists "Students clean up unlinked receipts" on storage.objects;
drop policy if exists "Owners and admins read receipts" on storage.objects;
drop policy if exists "Admins manage course videos" on storage.objects;
drop policy if exists "Enrolled students read course videos" on storage.objects;
create policy "Students upload own receipts"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Students clean up unlinked receipts"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.orders o where o.receipt_image_path = name
    )
  );
create policy "Owners and admins read receipts"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-receipts'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );
create policy "Admins manage course videos"
  on storage.objects for all to authenticated
  using (bucket_id = 'course-videos' and (select public.is_admin()))
  with check (bucket_id = 'course-videos' and (select public.is_admin()));
create policy "Enrolled students read course videos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'course-videos'
    and (select public.can_access_course((storage.foldername(name))[1]))
  );
