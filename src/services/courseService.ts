import courseData from "../data/courses.json";
import {
  courseDescription,
  courseTitle,
  lessonSummary,
  lessonTitle,
} from "../data/coursePresentation";
import faqData from "../data/faq.json";
import lessonData from "../data/lessons.json";
import planData from "../data/plans.json";
import quizData from "../data/quizzes.json";
import irabData from "../data/irab.json";
import { coursePackageTemplates } from "../data/coursePackages";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  safeSupabaseQuery,
  type Database,
  type Json,
} from "../lib/supabase";
import type {
  Course,
  FaqItem,
  IrabSentence,
  Lesson,
  Plan,
  Quiz,
} from "../types/domain";
import { mockRequest } from "./api";

const seedCourses = courseData as Course[];
const seedLessons = lessonData as Lesson[];
const courses: Course[] = [
  ...seedCourses,
  ...coursePackageTemplates.map((template) => ({
    id: template.id,
    category: "نحو" as const,
    title: template.title,
    description: "An English learning track with lessons and focused practice.",
    level:
      template.grade === "الأول الثانوي"
        ? "مبتدئ"
        : template.grade === "الثاني الثانوي"
          ? "متوسط"
          : "متقدم",
    lessons: "٤ دروس",
    duration: "٤ أسابيع",
    price: `${new Intl.NumberFormat("ar-EG").format(template.priceAmount)} ج.م`,
    priceAmount: template.priceAmount,
    isFree: false,
    grade: template.grade,
    academicSystem: template.system,
    term: template.term,
    image: "05-course-1.png",
  })),
];
const lessonVideoSeeds = seedLessons.filter((lesson) => lesson.videoSrc.trim());
const coursesWithReusedLessonVideos = [
  "course-sarf",
  "course-balagha",
  "course-adab",
  ...coursePackageTemplates.map(({ id }) => id),
];
const lessons: Lesson[] = [
  ...seedLessons,
  ...coursesWithReusedLessonVideos.flatMap((courseId) =>
    lessonVideoSeeds.map((lesson) => ({
      ...lesson,
      id: `${lesson.id}-${courseId}`,
      courseId,
    })),
  ),
];
const plans = planData as Plan[];
const faq = faqData as FaqItem[];
const quizzes = quizData as { levelTest: Quiz; lessonQuiz: Quiz };
const irabSentences = irabData as IrabSentence[];
const coursePackagesById = new Map(
  coursePackageTemplates.map((template) => [template.id, template]),
);

const freeCourseIds = new Set(["course-nahw"]);
let configuredFreeCourseIds = new Set(freeCourseIds);
type CourseRow = Pick<
  Database["public"]["Tables"]["courses"]["Row"],
  | "id"
  | "title"
  | "description"
  | "price"
  | "thumbnail_url"
  | "is_free"
  | "category"
  | "level"
  | "lesson_count"
  | "duration_text"
  | "grade"
  | "academic_system"
  | "term"
>;
type LessonRow = Pick<
  Database["public"]["Tables"]["lessons"]["Row"],
  | "id"
  | "course_id"
  | "title"
  | "summary"
  | "video_src"
  | "duration"
  | "key_points"
>;
type LessonCatalogRow = Pick<
  Database["public"]["Tables"]["lessons"]["Row"],
  "id" | "course_id" | "title" | "summary" | "duration" | "key_points"
>;

export function isFreeCourse(courseId: string): boolean {
  return configuredFreeCourseIds.has(courseId);
}

export function isLocallyFreeCourse(courseId: string): boolean {
  return !isSupabaseConfigured() && freeCourseIds.has(courseId);
}

function mapDatabaseCourse(row: CourseRow): Course {
  const amount = Number(row.price);
  const packageTemplate = coursePackagesById.get(row.id);
  return {
    id: row.id,
    title: packageTemplate?.title ?? courseTitle(row.id, row.title),
    description: courseDescription(row.description),
    category: row.category,
    level: row.level,
    lessons: new Intl.NumberFormat("ar-EG").format(row.lesson_count) + " دروس",
    duration: row.duration_text,
    price: `${new Intl.NumberFormat("ar-EG").format(amount)} ج.م`,
    priceAmount: amount,
    isFree: row.is_free,
    grade: row.grade,
    academicSystem: row.academic_system,
    term: row.term,
    image: row.thumbnail_url,
  };
}

function isKeyPointArray(value: Json): value is Lesson["keyPoints"] {
  return (
    Array.isArray(value) &&
    value.every(
      (point) =>
        typeof point === "object" &&
        point !== null &&
        !Array.isArray(point) &&
        typeof point.label === "string" &&
        typeof point.seconds === "number",
    )
  );
}

