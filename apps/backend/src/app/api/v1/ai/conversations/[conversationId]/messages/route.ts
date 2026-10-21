import { NextRequest } from "next/server";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { authenticatedSupabaseClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ conversationId: string }> };
const MAX_MESSAGE_LENGTH = 10_000;

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { client, user } = await authenticatedSupabaseClient(request);
    const { conversationId } = await context.params;
    const { data, error } = await client
      .from("ai_messages")
      .select("*")
      .eq("user_id", user.id)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new ApiError(400, "messages_load_failed");
    return json(request, { messages: data ?? [] });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { client, user } = await authenticatedSupabaseClient(request);
    const { conversationId } = await context.params;
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !("role" in body) ||
      !["assistant", "student"].includes(String(body.role)) ||
      !("text" in body) ||
      typeof body.text !== "string" ||
      !body.text.trim() ||
      body.text.length > MAX_MESSAGE_LENGTH ||
      !("source" in body) ||
      !(body.source === "ai" || body.source === null)
    ) {
      throw new ApiError(400, "invalid_message");
    }
    const { error: messageError } = await client.from("ai_messages").insert({
      user_id: user.id,
      conversation_id: conversationId,
      role: body.role,
      text: body.text.trim(),
      source: body.source,
    });
    if (messageError) throw new ApiError(400, "message_save_failed");

    const { error: updateError } = await client
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", user.id);
    if (updateError) {
      console.error("[AI] Message saved but conversation timestamp update failed", {
        conversationId,
        message: updateError.message.slice(0, 200),
      });
      throw new ApiError(500, "conversation_timestamp_update_failed");
    }
    return json(request, { saved: true }, 201);
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
