import { NextRequest } from "next/server";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { adminSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { client } = await adminSupabaseClient(request);
    const [profiles, courses, enrollments, orders, progress] =
      await Promise.all([
        client
          .from("profiles")
          .select("id, full_name, email, phone, role, created_at")
          .eq("role", "student")
          .order("created_at", { ascending: false }),
        client
          .from("courses")
          .select("*")
          .order("created_at", { ascending: false }),
        client
          .from("course_enrollments")
          .select("user_id, course_id, created_at"),
        client
          .from("orders")
          .select("user_id, course_id, amount, status, created_at"),
        client.from("student_progress").select("user_id, progress, updated_at"),
      ]);
    if (
      profiles.error ||
      courses.error ||
      enrollments.error ||
      orders.error ||
      progress.error
    ) {
      throw new ApiError(400, "admin_overview_load_failed");
    }
    return json(request, {
      profiles: profiles.data ?? [],
      courses: courses.data ?? [],
      enrollments: enrollments.data ?? [],
      orders: orders.data ?? [],
      progress: progress.data ?? [],
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
