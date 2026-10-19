import type { ChatFaqEntry } from "../data/types";
import { fallbackResponses, fallbackSuggestions } from "../data/fallback";
import { askAI, type AIHistoryMessage } from "./aiClient";
import type { FaqMatchResult } from "./matcher";

export interface ChatbotAnswer {
  faq: ChatFaqEntry | null;
  answer: string;
  followUps: string[];
  link?: ChatFaqEntry["link"];
  source?: "ai";
}

const previousResponse = new Map<string, number>();
let previousFallbackResponse: number | undefined;

export function createAnswer(
  faq: ChatFaqEntry | null,
  random: () => number = Math.random,
): ChatbotAnswer {
  if (!faq) {
    let fallbackIndex = Math.min(
      fallbackResponses.length - 1,
      Math.max(0, Math.floor(random() * fallbackResponses.length)),
    );
    if (fallbackIndex === previousFallbackResponse) {
      fallbackIndex = (fallbackIndex + 1) % fallbackResponses.length;
    }
    const answer = fallbackResponses[fallbackIndex];
    if (answer === undefined) {
      throw new Error("The local chatbot fallback list must not be empty.");
    }
    previousFallbackResponse = fallbackIndex;
    return {
      faq: null,
      answer,
      followUps: fallbackSuggestions,
    };
  }
  let index = Math.min(
    faq.responses.length - 1,
    Math.max(0, Math.floor(random() * faq.responses.length)),
  );
  if (faq.responses.length > 1 && index === previousResponse.get(faq.id)) {
    index = (index + 1) % faq.responses.length;
  }
  const answer = faq.responses[index];
  if (answer === undefined) {
    throw new Error(`The local chatbot FAQ "${faq.id}" has no responses.`);
  }
  previousResponse.set(faq.id, index);
  return {
    faq,
    answer,
    followUps: faq.followUps,
    ...(faq.link ? { link: faq.link } : {}),
  };
}

export async function createAnswerWithAI(
  question: string,
  match: FaqMatchResult,
  history: AIHistoryMessage[] = [],
  options: { allowLocalAnswer?: boolean } = {},
): Promise<ChatbotAnswer> {
  const isParsingRequest = /[أإآ]?عر(?:ب|اب)/u.test(question);
  if (
    options.allowLocalAnswer !== false &&
    match.best?.confidence === "high" &&
    !isParsingRequest
  ) {
    return createAnswer(match.best.faq);
  }

  recordAIQuestion(question);
  const result = await askAI(question, history.slice(-6));
  if ("reply" in result && result.reply) {
    return {
      faq: null,
      answer: result.reply,
      followUps: fallbackSuggestions,
      source: "ai",
    };
  }

  const fallback = createAnswer(null);
  return {
    ...fallback,
    ...(!("reply" in result) && result.error === "rate_limit"
      ? {
          answer:
            "الخدمة الذكية مشغولة حاليًا. جرّب مرة أخرى بعد قليل، ويمكنك اختيار أحد الأسئلة المقترحة.",
        }
      : {}),
  };
}

const aiQuestionStorageKey = "alarrab:chatbot:ai-questions:v1";

function redactAIQuestion(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, "[بريد]")
    .replace(/https?:\/\/\S+/giu, "[رابط]")
    .replace(/(?:\+?20|0)?1[0125]\d{8}/gu, "[هاتف]")
    .replace(/\b\d{6,}\b/gu, "[رقم]")
    .replace(/(?:اسمي|انا اسمي)\s+[\p{L}]{2,}(?:\s+[\p{L}]{2,})?/giu, "[اسم]")
    .slice(0, 300)
    .trim();
}

export function recordAIQuestion(question: string): void {
  const sanitized = redactAIQuestion(question);
  if (!sanitized || typeof localStorage === "undefined") return;
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(aiQuestionStorageKey) ?? "[]",
    );
    const history = Array.isArray(saved) ? saved : [];
    localStorage.setItem(
      aiQuestionStorageKey,
      JSON.stringify(
        [
          ...history,
          { question: sanitized, timestamp: new Date().toISOString() },
        ].slice(-200),
      ),
    );
  } catch (error) {
    console.warn("Unable to persist chatbot AI questions.", error);
  }
}

export function getAIQuestionsJSON(): string {
  if (typeof localStorage === "undefined") return "[]";
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(aiQuestionStorageKey) ?? "[]",
    );
    return JSON.stringify(
      Array.isArray(saved) ? saved.slice(-200) : [],
      null,
      2,
    );
  } catch (error) {
    console.warn("Unable to read chatbot AI questions.", error);
    return "[]";
  }
}

export function exportAIQuestions(): void {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("Question export is only available in a browser.");
  }
  const url = URL.createObjectURL(
    new Blob([getAIQuestionsJSON()], {
      type: "application/json;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "chatbot-ai-questions.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function clearResponderHistory(): void {
  previousResponse.clear();
  previousFallbackResponse = undefined;
}

export { fallbackResponses };
