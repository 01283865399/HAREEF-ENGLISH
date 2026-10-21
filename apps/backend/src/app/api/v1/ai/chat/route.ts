import { NextRequest } from "next/server";
import {
  assertAIRateLimit,
  generateAIReply,
  getDeveloperInfoReply,
  validateAIRequest,
} from "@/lib/ai";
import { ApiError, errorResponse, json, preflight } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    assertAIRateLimit(ip);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "invalid_request");
    }
    const input = validateAIRequest(body);
    const reply =
      getDeveloperInfoReply(input.message) ??
      (await generateAIReply(input.message, input.history));
    return json(request, { reply });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
