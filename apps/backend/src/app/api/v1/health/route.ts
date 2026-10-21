import { NextRequest } from "next/server";
import { json, preflight } from "@/lib/http";

export function GET(request: NextRequest) {
  return json(request, { status: "ok", service: "hareef-english-backend" });
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}
