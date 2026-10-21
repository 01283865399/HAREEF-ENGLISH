import type { ProgressState } from "../types/domain";
import { getSupabaseClient, type Json } from "../lib/supabase";
import { backendRequest, isBackendApiConfigured } from "./backendApi";

export async function getStudentProgress(
  userId: string,
): Promise<unknown | null> {
  if (isBackendApiConfigured()) {
    const result = await backendRequest<{ progress: unknown | null }>(
      "/me/progress",
    );
    return result.progress;
  }
  const { data, error } = await getSupabaseClient()
    .from("student_progress")
    .select("progress")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`تعذّر تحميل تقدّمك المحفوظ: ${error.message}`);
  return data?.progress ?? null;
}

export async function saveStudentProgress(
  userId: string,
  progress: ProgressState,
): Promise<void> {
  const jsonProgress = JSON.parse(JSON.stringify(progress)) as Json;
  if (isBackendApiConfigured()) {
    await backendRequest("/me/progress", {
      method: "PUT",
      body: JSON.stringify({ progress: jsonProgress }),
    });
    return;
  }
  const { error } = await getSupabaseClient().from("student_progress").upsert(
    {
      user_id: userId,
      progress: jsonProgress,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`تعذّرت مزامنة تقدّمك: ${error.message}`);
}

export async function getMyEnrolledCourseIds(): Promise<string[]> {
  if (isBackendApiConfigured()) {
    const result = await backendRequest<{ courseIds: string[] }>(
      "/me/enrollments",
    );
    return result.courseIds;
  }
  const client = getSupabaseClient();
  const [enrollments, approvedOrders] = await Promise.all([
    client.from("course_enrollments").select("course_id"),
    client.from("orders").select("course_id").eq("status", "approved"),
  ]);
  if (enrollments.error)
    throw new Error(
      `تعذّر تحميل اشتراكاتك المجانية: ${enrollments.error.message}`,
    );
  if (approvedOrders.error)
    throw new Error(
      `تعذّر تحميل اشتراكاتك المعتمدة: ${approvedOrders.error.message}`,
    );
  return [
    ...new Set([
      ...(enrollments.data ?? []).map(({ course_id }) => course_id),
      ...(approvedOrders.data ?? []).map(({ course_id }) => course_id),
    ]),
  ];
}

export async function enrollInFreeCourse(courseId: string): Promise<void> {
  if (isBackendApiConfigured()) {
    await backendRequest("/me/enrollments", {
      method: "POST",
      body: JSON.stringify({ course_id: courseId }),
    });
    return;
  }
  const client = getSupabaseClient();
  const { data: course, error: courseError } = await client
    .from("courses")
    .select("is_free")
    .eq("id", courseId)
    .single();
  if (courseError)
    throw new Error(`تعذّر التحقق من الكورس: ${courseError.message}`);
  if (!course.is_free) throw new Error("هذا الكورس ليس مجانيًا.");

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(`تعذّر التحقق من حسابك: ${userError.message}`);
  if (!userData.user) throw new Error("سجّل الدخول للاشتراك في الكورس.");

  const { error } = await client
    .from("course_enrollments")
    .upsert(
      { user_id: userData.user.id, course_id: courseId },
      { onConflict: "user_id,course_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(`تعذّر تسجيل اشتراكك: ${error.message}`);
}
