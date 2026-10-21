import { NextRequest } from "next/server";
import { logAdminActivity, isRecord, isNonEmptyString } from "@/lib/admin";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { adminSupabaseClient } from "@/lib/supabase";

const CATEGORIES = new Set(["نحو", "صرف", "بلاغة", "أدب"]);

interface CourseInput extends Record<string, unknown> {
  id: string;
  title: string;
  price: number;
  is_free: boolean;
  category: string;
  description: string;
  thumbnail_url: string;
  level: string;
  duration_text: string;
}

function isValidCourse(value: unknown): value is CourseInput {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    /^[a-z0-9_-]{1,120}$/iu.test(String(value.id)) &&
    isNonEmptyString(value.title) &&
    value.title.trim().length <= 200 &&
    typeof value.price === "number" &&
    Number.isFinite(value.price) &&
    value.price >= 0 &&
    typeof value.is_free === "boolean" &&
    typeof value.category === "string" &&
    CATEGORIES.has(value.category) &&
    typeof value.description === "string" &&
    typeof value.thumbnail_url === "string" &&
    typeof value.level === "string" &&
    typeof value.duration_text === "string"
  );
}

export async function GET(request: NextRequest) {
  try {
    const { client } = await adminSupabaseClient(request);
    const { data, error } = await client
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new ApiError(400, "courses_load_failed");
    return json(request, { courses: data ?? [] });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client, user } = await adminSupabaseClient(request);
    const body: unknown = await request.json();
    if (!isValidCourse(body)) throw new ApiError(400, "invalid_course");
    const courseInput = body;
    const course = {
      id: courseInput.id.trim(),
      title: courseInput.title.trim(),
      description: courseInput.description,
      price: courseInput.price,
      thumbnail_url: courseInput.thumbnail_url,
      is_free: courseInput.is_free,
      category: courseInput.category,
      level: courseInput.level,
      lesson_count:
        typeof courseInput.lesson_count === "number" &&
        Number.isInteger(courseInput.lesson_count)
          ? courseInput.lesson_count
          : 0,
      duration_text: courseInput.duration_text,
      grade: typeof courseInput.grade === "string" ? courseInput.grade : null,
      academic_system:
        typeof courseInput.academic_system === "string"
          ? courseInput.academic_system
          : null,
      term: typeof courseInput.term === "string" ? courseInput.term : null,
      created_by: user.id,
    };
    const { error } = await client.from("courses").insert(course);
    if (error)
      throw new ApiError(
        error.code === "23505" ? 409 : 400,
        "course_create_failed",
      );
    await logAdminActivity(client, user, "إضافة كورس", course.title);
    return json(request, { courseId: course.id }, 201);
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