function mapDatabaseLesson(row: LessonRow): Lesson {
  const hasLegacyArabicTitle = /[\u0600-\u06ff]/u.test(row.title);
  return {
    id: row.id,
    courseId: row.course_id,
    title: lessonTitle(row.id, row.title),
    summary: lessonSummary(row.summary),
    videoSrc: hasLegacyArabicTitle ? "" : row.video_src,
    duration: row.duration,
    keyPoints: isKeyPointArray(row.key_points) ? row.key_points : [],
  };
}

function mapLessonCatalogRow(row: LessonCatalogRow): Lesson {
  return mapDatabaseLesson({ ...row, video_src: "" });
}

export async function getCourses(): Promise<Course[]> {
  if (!isSupabaseConfigured()) return mockRequest(() => courses);
  try {
    const { data, error } = await safeSupabaseQuery<CourseRow[]>(
      async () =>
        await getSupabaseClient()
          .from("courses")
          .select(
            "id, title, description, price, thumbnail_url, is_free, category, level, lesson_count, duration_text, grade, academic_system, term",
          )
          .order("created_at", { ascending: false }),
      3,
    );
    if (error || !data || data.length === 0) {
      console.warn("Supabase courses fetch failed/empty, fallback to seed courses:", error?.message);
      return courses;
    }
    configuredFreeCourseIds = new Set(
      data.filter((course) => course.is_free).map((course) => course.id),
    );
    return data.map(mapDatabaseCourse);
  } catch (e) {
    console.warn("Using local courses fallback due to exception:", e);
    return courses;
  }
}

export async function getLessons(): Promise<Lesson[]> {
  if (!isSupabaseConfigured()) return mockRequest(() => lessons);
  try {
    const { data, error } = await safeSupabaseQuery<LessonRow[]>(
      async () =>
        await getSupabaseClient()
          .from("lessons")
          .select("id, course_id, title, summary, video_src, duration, key_points")
          .order("sort_order", { ascending: true }),
      3,
    );
    if (error || !data || data.length === 0) {
      console.warn("Supabase lessons fetch failed/empty, fallback to seed lessons:", error?.message);
      return lessons;
    }
    return data.map(mapDatabaseLesson);
  } catch (e) {
    console.warn("Using local lessons fallback due to exception:", e);
    return lessons;
  }
}

export async function getLessonCatalog(): Promise<Lesson[]> {
  if (!isSupabaseConfigured()) return mockRequest(() => lessons);
  try {
    const { data, error } = await safeSupabaseQuery<LessonCatalogRow[]>(
      async () => await getSupabaseClient().rpc("get_lesson_catalog"),
      3,
    );
    if (error || !data || data.length === 0) {
      console.warn("Supabase lesson catalog fetch failed/empty, fallback to seed lessons:", error?.message);
      return lessons;
    }
    return data.map(mapLessonCatalogRow);
  } catch (e) {
    console.warn("Using local catalog fallback due to exception:", e);
    return lessons;
  }
}

export async function getLesson(lessonId: string): Promise<Lesson> {
  if (isSupabaseConfigured()) {
    const { data: catalog, error: catalogError } =
      await getSupabaseClient().rpc("get_lesson_catalog");
    if (catalogError) {
      throw new Error(`تعذّر تحميل بيانات الدرس: ${catalogError.message}`);
    }
    const lessonSummary = (catalog ?? []).find(({ id }) => id === lessonId);
    if (!lessonSummary) throw new Error("لم يتم العثور على الدرس.");

    const { data: access, error: accessError } = await getSupabaseClient().rpc(
      "can_access_course",
      { p_course_id: lessonSummary.course_id },
    );
    if (accessError) {
      throw new Error(`تعذّر التحقق من صلاحية الدرس: ${accessError.message}`);
    }
    if (!access) return mapLessonCatalogRow(lessonSummary);

    const { data, error } = await getSupabaseClient()
      .from("lessons")
      .select("id, course_id, title, summary, video_src, duration, key_points")
      .eq("id", lessonId)
      .maybeSingle();
    if (error) throw new Error(`تعذّر تحميل الدرس: ${error.message}`);
    if (!data) {
      throw new Error("تعذّر تحميل محتوى الدرس بعد التحقق من الاشتراك.");
    }
    return mapDatabaseLesson(data);
  }
  return mockRequest(() => {
    const lesson = lessons.find(({ id }) => id === lessonId);
    if (!lesson) throw new Error("لم يتم العثور على الدرس.");
    return lesson;
  });
}

export function getPlans(): Promise<Plan[]> {
  return mockRequest(() => plans);
}

export function getFaq(): Promise<FaqItem[]> {
  return mockRequest(() => faq);
}

export function getLevelTest(): Promise<Quiz> {
  return mockRequest(() => quizzes.levelTest);
}

export function getLessonQuiz(): Promise<Quiz> {
  return mockRequest(() => quizzes.lessonQuiz);
}

export function getIrabSentences(): Promise<IrabSentence[]> {
  return mockRequest(() => irabSentences);
}
