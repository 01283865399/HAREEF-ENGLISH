import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function logAdminActivity(
  client: SupabaseClient,
  user: User,
  action: string,
  details: string,
) {
  const { error } = await client.from("admin_activity_log").insert({
    actor_id: user.id,
    action,
    details,
  });
  if (error) throw error;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
