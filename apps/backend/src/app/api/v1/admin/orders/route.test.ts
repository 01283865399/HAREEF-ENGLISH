import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

describe("admin orders authorization", () => {
  it("rejects requests without a Supabase access token", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/admin/orders",
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "authentication_required",
    });
  });
});
