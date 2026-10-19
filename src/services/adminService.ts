import { getSupabaseClient, isSupabaseConfigured, type Database } from "../lib/supabase";

export type ManagedCourse = Database["public"]["Tables"]["courses"]["Row"];
export type ManagedLesson = Database["public"]["Tables"]["lessons"]["Row"];
export type StudentProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "email" | "phone" | "role" | "created_at"
>;
export type AdminActivity = Database["public"]["Tables"]["admin_activity_log"]["Row"];

export interface AdminStudent extends StudentProfileRow {
  enrolledCourses: { id: string; title: string; status: string }[];
  completedLessons: number;
  watchedMinutes: number;
  latestActivity: string | null;
  quizCount: number;
  levelTestScore: number | null;
}

export interface AdminOverview {
  students: AdminStudent[];
  courses: ManagedCourse[];
  pendingOrders: number;
  approvedSubscriptions: number;
  totalRevenue: number;
  activeStudents: number;
  coursePopularity: { courseId: string; title: string; subscriptions: number }[];
  averageLevelTestScore: number | null;
}

function requireAdminBackend(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "لوحة الإدارة تحتاج اتصال Supabase. أضف متغيرات البيئة وشغّل مخطط قاعدة البيانات أولًا.",
    );
  }
}

async function logAdminActivity(action: string, details: string): Promise<void> {
  const client = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError) throw new Error(`تعذّر التحقق من حساب المدير: ${userError.message}`);
  if (!user) throw new Error("انتهت جلسة المدير. سجّل الدخول مجددًا.");
  const { error } = await client.from("admin_activity_log").insert({
    actor_id: user.id,
    action,
    details,
  });
  if (error) throw new Error(`تعذّر تسجيل الإجراء الإداري: ${error.message}`);
}

export async function getAdminOverview(): Promise<AdminOverview> {
  requireAdminBackend();
  const client = getSupabaseClient();
  const [profiles, courses, enrollments, orders, progress] = await Promise.all([
    client
      .from("profiles")
      .select("id, full_name, email, phone, role, created_at")
      .eq("role", "student")
      .order("created_at", { ascending: false }),
    client
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false }),
    client.from("course_enrollments").select("user_id, course_id, created_at"),
    client.from("orders").select("user_id, course_id, amount, status, created_at"),
    client.from("student_progress").select("user_id, progress, updated_at"),
  ]);
  if (profiles.error) throw new Error(`تعذّر تحميل الطلاب: ${profiles.error.message}`);
  if (courses.error) throw new Error(`تعذّر تحميل الكورسات: ${courses.error.message}`);
  if (enrollments.error)
    throw new Error(`تعذّر تحميل التسجيلات: ${enrollments.error.message}`);
  if (orders.error) throw new Error(`تعذّر تحميل الطلبات: ${orders.error.message}`);
  if (progress.error)
    throw new Error(`تعذّر تحميل تقدّم الطلاب: ${progress.error.message}`);

  const courseById = new Map((courses.data ?? []).map((course) => [course.id, course]));
  const enrollmentByUser = new Map<string, Map<string, string>>();
  for (const enrollment of enrollments.data ?? []) {
    const byCourse = enrollmentByUser.get(enrollment.user_id) ?? new Map();
    byCourse.set(enrollment.course_id, "مسجل مجانًا");
    enrollmentByUser.set(enrollment.user_id, byCourse);
  }
  const approvedOrders = (orders.data ?? []).filter(
    (order) => order.status === "approved",
  );
  for (const order of approvedOrders) {
    const byCourse = enrollmentByUser.get(order.user_id) ?? new Map();
    byCourse.set(order.course_id, "اشتراك معتمد");
    enrollmentByUser.set(order.user_id, byCourse);
  }
  const progressByUser = new Map(
    (progress.data ?? []).map((record) => [record.user_id, record]),
  );
  const students: AdminStudent[] = (profiles.data ?? []).map((profile) => {
    const studentProgress = progressByUser.get(profile.id);
    const progressValue = studentProgress?.progress;
    const progressObject =
      typeof progressValue === "object" &&
      progressValue !== null &&
      !Array.isArray(progressValue)
        ? progressValue
        : {};
    const completedLessonIds = Array.isArray(progressObject.completedLessonIds)
      ? progressObject.completedLessonIds
      : [];
    const quizScores =
      typeof progressObject.quizBestScores === "object" &&
      progressObject.quizBestScores !== null &&
      !Array.isArray(progressObject.quizBestScores)
        ? Object.values(progressObject.quizBestScores)
        : [];
    const levelTestResult =
      typeof progressObject.levelTestResult === "object" &&
      progressObject.levelTestResult !== null &&
      "score" in progressObject.levelTestResult &&
      typeof progressObject.levelTestResult.score === "number"
        ? progressObject.levelTestResult.score
        : null;
    const watchedSeconds =
      typeof progressObject.watchedSeconds === "number"
        ? progressObject.watchedSeconds
        : 0;
    return {
      ...profile,
      enrolledCourses: Array.from(enrollmentByUser.get(profile.id) ?? []).map(
        ([courseId, status]) => ({
          id: courseId,
          title: courseById.get(courseId)?.title ?? "كورس محذوف",
          status,
        }),
      ),
      completedLessons: completedLessonIds.length,
      watchedMinutes: Math.floor(watchedSeconds / 60),
      latestActivity: studentProgress?.updated_at ?? null,
      quizCount: quizScores.length,
      levelTestScore: levelTestResult,
    };
  });

  const approvedSubscriptions = new Set(
    approvedOrders.map((order) => `${order.user_id}:${order.course_id}`),
  );
  const freeSubscriptions = new Set(
    (enrollments.data ?? []).map(
      (enrollment) => `${enrollment.user_id}:${enrollment.course_id}`,
    ),
  );
  const subscribersByCourse = new Map<string, Set<string>>();
  for (const { course_id, user_id } of [
    ...(enrollments.data ?? []),
    ...approvedOrders,
  ]) {
    const subscribers = subscribersByCourse.get(course_id) ?? new Set<string>();
    subscribers.add(user_id);
    subscribersByCourse.set(course_id, subscribers);
  }
  const levelTestScores = students
    .map((student) => student.levelTestScore)
    .filter((score): score is number => score !== null);

  return {
    students,
    courses: courses.data ?? [],
    pendingOrders: (orders.data ?? []).filter(
      (order) => order.status === "pending",
    ).length,
    approvedSubscriptions: new Set([
      ...approvedSubscriptions,
      ...freeSubscriptions,
    ]).size,
    totalRevenue: approvedOrders.reduce((sum, order) => sum + Number(order.amount), 0),
    activeStudents: students.filter(
      (student) =>
        student.completedLessons > 0 ||
        student.watchedMinutes > 0 ||
        student.quizCount > 0,
    ).length,
    coursePopularity: Array.from(subscribersByCourse, ([courseId, subscribers]) => ({
      courseId,
      title: courseById.get(courseId)?.title ?? "كورس محذوف",
      subscriptions: subscribers.size,
    })).sort((left, right) => right.subscriptions - left.subscriptions),
    averageLevelTestScore: levelTestScores.length
      ? Math.round(
          levelTestScores.reduce((sum, score) => sum + score, 0) /
            levelTestScores.length,
        )
      : null,
  };
}

