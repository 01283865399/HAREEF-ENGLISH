import { NextRequest } from "next/server";
import { logAdminActivity, isRecord } from "@/lib/admin";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { adminSupabaseClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ courseId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { client, user } = await adminSupabaseClient(request);
    const { courseId } = await context.params;
    const body: unknown = await request.json();
    if (!isRecord(body) || Object.keys(body).length === 0) {
      throw new ApiError(400, "invalid_course_update");
    }
    const allowed = [
      "title",
      "description",
      "price",
      "thumbnail_url",
      "is_free",
      "category",
      "level",
      "lesson_count",
      "duration_text",
      "grade",
      "academic_system",
      "term",
    ];
    const updates = Object.fromEntries(
      Object.entries(body).filter(([key]) => allowed.includes(key)),
    );
    if (Object.keys(updates).length !== Object.keys(body).length) {
      throw new ApiError(400, "invalid_course_update");
    }
    const { data, error } = await client
      .from("courses")
      .update(updates)
      .eq("id", courseId)
      .select("title")
      .maybeSingle();
    if (error) throw new ApiError(400, "course_update_failed");
    if (!data) throw new ApiError(404, "course_not_found");
    await logAdminActivity(client, user, "تعديل كورس", data.title);
    return json(request, { courseId });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { client, user } = await adminSupabaseClient(request);
    const { courseId } = await context.params;
    const { data: course, error: fetchError } = await client
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .maybeSingle();
    if (fetchError) throw new ApiError(400, "course_load_failed");
    if (!course) throw new ApiError(404, "course_not_found");
    const { error } = await client.from("courses").delete().eq("id", courseId);
    if (error) throw new ApiError(409, "course_delete_failed");
    await logAdminActivity(client, user, "حذف كورس", course.title);
    return json(request, { courseId });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
