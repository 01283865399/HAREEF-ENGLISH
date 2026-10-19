import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FaqMatchResult } from "./matcher";
import { createAnswerWithAI, getAIQuestionsJSON } from "./responder";
import type { ChatFaqEntry } from "../data/types";
import { localFaqs } from "../data";
import { matchFaqDetailed } from "./matcher";

vi.mock("./aiClient", () => ({
  askAI: vi.fn(),
}));

import { askAI } from "./aiClient";

const faq: ChatFaqEntry = {
  id: "local-test",
  category: "grammar",
  keywords: ["اختبار"],
  patterns: ["اختبار"],
  responses: ["رد محلي أ", "رد محلي ب", "رد محلي ج"],
  followUps: ["سؤال متابعة"],
};

function result(
  confidence: "high" | "medium" | "low",
  bestFaq: ChatFaqEntry | null = faq,
): FaqMatchResult {
  return {
    best: bestFaq
      ? {
          faq: bestFaq,
          score: confidence === "high" ? 0.9 : 0.4,
          confidence,
          intent: {
            intent: "unknown",
            intents: [],
            entity: null,
            entityTokens: [],
          },
        }
      : null,
    candidates: [],
    confidence,
    intent: {
      intent: "unknown",
      intents: [],
      entity: null,
      entityTokens: [],
    },
  };
}

describe("AI responder fallback routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("uses a high-confidence local answer without calling the AI", async () => {
    const answer = await createAnswerWithAI("اختبار", result("high"));
    expect(answer.faq?.id).toBe("local-test");
    expect(answer.source).toBeUndefined();
    expect(askAI).not.toHaveBeenCalled();
  });

  it.each(["السلام عليكم", "ما أسعار الباقات؟"])(
    "keeps a high-confidence local reply for %s",
    async (question) => {
      const match = matchFaqDetailed(question, localFaqs);
      expect(match.best?.confidence).toBe("high");
      const answer = await createAnswerWithAI(question, match);
      expect(answer.faq).not.toBeNull();
      expect(askAI).not.toHaveBeenCalled();
    },
  );

  it("uses AI for medium/low confidence and sends only the last six messages", async () => {
    vi.mocked(askAI).mockResolvedValue({ reply: "إجابة ذكية" });
    const history = Array.from({ length: 8 }, (_, index) => ({
      role: index % 2 ? ("model" as const) : ("user" as const),
      text: `${index}`,
    }));
    const answer = await createAnswerWithAI(
      "ما الفرق بين الجملتين؟",
      result("medium"),
      history,
    );
    expect(answer.answer).toBe("إجابة ذكية");
    expect(answer.source).toBe("ai");
    expect(askAI).toHaveBeenCalledWith(
      "ما الفرق بين الجملتين؟",
      history.slice(-6),
    );
  });

  it("sends parsing requests to AI even if a local match exists", async () => {
    vi.mocked(askAI).mockResolvedValue({ reply: "إعراب تفصيلي" });
    const answer = await createAnswerWithAI("أعرب: العلم نور", result("high"));
    expect(answer.source).toBe("ai");
    expect(askAI).toHaveBeenCalledOnce();
  });

  it("uses the old local fallback after AI failure and a friendly message on rate limit", async () => {
    vi.mocked(askAI).mockResolvedValue({ error: "failed" });
    const failed = await createAnswerWithAI(
      "سؤال غير معروف",
      result("low", null),
    );
    expect(failed.faq).toBeNull();
    expect(failed.followUps.length).toBeGreaterThan(0);

    vi.mocked(askAI).mockResolvedValue({ error: "rate_limit" });
    const limited = await createAnswerWithAI("سؤال آخر", result("low", null));
    expect(limited.answer).toContain("مشغولة حاليًا");
  });

  it("records AI-routed questions with basic personal-data redaction", async () => {
    vi.mocked(askAI).mockResolvedValue({ reply: "رد" });
    await createAnswerWithAI(
      "انا اسمي سارة وبريدي sara@example.com",
      result("low", null),
    );
    expect(getAIQuestionsJSON()).not.toContain("سارة");
    expect(getAIQuestionsJSON()).not.toContain("sara@example.com");
  });

  it("keeps only the most recent 200 AI-routed questions", async () => {
    vi.mocked(askAI).mockResolvedValue({ reply: "رد" });
    for (let index = 0; index < 205; index += 1) {
      await createAnswerWithAI(`سؤال غير معروف ${index}`, result("low", null));
    }
    const records = JSON.parse(getAIQuestionsJSON()) as Array<{
      question: string;
    }>;
    expect(records).toHaveLength(200);
    expect(records[0]?.question).toContain("5");
    expect(records.at(-1)?.question).toContain("204");
  });
});
