import { describe, expect, it } from "vitest";
import { faqCategories, localFaqs } from "../data";
import {
  exportUnmatchedQuestions,
  matchFaq,
  matchFaqDetailed,
  matchMultipleFaqs,
  recordUnmatchedQuestion,
} from "./matcher";
import { normalizeChatText } from "./normalize";

type QuestionType =
  | "exact"
  | "typo"
  | "colloquial"
  | "fusha"
  | "single-word"
  | "long"
  | "reordered"
  | "compound"
  | "franco";

interface QualityQuestion {
  category: string;
  type: QuestionType;
  question: string;
}

function createQualityQuestions(): QualityQuestion[] {
  const questions: QualityQuestion[] = [];
  const categoryEntries = Object.values(faqCategories);
  const tokenCategories = new Map<string, Set<string>>();
  for (const entries of categoryEntries) {
    for (const entry of entries) {
      for (const keyword of entry.keywords) {
        for (const token of normalizeChatText(keyword).split(/\s+/u)) {
          if (!tokenCategories.has(token))
            tokenCategories.set(token, new Set());
          tokenCategories.get(token)?.add(entry.category);
        }
      }
    }
  }
  const types: QuestionType[] = [
    "exact",
    "typo",
    "colloquial",
    "fusha",
    "single-word",
    "long",
    "reordered",
    "compound",
    "exact",
    "franco",
  ];
  const francoByCategory: Record<string, string> = {
    greetings: "ezayak",
    platform: "platform",
    courses: "course",
    account: "password",
    pricing: "as3ar",
    study: "quiz",
    grammar: "present",
    morphology: "prefix",
    rhetoric: "metaphor",
    literature: "theme",
    writing: "essay",
    studyTips: "adaker",
    technical: "video mesh shaghal",
    support: "da3m",
    englishGeneral: "English",
  };

  for (const entries of categoryEntries) {
    for (let index = 0; index < 150; index += 1) {
      const entry = entries[index % entries.length];
      if (!entry) throw new Error("FAQ category unexpectedly empty.");
      const phrase = entry.patterns[0] ?? entry.keywords[0] ?? entry.id;
      const keyword = entry.keywords[0] ?? phrase;
      const distinctiveWord = entry.keywords
        .flatMap((item) => normalizeChatText(item).split(/\s+/u))
        .filter((token) => token.length > 2)
        .sort((left, right) => {
          const leftCount = tokenCategories.get(left)?.size ?? 0;
          const rightCount = tokenCategories.get(right)?.size ?? 0;
          return leftCount - rightCount || right.length - left.length;
        })[0];
      const singleWord = distinctiveWord ?? keyword.split(/\s+/u)[0] ?? keyword;
      const type = types[index % types.length] ?? "exact";
      let question = phrase;

      switch (type) {
        case "typo":
          if (/[a-z]/iu.test(keyword)) {
            const letters = [...keyword];
            const index = Math.max(1, Math.floor(letters.length / 2));
            [letters[index - 1], letters[index]] = [
              letters[index] ?? "",
              letters[index - 1] ?? "",
            ];
            question = letters.join("");
          } else {
            question = keyword.replace(/[\p{L}]$/u, "ظ");
          }
          break;
        case "colloquial":
          question = `عايز اعرف ${keyword}`;
          break;
        case "fusha":
          question = `أرغب في معرفة ${keyword}`;
          break;
        case "single-word":
          question = singleWord;
          break;
        case "long":
          question = `لو سمحت عندي سؤال مهم عن ${phrase} ممكن توضح لي؟`;
          break;
        case "reordered":
          question = keyword.split(/\s+/u).reverse().join(" ");
          break;
        case "compound":
          question = `${phrase}؟ وكمان ${keyword}`;
          break;
        case "franco":
          question = francoByCategory[entry.category] ?? phrase;
          break;
        case "exact":
          question = phrase;
          break;
      }
      questions.push({ category: entry.category, type, question });
    }
  }
  return questions;
}

