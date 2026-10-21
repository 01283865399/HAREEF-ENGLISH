import { NextRequest } from "next/server";
import { errorResponse, json, preflight } from "@/lib/http";
import { publicSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const client = publicSupabaseClient();
    const [
      { data: courses, error: coursesError },
      { data: lessons, error: lessonsError },
    ] = await Promise.all([
      client
        .from("courses")
        .select(
          "id, title, description, price, thumbnail_url, is_free, category, level, lesson_count, duration_text, grade, academic_system, term",
        )
        .order("created_at", { ascending: false }),
      client.rpc("get_lesson_catalog"),
    ]);

    if (coursesError || lessonsError) {
      throw new Error(coursesError?.message ?? lessonsError?.message);
    }

    return json(request, { courses: courses ?? [], lessons: lessons ?? [] });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
