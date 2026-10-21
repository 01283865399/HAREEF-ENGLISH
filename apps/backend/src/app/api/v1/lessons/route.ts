import { NextRequest } from "next/server";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { authenticatedSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { client } = await authenticatedSupabaseClient(request);
    const { data, error } = await client
      .from("lessons")
      .select("id, course_id, title, summary, video_src, duration, key_points")
      .order("sort_order", { ascending: true });
    if (error) throw new ApiError(400, "lessons_load_failed");
    return json(request, { lessons: data ?? [] });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
