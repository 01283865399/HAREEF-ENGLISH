import { NextRequest } from "next/server";
import { authenticatedSupabaseClient } from "@/lib/supabase";
import { errorResponse, json, preflight } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const { client, user } = await authenticatedSupabaseClient(request);
    const { data, error } = await client.rpc("is_admin");
    if (error) throw new Error("Admin role could not be checked.");
    return json(request, { userId: user.id, isAdmin: data === true });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
