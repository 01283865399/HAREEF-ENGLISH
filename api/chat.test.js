import { afterEach, describe, expect, it, vi } from "vitest";
import handler, { clearResponseCache, validateRequest } from "./chat.js";

afterEach(() => {
  vi.unstubAllEnvs();
  clearResponseCache();
});

function mockResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(value) {
      this.body = value;
    },
  };
}

async function withTestKey(callback) {
  vi.stubEnv("GEMINI_API_KEY", "test-secret-key");
  await callback();
}

describe("Gemini serverless function validation", () => {
  it("handles CORS preflight and allowed origins", async () => {
    const res = mockResponse();
    await handler(
      {
        method: "OPTIONS",
        headers: {
          origin: "http://localhost:5173",
          "access-control-request-method": "POST",
          "access-control-request-headers": "content-type",
        },
      },
      res,
    );
    expect(res.statusCode).toBe(204);
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
    expect(res.headers["Access-Control-Allow-Methods"]).toBe("POST, OPTIONS");
    expect(res.headers["Access-Control-Allow-Headers"]).toBe("Content-Type");
    expect(res.headers.Vary).toBe("Origin");
  });

  it("allows the bundled Android WebView origin", async () => {
    const res = mockResponse();
    await handler(
      {
        method: "OPTIONS",
        headers: { origin: "https://appassets.androidplatform.net" },
      },
      res,
    );
    expect(res.headers["Access-Control-Allow-Origin"]).toBe(
      "https://appassets.androidplatform.net",
    );
    expect(res.headers.Vary).toBe("Origin");
  });

  it("does not grant CORS headers to an untrusted origin", async () => {
    const res = mockResponse();
    await handler(
      {
        method: "OPTIONS",
        headers: { origin: "https://evil.example" },
      },
      res,
    );
    expect(res.statusCode).toBe(204);
    expect(res.headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("keeps same-origin requests functional", async () => {
    const res = mockResponse();
    await handler({ method: "GET", headers: {} }, res);
    expect(res.statusCode).toBe(405);
    expect(JSON.parse(res.body)).toEqual({ error: "method_not_allowed" });
  });

  it("adds CORS headers to error responses for an allowed origin", async () => {
    const res = mockResponse();
    await handler(
      {
        method: "POST",
        headers: { origin: "http://localhost:5173" },
        body: { message: "" },
      },
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(res.headers["Access-Control-Allow-Origin"]).toBe(
      "http://localhost:5173",
    );
    expect(res.headers.Vary).toBe("Origin");
  });

  it("does not allow localhost origins in production by default", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NODE_ENV", "production");
    const res = mockResponse();
    await handler(
      {
        method: "OPTIONS",
        headers: { origin: "http://localhost:5173" },
      },
      res,
    );
    expect(res.statusCode).toBe(204);
    expect(res.headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("rejects empty and oversized messages", () => {
    expect(validateRequest({ message: "" }).error).toBe("invalid_message");
    expect(validateRequest({ message: "   " }).error).toBe("invalid_message");
    expect(validateRequest({ message: "x".repeat(500) }).error).toBe(
      "invalid_message",
    );
  });

  it("keeps at most six valid history messages and truncates each to 500 characters", () => {
    const history = Array.from({ length: 8 }, (_, index) => ({
      role: "user",
      text: `${index}`.repeat(600),
    }));
    const result = validateRequest({ message: "سؤال", history });
    expect(result.history).toHaveLength(6);
    expect(result.history[0].text).toHaveLength(500);
    expect(result.history[0].text.startsWith("2")).toBe(true);
  });

  it("rejects methods other than POST", async () => {
    const res = mockResponse();
    await handler({ method: "GET", headers: {} }, res);
    expect(res.statusCode).toBe(405);
    expect(JSON.parse(res.body)).toEqual({ error: "method_not_allowed" });
  });

  it("rejects invalid POST input with HTTP 400", async () => {
    const res = mockResponse();
    await handler({ method: "POST", headers: {}, body: { message: "" } }, res);
    expect(res.statusCode).toBe(400);
  });

  it("returns a generic HTTP 500 when the key is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const res = mockResponse();
    await handler(
      { method: "POST", headers: {}, body: { message: "اشرح المبتدأ" } },
      res,
    );
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain("GEMINI_API_KEY");
    expect(res.body).not.toContain("test-secret-key");
  });

  it("does not expose Gemini errors or credentials on upstream failures", async () => {
    const originalFetch = globalThis.fetch;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          status: "NOT_FOUND",
          message: "Unknown model AQ.test-secret-value",
        },
      }),
    });
    try {
      vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
      await withTestKey(async () => {
        const res = mockResponse();
        await handler(
          {
            method: "POST",
            headers: {},
            body: { message: "اشرح المبتدأ" },
          },
          res,
        );
        expect(res.statusCode).toBe(502);
        expect(JSON.parse(res.body)).toEqual({ error: "ai_failed" });
        expect(res.body).not.toContain("test-secret-key");
        expect(res.body).not.toContain("NOT_FOUND");
        expect(log).toHaveBeenCalledTimes(2);
        const diagnostic = JSON.parse(
          log.mock.calls[0][0].replace("[Gemini] ", ""),
        );
        expect(diagnostic).toMatchObject({
          status: 404,
          errorStatus: "NOT_FOUND",
          errorMessage: "Unknown model [REDACTED]",
          model: "gemini-2.5-flash",
        });
        expect(log.mock.calls[0][0]).not.toContain("AQ.test-secret-value");
        expect(log.mock.calls[0][0]).not.toContain("test-secret-key");
      });
    } finally {
      globalThis.fetch = originalFetch;
      log.mockRestore();
    }
  });

  it("retries a 404 model with gemini-3.8-flash", async () => {
    const originalFetch = globalThis.fetch;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            status: "NOT_FOUND",
            message: "The configured model is unavailable.",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "الفاعل مرفوع." }] } }],
        }),
      });
    globalThis.fetch = fetchMock;
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    try {
      await withTestKey(async () => {
        const res = mockResponse();
        await handler(
          {
            method: "POST",
            headers: {},
            body: { message: "ما هو الفاعل؟" },
          },
          res,
        );
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body)).toEqual({ reply: "الفاعل مرفوع." });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[0][0]).toContain(
          "/models/gemini-2.5-flash:",
        );
        expect(fetchMock.mock.calls[1][0]).toContain(
          "/models/gemini-3.8-flash:",
        );
        expect(log).toHaveBeenCalledOnce();
      });
    } finally {
      globalThis.fetch = originalFetch;
      log.mockRestore();
    }
  });

  it("logs finish and block reasons for an empty Gemini response", async () => {
    const originalFetch = globalThis.fetch;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        promptFeedback: { blockReason: "SAFETY" },
        candidates: [{ finishReason: "SAFETY", content: { parts: [] } }],
      }),
    });
    try {
      await withTestKey(async () => {
        const res = mockResponse();
        await handler(
          {
            method: "POST",
            headers: {},
            body: { message: "اشرح المبتدأ" },
          },
          res,
        );
        expect(res.statusCode).toBe(502);
        expect(JSON.parse(res.body)).toEqual({ error: "ai_failed" });
        expect(
          JSON.parse(log.mock.calls[0][0].replace("[Gemini] ", "")),
        ).toMatchObject({
          status: 200,
          blockReason: "SAFETY",
          finishReason: "SAFETY",
        });
      });
    } finally {
      globalThis.fetch = originalFetch;
      log.mockRestore();
    }
  });

  it("logs sanitized fetch exceptions and keeps the client error generic", async () => {
    const originalFetch = globalThis.fetch;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(
        new Error("Request failed with key AIza.test-secret-value"),
      );
    try {
      await withTestKey(async () => {
        const res = mockResponse();
        await handler(
          {
            method: "POST",
            headers: {},
            body: { message: "اشرح المبتدأ" },
          },
          res,
        );
        expect(res.statusCode).toBe(502);
        expect(JSON.parse(res.body)).toEqual({ error: "ai_failed" });
        expect(log).toHaveBeenCalledOnce();
        expect(log.mock.calls[0][0]).toContain(
          "Request failed with key [REDACTED]",
        );
        expect(log.mock.calls[0][0]).not.toContain("AIza.test-secret-value");
      });
    } finally {
      globalThis.fetch = originalFetch;
      log.mockRestore();
    }
  });

  it("sends the key only in a header and maps upstream quota errors to 429", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { status: "RESOURCE_EXHAUSTED" } }),
    });
    globalThis.fetch = fetchMock;
    try {
      await withTestKey(async () => {
        const res = mockResponse();
        await handler(
          {
            method: "POST",
            headers: {},
            body: { message: "اشرح المبتدأ" },
          },
          res,
        );
        expect(res.statusCode).toBe(429);
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).not.toContain("test-secret-key");
        expect(options.headers["x-goog-api-key"]).toBe("test-secret-key");
        expect(res.body).not.toContain("test-secret-key");
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns Gemini text with the configured scope and generation options", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'في الجملة "The student reads"، The student هو الـ subject والفاعل.',
                },
              ],
            },
          },
        ],
      }),
    });

    globalThis.fetch = fetchMock;
    try {
      await withTestKey(async () => {
        const res = mockResponse();
        await handler(
          {
            method: "POST",
            headers: {},
            body: {
              message: "ما المبتدأ؟",
              history: [
                { role: "user", text: "ما هو الفاعل؟" },
                { role: "model", text: "الفاعل مرفوع." },
              ],
            },
          },
          res,
        );
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body)).toEqual({
          reply:
            'في الجملة "The student reads"، The student هو الـ subject والفاعل.',
        });
        const [, options] = fetchMock.mock.calls[0];
        const requestBody = JSON.parse(options.body);
        expect(JSON.stringify(requestBody.systemInstruction)).toContain(
          "English Grammar Foundations: Beginner",
        );
        expect(JSON.stringify(requestBody.systemInstruction)).toContain(
          "Reply naturally in Egyptian Arabic",
        );
        expect(JSON.stringify(requestBody.systemInstruction)).toContain(
          "grammar rules, vocabulary, reading passages, writing examples, model answers, and practice exercises in English",
        );
        expect(JSON.stringify(requestBody.systemInstruction)).toContain(
          "Do not translate English lesson content into Arabic unless the student explicitly asks for a translation",
        );
        expect(JSON.stringify(requestBody.systemInstruction)).toContain(
          "For questions about the platform, answer in Egyptian Arabic using only the platform facts below",
        );
        expect(requestBody.contents[1]).toEqual({
          role: "model",
          parts: [{ text: "الفاعل مرفوع." }],
        });
        expect(JSON.stringify(requestBody.systemInstruction)).toContain(
          "Ahmed Mahmoud Mansour Deep",
        );
        expect(JSON.stringify(requestBody.systemInstruction)).toContain(
          "Faculty of Artificial Intelligence and Computer Science",
        );
        expect(JSON.stringify(requestBody.systemInstruction)).toContain(
          "01283865399",
        );
        expect(requestBody.generationConfig).toEqual({
          maxOutputTokens: 700,
          temperature: 0.4,
        });

      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("caches repeated no-history questions without a second upstream call", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "إجابة مخزنة." }] } }],
      }),
    });
    globalThis.fetch = fetchMock;
    try {
      await withTestKey(async () => {
        for (const ip of ["cache-ip-1", "cache-ip-2"]) {
          const res = mockResponse();
          await handler(
            {
              method: "POST",
              headers: {
                origin: "https://el-arrab-edu-eji8.vercel.app",
                "x-forwarded-for": ip,
              },
              body: { message: "ما هو المبتدأ؟" },
            },
            res,
          );
          expect(res.statusCode).toBe(200);
          expect(JSON.parse(res.body)).toEqual({ reply: "إجابة مخزنة." });
        }
        expect(fetchMock).toHaveBeenCalledOnce();
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("enforces a per-IP limit of 15 requests per minute", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    try {
      await withTestKey(async () => {
        for (let count = 0; count < 15; count += 1) {
          const res = mockResponse();
          await handler(
            {
              method: "POST",
              headers: { "x-vercel-forwarded-for": "unique-test-ip" },
              body: { message: "اشرح المبتدأ" },
            },
            res,
          );
          expect(res.statusCode).toBe(502);
        }
        const limited = mockResponse();
        await handler(
          {
            method: "POST",
            headers: { "x-vercel-forwarded-for": "unique-test-ip" },
            body: { message: "اشرح المبتدأ" },
          },
          limited,
        );
        expect(limited.statusCode).toBe(429);
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
