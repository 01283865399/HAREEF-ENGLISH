import { afterEach, describe, expect, it, vi } from "vitest";
import { generateUuidV4 } from "./uuid";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateUuidV4", () => {
  it("generates an RFC 4122 version 4 UUID without relying on randomUUID", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => bytes.fill(0),
    });

    expect(generateUuidV4()).toBe("00000000-0000-4000-8000-000000000000");
  });

  it("reports when a secure random source is unavailable", () => {
    vi.stubGlobal("crypto", undefined);

    expect(() => generateUuidV4()).toThrow(
      "هذا المتصفح لا يدعم توليد معرف آمن. حدّث المتصفح وحاول مرة أخرى.",
    );
  });
});
