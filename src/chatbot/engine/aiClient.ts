export interface AIHistoryMessage {
  role: "user" | "model";
  text: string;
}

export type AIResult = { reply: string } | { error: "rate_limit" | "failed" };

interface AIResponseBody {
  reply?: unknown;
  error?: unknown;
}

function getChatEndpoint(): string {
  const configuredBase = import.meta.env.VITE_API_BASE?.trim();
  if (configuredBase) {
    return new URL("/api/v1/ai/chat", configuredBase).toString();
  }
  if (window.location.origin.includes("appassets.androidplatform.net")) {
    return "https://el-arrab-edu-eji8.vercel.app/api/chat";
  }
  return "/api/chat";
}

export async function askAI(
  message: string,
  history: AIHistoryMessage[] = [],
): Promise<AIResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(getChatEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: history.slice(-6) }),
      signal: controller.signal,
    });
    if (response.status === 429) return { error: "rate_limit" };
    const body: AIResponseBody = await response.json();
    if (body.error === "rate_limit") {
      return { error: "rate_limit" };
    }
    if (!response.ok || typeof body.reply !== "string" || !body.reply.trim()) {
      return { error: "failed" };
    }
    return { reply: body.reply.trim() };
  } catch {
    return { error: "failed" };
  } finally {
    window.clearTimeout(timeout);
  }
}
