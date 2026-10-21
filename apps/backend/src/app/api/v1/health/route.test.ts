import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/http";
import { GET, OPTIONS } from "./route";

describe("health route", () => {
  it("returns a no-store health response", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/health");
    const response = GET(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      service: "hareef-english-backend",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("allows configured browser origins in preflight responses", () => {
    const previous = process.env.ALLOWED_ORIGINS;
    process.env.ALLOWED_ORIGINS = "https://platform.example";
    try {
      const request = new NextRequest("http://localhost:3000/api/v1/health", {
        method: "OPTIONS",
        headers: { origin: "https://platform.example" },
      });
      const response = OPTIONS(request);
      expect(response.status).toBe(204);
      expect(response.headers.get("access-control-allow-origin")).toBe(
        "https://platform.example",
      );
      expect(response.headers.get("access-control-allow-headers")).toContain(
        "Authorization",
      );
    } finally {
      if (previous === undefined) delete process.env.ALLOWED_ORIGINS;
      else process.env.ALLOWED_ORIGINS = previous;
    }
  });

  it("returns a client error for malformed JSON", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/health", {
      method: "POST",
    });
    const response = errorResponse(request, new SyntaxError("Unexpected token"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_json" });
  });
});
