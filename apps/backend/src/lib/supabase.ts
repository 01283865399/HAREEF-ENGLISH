import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { Database } from "./database";
import { ApiError } from "./http";

function getConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new ApiError(503, "supabase_not_configured");
  }
  return { url, anonKey };
}

function createSupabaseClient(accessToken?: string): SupabaseClient<Database> {
  const { url, anonKey } = getConfig();
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    ...(accessToken
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : {}),
  });
}

export function publicSupabaseClient(): SupabaseClient<Database> {
  return createSupabaseClient();
}

export async function authenticatedSupabaseClient(
  request: NextRequest,
): Promise<{ client: SupabaseClient; user: User }> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/iu);
  if (!match) throw new ApiError(401, "authentication_required");

  const accessToken = match[1].trim();
  if (!accessToken) throw new ApiError(401, "authentication_required");

  const client = createSupabaseClient(accessToken);
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) throw new ApiError(401, "invalid_session");
  return { client, user: data.user };
}

export async function adminSupabaseClient(request: NextRequest) {
  const authenticated = await authenticatedSupabaseClient(request);
  const { data, error } = await authenticated.client.rpc("is_admin");
  if (error) throw new ApiError(503, "admin_check_failed");
  if (data !== true) throw new ApiError(403, "admin_required");
  return authenticated;
}
