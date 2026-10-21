import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "https://hareef-english.vercel.app",
  "https://appassets.androidplatform.net",
];

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}

function allowedOrigins(): Set<string> {
  const configured = process.env.ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set(configured?.length ? configured : DEFAULT_ORIGINS);
}

export function withCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin");
  if (origin && allowedOrigins().has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    response.headers.set("Access-Control-Max-Age", "600");
    response.headers.append("Vary", "Origin");
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function json(
  request: NextRequest,
  data: unknown,
  status = 200,
): NextResponse {
  return withCors(request, NextResponse.json(data, { status }));
}

export function preflight(request: NextRequest): NextResponse {
  return withCors(request, new NextResponse(null, { status: 204 }));
}

export function errorResponse(
  request: NextRequest,
  error: unknown,
): NextResponse {
  if (error instanceof ApiError) {
    return json(request, { error: error.code }, error.status);
  }
  if (error instanceof SyntaxError) {
    return json(request, { error: "invalid_json" }, 400);
  }
  const diagnostic =
    error instanceof Error
      ? { name: error.name, message: error.message.slice(0, 300) }
      : { type: typeof error };
  console.error("[API] Request failed", diagnostic);
  return json(request, { error: "internal_error" }, 500);
}

export function methodNotAllowed(request: NextRequest, allow: string[]) {
  const response = json(request, { error: "method_not_allowed" }, 405);
  response.headers.set("Allow", [...allow, "OPTIONS"].join(", "));
  return response;
}
