-- Apply after schema.sql and add-academic-course-packages.sql.
-- Safe to rerun. Does not change order amounts, course prices, or user roles.
begin;

do $$
begin
  if to_regclass('public.profiles') is null
    or to_regclass('public.courses') is null
    or to_regclass('public.lessons') is null
    or to_regclass('public.orders') is null then
    raise exception 'Run supabase/schema.sql before supabase/website-update.sql.';
  end if;
end;
$$;

-- Persist AI chat history without allowing users to read or write other users' chats.
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'محادثة جديدة'
    check (char_length(trim(title)) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('assistant', 'student')),
  text text not null check (char_length(trim(text)) between 1 and 20000),
  source text check (source is null or source = 'ai'),
  created_at timestamptz not null default now(),
  constraint ai_messages_conversation_owner_fkey
    foreign key (conversation_id, user_id)
    references public.ai_conversations (id, user_id)
    on delete cascade,
  constraint ai_messages_source_by_role_check
    check (
      (role = 'student' and source is null)
      or (role = 'assistant' and source = 'ai')
    )
);

create index if not exists ai_conversations_user_updated_idx
  on public.ai_conversations (user_id, updated_at desc);
create index if not exists ai_messages_conversation_created_idx
  on public.ai_messages (conversation_id, created_at);
create index if not exists ai_messages_user_created_idx
  on public.ai_messages (user_id, created_at);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
revoke all on public.ai_conversations from public, anon, authenticated;
revoke all on public.ai_messages from public, anon, authenticated;
grant select, delete on public.ai_conversations to authenticated;
grant insert (user_id, title) on public.ai_conversations to authenticated;
grant update (title, updated_at) on public.ai_conversations to authenticated;
grant select on public.ai_messages to authenticated;
grant insert (conversation_id, user_id, role, text, source)
  on public.ai_messages to authenticated;

drop policy if exists "Users manage own AI conversations"
  on public.ai_conversations;
drop policy if exists "Users read own AI messages" on public.ai_messages;
drop policy if exists "Users add messages to own AI conversations"
  on public.ai_messages;

create policy "Users manage own AI conversations"
  on public.ai_conversations for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users read own AI messages"
  on public.ai_messages for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users add messages to own AI conversations"
  on public.ai_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.ai_conversations c
      where c.id = conversation_id
        and c.user_id = (select auth.uid())
    )
  );

-- Apply the current paid-course access policy; lesson catalog RPC omits video URLs.
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

-- Allow all manual payment methods supported by the current checkout.
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

-- Keep the database course catalog aligned with the English site content.
update public.courses
set title = 'English Grammar Foundations',
    description = 'Build English grammar foundations with clear explanations and focused practice.',
    level = 'Beginner'
where id = 'course-nahw';

update public.courses
set title = 'Verb Forms and Tenses',
    description = 'Practice English verb forms and tenses in clear sentence contexts.',
    level = 'Intermediate'
where id = 'course-sarf';

update public.courses
set title = 'Reading for Meaning',
    description = 'Develop reading comprehension through main ideas, details, and context clues.',
    level = 'Advanced'
where id = 'course-balagha';

update public.courses
set title = 'Literature and Text Analysis',
    description = 'Read English texts and practice analyzing theme, tone, and literary devices.',
    level = 'Intermediate'
where id = 'course-adab';

update public.courses c
set title = format(
      'English Course - Grade %s - %s - %s',
      split_part(c.id, '-', 2),
      case c.academic_system
        when 'الثانوي العام' then 'General Secondary'
        when 'الأزهري' then 'Al-Azhar Secondary'
        when 'البكالوريا' then 'Baccalaureate'
      end,
      case c.term
        when 'الفصل الدراسي الأول' then 'Term 1'
        when 'الفصل الدراسي الثاني' then 'Term 2'
      end
    ),
    description = 'English lessons and practice organized for this grade, school system, and term.',
    level = case split_part(c.id, '-', 2)
      when '1' then 'Beginner'
      when '2' then 'Intermediate'
      else 'Advanced'
    end
where c.id ~ '^grade-[1-3]-system-[1-3]-term-[1-2]$'
  and c.grade in ('الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي')
  and c.academic_system in ('الثانوي العام', 'الأزهري', 'البكالوريا')
  and c.term in ('الفصل الدراسي الأول', 'الفصل الدراسي الثاني');

