import { NextRequest } from "next/server";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { authenticatedSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { client } = await authenticatedSupabaseClient(request);
    const courseId = request.nextUrl.searchParams.get("courseId");
    if (!courseId) throw new ApiError(400, "course_id_required");
    const { data, error } = await client.rpc("can_access_course", {
      p_course_id: courseId,
    });
    if (error) throw new ApiError(400, "course_access_check_failed");
    return json(request, { canAccess: data === true });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
