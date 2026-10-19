-- Adds 18 paid English course packages with English lesson outlines.
-- No lesson video is attached until English lesson videos are available.
-- Safe to rerun; existing orders and their recorded amounts are unchanged.
begin;

with package_grid as (
  select grade_index, system_index, term_index
  from generate_series(1, 3) as grades(grade_index)
  cross join generate_series(1, 3) as systems(system_index)
  cross join generate_series(1, 2) as terms(term_index)
),
packages as (
  select
    format(
      'grade-%s-system-%s-term-%s',
      grade_index,
      system_index,
      term_index
    ) as id,
    format('English Course - Grade %s - %s - %s', grade_index,
      case system_index
        when 1 then 'General Secondary'
        when 2 then 'Al-Azhar Secondary'
        else 'Baccalaureate'
      end,
      case term_index
        when 1 then 'Term 1'
        else 'Term 2'
      end
    ) as title,
    case grade_index
      when 1 then 'الأول الثانوي'
      when 2 then 'الثاني الثانوي'
      else 'الثالث الثانوي'
    end as grade,
    case system_index
      when 1 then 'الثانوي العام'
      when 2 then 'الأزهري'
      else 'البكالوريا'
    end as academic_system,
    case term_index
      when 1 then 'الفصل الدراسي الأول'
      else 'الفصل الدراسي الثاني'
    end as term,
    229 + (grade_index - 1) * 30 + (system_index - 1) * 10
      + (term_index - 1) * 5 as price,
    case grade_index
      when 1 then 'Beginner'
      when 2 then 'Intermediate'
      else 'Advanced'
    end as level
  from package_grid
)
insert into public.courses (
  id,
  title,
  description,
  price,
  thumbnail_url,
  is_free,
  category,
  level,
  lesson_count,
  duration_text,
  grade,
  academic_system,
  term
)
select
  id,
  title,
  'English lessons and practice organized for this grade, school system, and term.',
  price,
  '05-course-1.png',
  false,
  'نحو',
  level,
  4,
  '٤ أسابيع',
  grade,
  academic_system,
  term
from packages
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  price = excluded.price,
  thumbnail_url = excluded.thumbnail_url,
  is_free = excluded.is_free,
  category = excluded.category,
  level = excluded.level,
  lesson_count = excluded.lesson_count,
  duration_text = excluded.duration_text,
  grade = excluded.grade,
  academic_system = excluded.academic_system,
  term = excluded.term;

with package_courses as (
  select id
  from public.courses
  where id ~ '^grade-[1-3]-system-[1-3]-term-[1-2]$'
),
package_lessons (sort_order, title, summary) as (
  values
    (
      1,
      'Parts of Speech: Nouns and Verbs',
      'Learn how nouns and verbs work in English sentences with clear examples.'
    ),
    (
      2,
      'Present Simple and Present Continuous',
      'Compare the present simple and present continuous and practice when to use each tense.'
    ),
    (
      3,
      'Sentence Structure and Word Order',
      'Build clear English sentences by arranging subjects, verbs, and objects.'
    ),
    (
      4,
      'Vocabulary in Context',
      'Use context clues, word families, and collocations to understand new vocabulary.'
    )
),
lessons_to_seed (course_id, sort_order, title, summary) as (
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
  union all
  select package_courses.id, package_lessons.sort_order,
    package_lessons.title, package_lessons.summary
  from package_courses
  cross join package_lessons
)
insert into public.lessons (
  id,
  course_id,
  title,
  summary,
  video_src,
  duration,
  key_points,
  sort_order
)
select
  format('lesson-%s-%s', lessons_to_seed.course_id, lessons_to_seed.sort_order),
  lessons_to_seed.course_id,
  lessons_to_seed.title,
  lessons_to_seed.summary,
  '',
  'Coming soon',
  '[]'::jsonb,
  lessons_to_seed.sort_order
from lessons_to_seed
on conflict (id) do update set
  course_id = excluded.course_id,
  title = excluded.title,
  summary = excluded.summary,
  video_src = case
    when lessons.video_src = any(array[
      'https://www.youtube.com/embed/drcg7r8rTMg?si=IVnoUTp0EGvuWZuq',
      'https://www.youtube.com/embed/etUExQI7Pcc?si=pm7EbEENgkPf4E5F',
      'https://www.youtube.com/embed/L8AQCaMSBzQ?si=rRXB7R8dG_uicy4I',
      'https://www.youtube.com/embed/nR3K6dQ1qGc?si=dU9Ykk49vTHZzA0P'
    ]::text[]) then excluded.video_src
    else lessons.video_src
  end,
  duration = case
    when lessons.video_src = any(array[
      'https://www.youtube.com/embed/drcg7r8rTMg?si=IVnoUTp0EGvuWZuq',
      'https://www.youtube.com/embed/etUExQI7Pcc?si=pm7EbEENgkPf4E5F',
      'https://www.youtube.com/embed/L8AQCaMSBzQ?si=rRXB7R8dG_uicy4I',
      'https://www.youtube.com/embed/nR3K6dQ1qGc?si=dU9Ykk49vTHZzA0P'
    ]::text[]) then excluded.duration
    else lessons.duration
  end,
  key_points = excluded.key_points,
  sort_order = excluded.sort_order;

commit;