describe("local matcher quality and performance", () => {
  it("recognizes at least 90% of 150 varied questions per data category", () => {
    const questions = createQualityQuestions();
    const categoryStats = new Map<string, { passed: number; total: number }>();
    const typeStats = new Map<string, { passed: number; total: number }>();
    const topOneStats = new Map<string, { passed: number; total: number }>();
    const failures: QualityQuestion[] = [];

    for (const item of questions) {
      const result = matchFaqDetailed(item.question, localFaqs);
      const passed =
        result.best?.faq.category === item.category ||
        result.candidates.some(
          (candidate) => candidate.faq.category === item.category,
        );
      const topOneStat = topOneStats.get(item.category) ?? {
        passed: 0,
        total: 0,
      };
      topOneStat.total += 1;
      if (result.best?.faq.category === item.category) topOneStat.passed += 1;
      topOneStats.set(item.category, topOneStat);
      const categoryStat = categoryStats.get(item.category) ?? {
        passed: 0,
        total: 0,
      };
      categoryStat.total += 1;
      if (passed) categoryStat.passed += 1;
      categoryStats.set(item.category, categoryStat);

      const typeStat = typeStats.get(item.type) ?? { passed: 0, total: 0 };
      typeStat.total += 1;
      if (passed) typeStat.passed += 1;
      typeStats.set(item.type, typeStat);
      if (!passed) {
        failures.push({
          ...item,
          category: `${item.category}; got ${result.best?.faq.category ?? "fallback"} (${result.best?.faq.id ?? "none"})`,
        });
      }
    }

    console.info(
      "Matcher quality by category:",
      Object.fromEntries(
        [...categoryStats].map(([category, stat]) => [
          category,
          `${stat.passed}/${stat.total} (${Math.round((stat.passed / stat.total) * 100)}%)`,
        ]),
      ),
    );
    console.info(
      "Matcher top-three recall by type:",
      Object.fromEntries(
        [...typeStats].map(([type, stat]) => [
          type,
          `${stat.passed}/${stat.total} (${Math.round((stat.passed / stat.total) * 100)}%)`,
        ]),
      ),
    );
    console.info(
      "Top-one match rate by category:",
      Object.fromEntries(
        [...topOneStats].map(([category, stat]) => [
          category,
          `${stat.passed}/${stat.total} (${Math.round((stat.passed / stat.total) * 100)}%)`,
        ]),
      ),
    );
    if (failures.length) {
      console.info("Matcher quality failures:", failures.slice(0, 30));
    }

    for (const [category, stat] of categoryStats) {
      expect(stat.total, `${category} test count`).toBe(150);
      expect(
        stat.passed / stat.total,
        `${category} top-three category recall`,
      ).toBeGreaterThan(0.9);
    }
  }, 180_000);

  it("normalizes and matches common Franco-Arab questions", () => {
    expect(normalizeChatText("ana ayez a3rf el present simple")).toContain(
      "present simple",
    );
    expect(matchFaq("ana ayez a3rf el present continuous", localFaqs)?.id).toBe(
      "grammar-kana",
    );
    expect(matchFaq("ezay ashtarek fi course", localFaqs)?.category).toBe(
      "courses",
    );
    expect(matchFaq("3ayez a3rf el as3ar", localFaqs)?.category).toBe(
      "pricing",
    );
  });

  it.each([
    ["ezayak", "greetings"],
    ["platform", "platform"],
    ["course", "courses"],
    ["password", "account"],
    ["as3ar", "pricing"],
    ["quiz", "study"],
    ["present", "grammar"],
    ["prefix", "morphology"],
    ["metaphor", "rhetoric"],
    ["theme", "literature"],
    ["essay", "writing"],
    ["adaker", "studyTips"],
    ["video mesh shaghal", "technical"],
    ["da3m", "support"],
    ["English", "englishGeneral"],
  ])("maps Franco-Arab %s to %s", (question, category) => {
    expect(
      matchFaqDetailed(question, localFaqs).candidates.some(
        (candidate) => candidate.faq.category === category,
      ),
    ).toBe(true);
  });

  it.each(["How do I build a rocket?", "طريقة عمل الملوخية", "موقفك من السياسة؟"])(
    "rejects unrelated query %s",
    (question) => {
      expect(matchFaq(question, localFaqs)).toBeNull();
    },
  );

  it("returns multi-part matches and useful uncertainty candidates", () => {
    const parts = matchMultipleFaqs(
      "إيه هي parts of speech؟ وإمتى أستخدم -ed مع الفعل؟",
      localFaqs,
    );
    expect(parts.map((part) => part.best?.faq.category)).toContain("grammar");
    expect(parts.map((part) => part.best?.faq.category)).toContain(
      "morphology",
    );

    const uncertain = matchFaqDetailed("مبتدا", localFaqs);
    expect(uncertain.candidates.length).toBeGreaterThan(0);
  });

  it("redacts unmatched questions and retains only the latest 200", () => {
    if (typeof localStorage === "undefined") {
      throw new Error("The test environment must provide localStorage.");
    }
    const storageKey = "alarrab:chatbot:unmatched:v1";
    localStorage.removeItem(storageKey);
    try {
      recordUnmatchedQuestion(
        "انا اسمي سارة وبريدي sara@example.com ورقمي 01012345678",
      );
      const redacted = exportUnmatchedQuestions();
      expect(redacted).not.toContain("سارة");
      expect(redacted).not.toContain("sara@example.com");
      expect(redacted).not.toContain("01012345678");

      for (let index = 0; index < 205; index += 1) {
        recordUnmatchedQuestion(`سؤال غير معروف رقم ${index}`);
      }
      const records = JSON.parse(exportUnmatchedQuestions()) as Array<{
        question: string;
      }>;
      expect(records).toHaveLength(200);
      expect(records[0]?.question).toContain("5");
      expect(records.at(-1)?.question).toContain("204");
    } finally {
      localStorage.removeItem(storageKey);
    }
  });

  it("matches a representative question against a warmed 500-entry index in under 50ms", () => {
    const entries = Array.from({ length: 500 }, (_, index) => ({
      ...localFaqs[index % localFaqs.length]!,
      id: `${localFaqs[index % localFaqs.length]!.id}-perf-${index}`,
    }));
    matchFaqDetailed("ما هو المبتدأ والخبر؟", entries);
    const startedAt = performance.now();
    const iterations = 100;
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      matchFaqDetailed("ما هو المبتدأ والخبر؟", entries);
    }
    const averageMs = (performance.now() - startedAt) / iterations;
    console.info(`Warmed 500-entry matcher average: ${averageMs.toFixed(2)}ms`);
    expect(averageMs).toBeLessThan(50);
  }, 60_000);
});