with english_lessons(sort_order, title, summary) as (
  values
    (1, 'Parts of Speech: Nouns and Verbs',
      'Learn how nouns and verbs work in English sentences with clear examples.'),
    (2, 'Present Simple and Present Continuous',
      'Compare the present simple and present continuous and practice when to use each tense.'),
    (3, 'Sentence Structure and Word Order',
      'Build clear English sentences by arranging subjects, verbs, and objects.'),
    (4, 'Vocabulary in Context',
      'Use context clues, word families, and collocations to understand new vocabulary.'),
    (5, 'Prepositions of Time and Place',
      'Practice choosing prepositions of time and place in everyday English sentences.'),
    (6, 'Reading Comprehension: Finding the Main Idea',
      'Identify the main idea, supporting details, and meaning from context in a short passage.')
)
update public.lessons l
set title = e.title,
    summary = e.summary,
    video_src = case
      when l.video_src = any(array[
        'https://www.youtube.com/embed/drcg7r8rTMg?si=IVnoUTp0EGvuWZuq',
        'https://www.youtube.com/embed/etUExQI7Pcc?si=pm7EbEENgkPf4E5F',
        'https://www.youtube.com/embed/L8AQCaMSBzQ?si=rRXB7R8dG_uicy4I',
        'https://www.youtube.com/embed/nR3K6dQ1qGc?si=dU9Ykk49vTHZzA0P'
      ]::text[]) then ''
      else l.video_src
    end,
    duration = case
      when l.video_src = any(array[
        'https://www.youtube.com/embed/drcg7r8rTMg?si=IVnoUTp0EGvuWZuq',
        'https://www.youtube.com/embed/etUExQI7Pcc?si=pm7EbEENgkPf4E5F',
        'https://www.youtube.com/embed/L8AQCaMSBzQ?si=rRXB7R8dG_uicy4I',
        'https://www.youtube.com/embed/nR3K6dQ1qGc?si=dU9Ykk49vTHZzA0P'
      ]::text[]) then 'Coming soon'
      else l.duration
    end,
    key_points = case
      when l.key_points::text ~ '[ء-ي]' then '[]'::jsonb
      else l.key_points
    end
from english_lessons e
where l.course_id = 'course-nahw'
  and l.sort_order = e.sort_order;

with english_lessons(course_id, sort_order, title, summary) as (
  values
    ('course-sarf', 1, 'Regular and Irregular Verb Forms',
      'Recognize regular and irregular verb forms and use them in clear English sentences.'),
    ('course-sarf', 2, 'Past Simple and Past Continuous',
      'Compare completed past actions with actions that were in progress.'),
    ('course-sarf', 3, 'Present Perfect and Past Simple',
      'Choose between the present perfect and past simple using time and context clues.'),
    ('course-sarf', 4, 'Modal Verbs for Advice and Obligation',
      'Use common modal verbs to give advice and express obligation.'),
    ('course-balagha', 1, 'Reading for Gist and Main Ideas',
      'Identify the topic and main idea of a short English passage.'),
    ('course-balagha', 2, 'Scanning for Specific Information',
      'Scan a passage efficiently to find names, dates, and supporting details.'),
    ('course-balagha', 3, 'Context Clues and Word Meaning',
      'Use nearby words and sentence context to infer the meaning of unfamiliar vocabulary.'),
    ('course-balagha', 4, 'Making Inferences from a Text',
      'Combine textual clues with context to make supported inferences.'),
    ('course-adab', 1, 'Theme and Main Idea in Literary Texts',
      'Distinguish a literary text’s theme from its main idea.'),
    ('course-adab', 2, 'Character, Setting, and Conflict',
      'Analyze how characters, setting, and conflict shape a literary text.'),
    ('course-adab', 3, 'Tone and Mood',
      'Recognize how an author’s tone contributes to a text’s mood.'),
    ('course-adab', 4, 'Imagery and Figurative Language',
      'Identify imagery and figurative language in short English texts.')
)
update public.lessons l
set title = e.title,
    summary = e.summary,
    video_src = case
      when l.video_src = any(array[
        'https://www.youtube.com/embed/drcg7r8rTMg?si=IVnoUTp0EGvuWZuq',
        'https://www.youtube.com/embed/etUExQI7Pcc?si=pm7EbEENgkPf4E5F',
        'https://www.youtube.com/embed/L8AQCaMSBzQ?si=rRXB7R8dG_uicy4I',
        'https://www.youtube.com/embed/nR3K6dQ1qGc?si=dU9Ykk49vTHZzA0P'
      ]::text[]) then ''
      else l.video_src
    end,
    duration = case
      when l.video_src = any(array[
        'https://www.youtube.com/embed/drcg7r8rTMg?si=IVnoUTp0EGvuWZuq',
        'https://www.youtube.com/embed/etUExQI7Pcc?si=pm7EbEENgkPf4E5F',
        'https://www.youtube.com/embed/L8AQCaMSBzQ?si=rRXB7R8dG_uicy4I',
        'https://www.youtube.com/embed/nR3K6dQ1qGc?si=dU9Ykk49vTHZzA0P'
      ]::text[]) then 'Coming soon'
      else l.duration
    end,
    key_points = case
      when l.key_points::text ~ '[ء-ي]' then '[]'::jsonb
      else l.key_points
    end
from english_lessons e
where l.course_id = e.course_id
  and l.sort_order = e.sort_order;

