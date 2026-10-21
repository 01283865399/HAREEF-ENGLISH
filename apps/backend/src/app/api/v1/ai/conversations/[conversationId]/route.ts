import { NextRequest } from "next/server";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { authenticatedSupabaseClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { client, user } = await authenticatedSupabaseClient(request);
    const { conversationId } = await context.params;
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !("title" in body) ||
      typeof body.title !== "string" ||
      !body.title.trim() ||
      body.title.trim().length > 120
    ) {
      throw new ApiError(400, "invalid_conversation_title");
    }
    const { data, error } = await client
      .from("ai_conversations")
      .update({
        title: body.title.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) throw new ApiError(400, "conversation_update_failed");
    if (!data) throw new ApiError(404, "conversation_not_found");
    return json(request, { conversationId });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { client, user } = await authenticatedSupabaseClient(request);
    const { conversationId } = await context.params;
    const { data, error } = await client
      .from("ai_conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) throw new ApiError(400, "conversation_delete_failed");
    if (!data) throw new ApiError(404, "conversation_not_found");
    return json(request, { conversationId });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
