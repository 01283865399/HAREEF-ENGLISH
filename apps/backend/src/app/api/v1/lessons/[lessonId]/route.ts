import { NextRequest } from "next/server";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { authenticatedSupabaseClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ lessonId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { client } = await authenticatedSupabaseClient(request);
    const { lessonId } = await context.params;
    const { data: catalog, error: catalogError } =
      await client.rpc("get_lesson_catalog");
    if (catalogError) throw new ApiError(503, "lesson_catalog_load_failed");
    const lessonSummary = catalog?.find(
      (lesson: { id: string; course_id: string }) => lesson.id === lessonId,
    );
    if (!lessonSummary) throw new ApiError(404, "lesson_not_found");

    const { data: access, error: accessError } = await client.rpc(
      "can_access_course",
      { p_course_id: lessonSummary.course_id },
    );
    if (accessError) throw new ApiError(503, "course_access_check_failed");
    if (access !== true) return json(request, { lesson: lessonSummary });

    const { data, error } = await client
      .from("lessons")
      .select("id, course_id, title, summary, video_src, duration, key_points")
      .eq("id", lessonId)
      .maybeSingle();
    if (error) throw new ApiError(400, "lesson_load_failed");
    if (!data) throw new ApiError(404, "lesson_not_found");
    return json(request, { lesson: data });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
