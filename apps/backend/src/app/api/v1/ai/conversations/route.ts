import { NextRequest } from "next/server";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { authenticatedSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { client, user } = await authenticatedSupabaseClient(request);
    const { data, error } = await client
      .from("ai_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) throw new ApiError(400, "conversations_load_failed");
    return json(request, { conversations: data ?? [] });
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
      !("title" in body) ||
      typeof body.title !== "string" ||
      body.title.trim().length > 120
    ) {
      throw new ApiError(400, "invalid_conversation_title");
    }
    const { data, error } = await client
      .from("ai_conversations")
      .insert({ user_id: user.id, title: body.title.trim() })
      .select("*")
      .single();
    if (error) throw new ApiError(400, "conversation_create_failed");
    return json(request, { conversation: data }, 201);
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
