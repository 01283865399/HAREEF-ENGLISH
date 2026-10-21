import { NextRequest } from "next/server";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { adminSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { client } = await adminSupabaseClient(request);
    const { data, error } = await client
      .from("admin_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new ApiError(400, "admin_activity_load_failed");
    return json(request, { activity: data ?? [] });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
