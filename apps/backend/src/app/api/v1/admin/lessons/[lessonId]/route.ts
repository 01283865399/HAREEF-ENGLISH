import { NextRequest } from "next/server";
import { logAdminActivity, isRecord } from "@/lib/admin";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { adminSupabaseClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ lessonId: string }> };
const ALLOWED_FIELDS = [
  "course_id",
  "title",
  "summary",
  "video_src",
  "duration",
  "key_points",
  "sort_order",
];

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { client, user } = await adminSupabaseClient(request);
    const { lessonId } = await context.params;
    const body: unknown = await request.json();
    if (!isRecord(body) || Object.keys(body).length === 0) {
      throw new ApiError(400, "invalid_lesson_update");
    }
    const updates = Object.fromEntries(
      Object.entries(body).filter(([key]) => ALLOWED_FIELDS.includes(key)),
    );
    if (Object.keys(updates).length !== Object.keys(body).length) {
      throw new ApiError(400, "invalid_lesson_update");
    }
    const { data, error } = await client
      .from("lessons")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", lessonId)
      .select("title")
      .maybeSingle();
    if (error) throw new ApiError(400, "lesson_update_failed");
    if (!data) throw new ApiError(404, "lesson_not_found");
    await logAdminActivity(client, user, "تعديل درس", data.title);
    return json(request, { lessonId });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { client, user } = await adminSupabaseClient(request);
    const { lessonId } = await context.params;
    const { data: lesson, error: fetchError } = await client
      .from("lessons")
      .select("title")
      .eq("id", lessonId)
      .maybeSingle();
    if (fetchError) throw new ApiError(400, "lesson_load_failed");
    if (!lesson) throw new ApiError(404, "lesson_not_found");
    const { error } = await client.from("lessons").delete().eq("id", lessonId);
    if (error) throw new ApiError(400, "lesson_delete_failed");
    await logAdminActivity(client, user, "حذف درس", lesson.title);
    return json(request, { lessonId });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
