import { NextRequest } from "next/server";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { authenticatedSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { client, user } = await authenticatedSupabaseClient(request);
    const { data, error } = await client
      .from("profiles")
      .select("full_name, email, phone, role")
      .eq("id", user.id)
      .single();
    if (error || !data) throw new ApiError(404, "profile_not_found");
    return json(request, { profile: data });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