export async function saveAdminCourse(
  input: Database["public"]["Tables"]["courses"]["Insert"],
  courseId?: string,
): Promise<void> {
  requireAdminBackend();
  const client = getSupabaseClient();
  if (courseId) {
    const updates: Database["public"]["Tables"]["courses"]["Update"] = {
      title: input.title,
      description: input.description,
      price: input.price,
      thumbnail_url: input.thumbnail_url,
      is_free: input.is_free,
      category: input.category,
      level: input.level,
      duration_text: input.duration_text,
      grade: input.grade,
      academic_system: input.academic_system,
      term: input.term,
      created_by: input.created_by,
    };
    const { error } = await client
      .from("courses")
      .update(updates)
      .eq("id", courseId);
    if (error) throw new Error(`تعذّر تحديث الكورس: ${error.message}`);
    await logAdminActivity("تعديل كورس", input.title);
    return;
  }
  const { error } = await client.from("courses").insert(input);
  if (error) throw new Error(`تعذّر إضافة الكورس: ${error.message}`);
  await logAdminActivity("إضافة كورس", input.title);
}

export async function deleteAdminCourse(courseId: string): Promise<void> {
  requireAdminBackend();
  const client = getSupabaseClient();
  const { data: course, error: fetchError } = await client
    .from("courses")
    .select("title")
    .eq("id", courseId)
    .single();
  if (fetchError) throw new Error(`تعذّر العثور على الكورس: ${fetchError.message}`);
  const { error } = await client.from("courses").delete().eq("id", courseId);
  if (error)
    throw new Error(
      `تعذّر حذف الكورس (قد توجد طلبات اشتراك مرتبطة به): ${error.message}`,
    );
  await logAdminActivity("حذف كورس", course.title);
}

export async function getAdminLessons(): Promise<ManagedLesson[]> {
  requireAdminBackend();
  const { data, error } = await getSupabaseClient()
    .from("lessons")
    .select("*")
    .order("course_id")
    .order("sort_order");
  if (error) throw new Error(`تعذّر تحميل الدروس: ${error.message}`);
  return data ?? [];
}

export async function saveAdminLesson(
  lesson: Database["public"]["Tables"]["lessons"]["Insert"],
  lessonId?: string,
): Promise<void> {
  requireAdminBackend();
  const client = getSupabaseClient();
  if (lessonId) {
    const updates: Database["public"]["Tables"]["lessons"]["Update"] = {
      course_id: lesson.course_id,
      title: lesson.title,
      summary: lesson.summary,
      video_src: lesson.video_src,
      duration: lesson.duration,
      key_points: lesson.key_points,
      sort_order: lesson.sort_order,
      updated_at: new Date().toISOString(),
    };
    const { error } = await client
      .from("lessons")
      .update(updates)
      .eq("id", lessonId);
    if (error) throw new Error(`تعذّر تحديث الدرس: ${error.message}`);
    await logAdminActivity("تعديل درس", lesson.title);
    return;
  }
  const { error } = await client.from("lessons").insert(lesson);
  if (error) throw new Error(`تعذّر إضافة الدرس: ${error.message}`);
  await logAdminActivity("إضافة درس", lesson.title);
}

export async function deleteAdminLesson(lessonId: string): Promise<void> {
  requireAdminBackend();
  const client = getSupabaseClient();
  const { data: lesson, error: fetchError } = await client
    .from("lessons")
    .select("title")
    .eq("id", lessonId)
    .single();
  if (fetchError) throw new Error(`تعذّر العثور على الدرس: ${fetchError.message}`);
  const { error } = await client.from("lessons").delete().eq("id", lessonId);
  if (error) throw new Error(`تعذّر حذف الدرس: ${error.message}`);
  await logAdminActivity("حذف درس", lesson.title);
}

export async function getAdminActivity(): Promise<AdminActivity[]> {
  requireAdminBackend();
  const { data, error } = await getSupabaseClient()
    .from("admin_activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(`تعذّر تحميل سجل الإدارة: ${error.message}`);
  return data ?? [];
}
