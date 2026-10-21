import { NextRequest } from "next/server";
import { isRecord } from "@/lib/admin";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";
import { adminSupabaseClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { client } = await adminSupabaseClient(request);
    const body: unknown = await request.json();
    if (!isRecord(body) || typeof body.path !== "string") {
      throw new ApiError(400, "invalid_receipt_path");
    }
    const { data, error } = await client.storage
      .from("payment-receipts")
      .createSignedUrl(body.path, 5 * 60);
    if (error || !data?.signedUrl) {
      throw new ApiError(404, "receipt_not_found");
    }
    return json(request, { url: data.signedUrl });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
