export interface ChatFaqEntry {
  id: string;
  category: string;
  keywords: string[];
  patterns: string[];
  responses: [string, string, string];
  followUps: string[];
  link?: { label: string; href: string };
}

export function createFaq(
  category: string,
  id: string,
  question: string,
  keywords: string[],
  answer: string,
  followUps: string[] = [],
  link?: ChatFaqEntry["link"],
): ChatFaqEntry {
  const questionCore = question
    .replace(/^(ما هو|ما هي|ما|كيف|هل|أين|متى|لماذا)\s+/u, "")
    .replace(/[؟?]$/u, "");
  return {
    id,
    category,
    keywords,
    patterns: [
      question,
      `ايه ${questionCore}`,
      `يعني ايه ${questionCore}`,
      `ممكن اعرف ${question}`,
    ],
    responses: [answer, `ببساطة: ${answer}`, `الخلاصة: ${answer}`],
    followUps,
    ...(link ? { link } : {}),
  };
}
