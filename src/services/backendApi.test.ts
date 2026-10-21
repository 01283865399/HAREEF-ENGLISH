import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: () => ({ auth: { getSession } }),
}));

import { backendRequest, isBackendApiConfigured } from "./backendApi";

describe("backend API client", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE", "https://hareef-api.example/");
    getSession.mockResolvedValue({
      data: { session: { access_token: "supabase-access-token" } },
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends the Supabase access token and normalizes the configured API origin", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ isAdmin: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      backendRequest<{ isAdmin: boolean }>("/admin/role"),
    ).resolves.toEqual({
      isAdmin: true,
    });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hareef-api.example/api/v1/admin/role");
    expect(new Headers(options.headers).get("Authorization")).toBe(
      "Bearer supabase-access-token",
    );
  });

  it("does not require a session for explicitly public requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ courses: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await backendRequest("/courses", {}, false);
    expect(getSession).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://hareef-api.example/api/v1/courses",
      expect.any(Object),
    );
  });

  it("reports whether the API origin is configured", () => {
    expect(isBackendApiConfigured()).toBe(true);
    vi.stubEnv("VITE_API_BASE", "");
    expect(isBackendApiConfigured()).toBe(false);
  });
});
