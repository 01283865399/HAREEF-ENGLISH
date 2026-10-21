import { NextRequest } from "next/server";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { authenticatedSupabaseClient } from "@/lib/supabase";

const MAX_PROGRESS_BYTES = 64 * 1024;

export async function GET(request: NextRequest) {
  try {
    const { client, user } = await authenticatedSupabaseClient(request);
    const { data, error } = await client
      .from("student_progress")
      .select("progress")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new ApiError(400, "progress_load_failed");
    return json(request, { progress: data?.progress ?? null });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { client, user } = await authenticatedSupabaseClient(request);
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_PROGRESS_BYTES) {
      throw new ApiError(413, "progress_too_large");
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new ApiError(400, "invalid_progress");
    }
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !("progress" in body) ||
      !body.progress ||
      typeof body.progress !== "object" ||
      Array.isArray(body.progress)
    ) {
      throw new ApiError(400, "invalid_progress");
    }
    const { error } = await client.from("student_progress").upsert(
      {
        user_id: user.id,
        progress: body.progress,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new ApiError(400, "progress_save_failed");
    return json(request, { saved: true });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