with english_lessons(sort_order, title, summary) as (
  values
    (1, 'Parts of Speech: Nouns and Verbs',
      'Learn how nouns and verbs work in English sentences with clear examples.'),
    (2, 'Present Simple and Present Continuous',
      'Compare the present simple and present continuous and practice when to use each tense.'),
    (3, 'Sentence Structure and Word Order',
      'Build clear English sentences by arranging subjects, verbs, and objects.'),
    (4, 'Vocabulary in Context',
      'Use context clues, word families, and collocations to understand new vocabulary.')
)
update public.lessons l
set title = e.title,
    summary = e.summary,
    video_src = case
      when l.video_src = any(array[
        'https://www.youtube.com/embed/drcg7r8rTMg?si=IVnoUTp0EGvuWZuq',
        'https://www.youtube.com/embed/etUExQI7Pcc?si=pm7EbEENgkPf4E5F',
        'https://www.youtube.com/embed/L8AQCaMSBzQ?si=rRXB7R8dG_uicy4I',
        'https://www.youtube.com/embed/nR3K6dQ1qGc?si=dU9Ykk49vTHZzA0P'
      ]::text[]) then ''
      else l.video_src
    end,
    duration = case
      when l.video_src = any(array[
        'https://www.youtube.com/embed/drcg7r8rTMg?si=IVnoUTp0EGvuWZuq',
        'https://www.youtube.com/embed/etUExQI7Pcc?si=pm7EbEENgkPf4E5F',
        'https://www.youtube.com/embed/L8AQCaMSBzQ?si=rRXB7R8dG_uicy4I',
        'https://www.youtube.com/embed/nR3K6dQ1qGc?si=dU9Ykk49vTHZzA0P'
      ]::text[]) then 'Coming soon'
      else l.duration
    end,
    key_points = case
      when l.key_points::text ~ '[ء-ي]' then '[]'::jsonb
      else l.key_points
    end
from english_lessons e
where l.course_id ~ '^grade-[1-3]-system-[1-3]-term-[1-2]$'
  and l.sort_order = e.sort_order;

update public.lessons l
set title = case
      when l.title ~ '[ء-ي]' then format('English Lesson %s', l.sort_order)
      else l.title
    end,
    summary = case
      when l.summary ~ '[ء-ي]' then 'English lesson content coming soon.'
      else l.summary
    end,
    video_src = case
      when l.video_src = any(array[
        'https://www.youtube.com/embed/drcg7r8rTMg?si=IVnoUTp0EGvuWZuq',
        'https://www.youtube.com/embed/etUExQI7Pcc?si=pm7EbEENgkPf4E5F',
        'https://www.youtube.com/embed/L8AQCaMSBzQ?si=rRXB7R8dG_uicy4I',
        'https://www.youtube.com/embed/nR3K6dQ1qGc?si=dU9Ykk49vTHZzA0P'
      ]::text[]) then ''
      else l.video_src
    end,
    duration = case
      when l.video_src = any(array[
        'https://www.youtube.com/embed/drcg7r8rTMg?si=IVnoUTp0EGvuWZuq',
        'https://www.youtube.com/embed/etUExQI7Pcc?si=pm7EbEENgkPf4E5F',
        'https://www.youtube.com/embed/L8AQCaMSBzQ?si=rRXB7R8dG_uicy4I',
        'https://www.youtube.com/embed/nR3K6dQ1qGc?si=dU9Ykk49vTHZzA0P'
      ]::text[]) then 'Coming soon'
      else l.duration
    end,
    key_points = case
      when l.key_points::text ~ '[ء-ي]' then '[]'::jsonb
      else l.key_points
    end
where (
    l.course_id in (
      'course-nahw', 'course-sarf', 'course-balagha', 'course-adab'
    )
    or l.course_id ~ '^grade-[1-3]-system-[1-3]-term-[1-2]$'
  )
  and (
    l.title ~ '[ء-ي]'
    or l.summary ~ '[ء-ي]'
    or l.key_points::text ~ '[ء-ي]'
    or l.video_src = any(array[
      'https://www.youtube.com/embed/drcg7r8rTMg?si=IVnoUTp0EGvuWZuq',
      'https://www.youtube.com/embed/etUExQI7Pcc?si=pm7EbEENgkPf4E5F',
      'https://www.youtube.com/embed/L8AQCaMSBzQ?si=rRXB7R8dG_uicy4I',
      'https://www.youtube.com/embed/nR3K6dQ1qGc?si=dU9Ykk49vTHZzA0P'
    ]::text[])
  );

update public.courses c
set lesson_count = (
  select count(*)::integer
  from public.lessons l
  where l.course_id = c.id
)
where c.id in (
    'course-nahw', 'course-sarf', 'course-balagha', 'course-adab'
  )
   or c.id ~ '^grade-[1-3]-system-[1-3]-term-[1-2]$';

commit;

-- Post-run verification: both result sets should show zero for Arabic course content.
select count(*) as courses_with_arabic_content
from public.courses
where (
    id in ('course-nahw', 'course-sarf', 'course-balagha', 'course-adab')
    or id ~ '^grade-[1-3]-system-[1-3]-term-[1-2]$'
  )
  and (title ~ '[ء-ي]' or description ~ '[ء-ي]');

select count(*) as lessons_with_arabic_content
from public.lessons
where (
    course_id in (
      'course-nahw', 'course-sarf', 'course-balagha', 'course-adab'
    )
    or course_id ~ '^grade-[1-3]-system-[1-3]-term-[1-2]$'
  )
  and (
    title ~ '[ء-ي]'
    or summary ~ '[ء-ي]'
    or key_points::text ~ '[ء-ي]'
  );
