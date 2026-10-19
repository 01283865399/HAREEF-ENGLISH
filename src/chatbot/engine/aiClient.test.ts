import { afterEach, describe, expect, it, vi } from "vitest";
import { askAI } from "./aiClient";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("AI client API contract", () => {
  it("sends a same-origin request with at most six history messages", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ reply: "إجابة" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const history = Array.from({ length: 8 }, (_, index) => ({
      role: index % 2 ? ("model" as const) : ("user" as const),
      text: `${index}`,
    }));

    await expect(askAI("سؤال", history)).resolves.toEqual({ reply: "إجابة" });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/chat");
    expect(JSON.parse(String(options.body)).history).toHaveLength(6);
  });

  it("maps server rate limits and failures to stable error variants", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: "rate_limit" }),
      }),
    );
    await expect(askAI("سؤال")).resolves.toEqual({ error: "rate_limit" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ error: "ai_failed" }),
      }),
    );
    await expect(askAI("سؤال")).resolves.toEqual({ error: "failed" });
  });

  it("uses AbortController timeout and maps network errors to failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(askAI("سؤال")).resolves.toEqual({ error: "failed" });
  });

  it("aborts requests after the 15-second deadline", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, options: RequestInit) =>
          new Promise((_, reject) => {
            options.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      ),
    );
    const request = askAI("سؤال");
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(request).resolves.toEqual({ error: "failed" });
    vi.useRealTimers();
  });
});
