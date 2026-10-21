import { NextRequest } from "next/server";
import { logAdminActivity, isRecord, isNonEmptyString } from "@/lib/admin";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { adminSupabaseClient } from "@/lib/supabase";

interface LessonInput extends Record<string, unknown> {
  id: string;
  course_id: string;
  title: string;
  summary: string;
  video_src: string;
  duration: string;
  sort_order: number;
}

function isValidLesson(value: unknown): value is LessonInput {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    /^[a-z0-9_-]{1,120}$/iu.test(String(value.id)) &&
    isNonEmptyString(value.course_id) &&
    isNonEmptyString(value.title) &&
    value.title.trim().length <= 200 &&
    typeof value.summary === "string" &&
    typeof value.video_src === "string" &&
    typeof value.duration === "string" &&
    typeof value.sort_order === "number" &&
    Number.isInteger(value.sort_order) &&
    value.sort_order >= 0 &&
    (value.key_points === undefined || Array.isArray(value.key_points))
  );
}

export async function GET(request: NextRequest) {
  try {
    const { client } = await adminSupabaseClient(request);
    const { data, error } = await client
      .from("lessons")
      .select("*")
      .order("course_id")
      .order("sort_order");
    if (error) throw new ApiError(400, "lessons_load_failed");
    return json(request, { lessons: data ?? [] });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client, user } = await adminSupabaseClient(request);
    const body: unknown = await request.json();
    if (!isValidLesson(body)) throw new ApiError(400, "invalid_lesson");
    const lessonInput = body;
    const lesson = {
      id: lessonInput.id.trim(),
      course_id: lessonInput.course_id.trim(),
      title: lessonInput.title.trim(),
      summary: lessonInput.summary,
      video_src: lessonInput.video_src,
      duration: lessonInput.duration,
      key_points: lessonInput.key_points ?? [],
      sort_order: lessonInput.sort_order,
    };
    const { error } = await client.from("lessons").insert(lesson);
    if (error)
      throw new ApiError(
        error.code === "23505" ? 409 : 400,
        "lesson_create_failed",
      );
    await logAdminActivity(client, user, "إضافة درس", lesson.title);
    return json(request, { lessonId: lesson.id }, 201);
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
