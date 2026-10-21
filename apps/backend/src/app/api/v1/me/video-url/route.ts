import { NextRequest } from "next/server";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { authenticatedSupabaseClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { client } = await authenticatedSupabaseClient(request);
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !("storagePath" in body) ||
      typeof body.storagePath !== "string" ||
      !body.storagePath.trim() ||
      body.storagePath.length > 512 ||
      body.storagePath.includes("..")
    ) {
      throw new ApiError(400, "invalid_video_path");
    }
    const { data, error } = await client.storage
      .from("course-videos")
      .createSignedUrl(body.storagePath, 60 * 60);
    if (error || !data?.signedUrl) {
      throw new ApiError(403, "video_access_denied");
    }
    return json(request, { url: data.signedUrl });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
