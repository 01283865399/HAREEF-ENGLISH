import { getSupabaseClient, type Database } from "../lib/supabase";

export type StoredAIMessage = Database["public"]["Tables"]["ai_messages"]["Row"];
export type AIConversation =
  Database["public"]["Tables"]["ai_conversations"]["Row"];

export async function listAIConversations(userId: string) {
  const { data, error } = await getSupabaseClient()
    .from("ai_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createAIConversation(userId: string, title: string) {
  const { data, error } = await getSupabaseClient()
    .from("ai_conversations")
    .insert({ user_id: userId, title })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function loadAIMessages(
  userId: string,
  conversationId: string,
) {
  const { data, error } = await getSupabaseClient()
    .from("ai_messages")
    .select("*")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function saveAIMessage(
  userId: string,
  conversationId: string,
  message: Pick<StoredAIMessage, "role" | "text" | "source">,
) {
  const client = getSupabaseClient();
  const { error: messageError } = await client.from("ai_messages").insert({
    user_id: userId,
    conversation_id: conversationId,
    ...message,
  });
  if (messageError) throw messageError;
  const { error: conversationError } = await client
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", userId);
  if (conversationError) throw conversationError;
}

export async function renameAIConversation(
  userId: string,
  conversationId: string,
  title: string,
) {
  const { error } = await getSupabaseClient()
    .from("ai_conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteAIConversation(
  userId: string,
  conversationId: string,
) {
  const { error } = await getSupabaseClient()
    .from("ai_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", userId);
  if (error) throw error;
}
