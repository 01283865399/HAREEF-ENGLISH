import { NextRequest } from "next/server";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { authenticatedSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { client } = await authenticatedSupabaseClient(request);
    const [enrollments, orders] = await Promise.all([
      client.from("course_enrollments").select("course_id"),
      client.from("orders").select("course_id").eq("status", "approved"),
    ]);
    if (enrollments.error || orders.error) {
      throw new ApiError(400, "enrollments_load_failed");
    }
    return json(request, {
      courseIds: [
        ...new Set([
          ...(enrollments.data ?? []).map(({ course_id }) => course_id),
          ...(orders.data ?? []).map(({ course_id }) => course_id),
        ]),
      ],
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client, user } = await authenticatedSupabaseClient(request);
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !("course_id" in body) ||
      typeof body.course_id !== "string" ||
      !body.course_id.trim()
    ) {
      throw new ApiError(400, "invalid_course_id");
    }
    const courseId = body.course_id.trim();
    const { data: course, error: courseError } = await client
      .from("courses")
      .select("is_free")
      .eq("id", courseId)
      .maybeSingle();
    if (courseError) throw new ApiError(400, "course_check_failed");
    if (!course) throw new ApiError(404, "course_not_found");
    if (!course.is_free) throw new ApiError(400, "course_is_paid");

    const { error } = await client
      .from("course_enrollments")
      .upsert(
        { user_id: user.id, course_id: courseId },
        { onConflict: "user_id,course_id", ignoreDuplicates: true },
      );
    if (error) throw new ApiError(400, "enrollment_failed");
    return json(request, { courseId }, 201);
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
