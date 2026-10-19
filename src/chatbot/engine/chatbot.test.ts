import { describe, expect, it } from "vitest";
import { faqCategories, fallbackResponses, localFaqs } from "../data";
import { clearResponderHistory, createAnswer } from "./responder";
import { matchFaq } from "./matcher";
import { normalizeChatText, normalizeForMatching } from "./normalize";

const expectedQuestions: Array<[string, string]> = [
  ["السلام عليكم", "greeting-salam"],
  ["اهلا وسهلا", "greeting-hello"],
  ["صباح الخير", "greeting-morning"],
  ["مساء الخير", "greeting-evening"],
  ["من انت", "greeting-name"],
  ["شكرا جدا", "greeting-thanks-much"],
  ["بتفهم العاميه", "greeting-languages"],
  ["ما هدف المنصة؟", "platform-purpose"],
  ["من هو مدرس المنصة؟", "platform-teacher"],
  ["ما الصفوف الدراسية الموجودة؟", "platform-grades"],
  ["إيه الفرق بين adjective و adverb؟", "english-adjective-adverb"],
  ["ما الكورسات الموجودة؟", "courses-catalog"],
  ["إيه محتوى English Grammar Foundations؟", "courses-nahw"],
  ["إيه محتوى Verb Forms and Tenses؟", "courses-sarf"],
  ["إيه محتوى Reading for Meaning؟", "courses-balagha"],
  ["كيف أشترك في كورس؟", "courses-enroll"],
  ["ما أسعار الباقات؟", "pricing-packages"],
  ["نسيت كلمة المرور، ماذا أفعل؟", "account-forgot-password"],
  ["لم يصلني بريد التفعيل", "account-email"],
  ["أين أرى طلبات الاشتراك؟", "account-order-history"],
  ["هل يمكن استرداد المبلغ؟", "pricing-refund"],
  ["كيف أبدأ الاختبار؟", "study-quiz"],
  ["كيف أتابع تقدمي؟", "study-progress"],
  ["إيه هي parts of speech؟", "grammar-mubtada-khabar"],
  ["إزاي أكون passive voice؟", "grammar-passive-subject"],
  ["أستخدم present simple إمتى؟", "grammar-inna"],
  ["إيه الفرق بين past simple و present perfect؟", "grammar-case-markers"],
  ["يعني إيه prefix؟", "morph-hamza-wasl"],
  ["إزاي أحول adjective لـ adverb؟", "morph-taa-marbuta"],
  ["إمتى أستخدم -ed مع الفعل؟", "morph-alif-maqsura"],
  ["إيه هو past participle؟", "morph-passive-participle"],
  ["أحلل metaphor إزاي؟", "rhetoric-kinaya"],
  ["يعني إيه rhyme؟", "rhetoric-rhyme-prose"],
  ["أحلل character في قصة إزاي؟", "literature-character"],
  ["إيه الفرق بين prose و poetry؟", "literature-prose-poetry"],
  ["أكتب essay منظم إزاي؟", "writing-essay"],
  ["أستخدم punctuation إزاي؟", "writing-punctuation"],
  ["كيف أنظم وقت المذاكرة؟", "tips-plan"],
  ["كيف أتعامل مع توتر الامتحان؟", "tips-anxiety"],
  ["الفيديو لا يعمل، ماذا أفعل؟", "tech-video-not-playing"],
  ["ما مواعيد عمل الدعم؟", "support-hours"],
  ["يعني إيه collocation؟", "english-collocation"],
];

describe("local chatbot knowledge and matching", () => {
  it("contains at least 250 entries and 15 items per category", () => {
    expect(localFaqs).toHaveLength(250);
    for (const category of Object.values(faqCategories)) {
      expect(category.length).toBeGreaterThanOrEqual(15);
    }
  });

  it("provides three distinct response variants per entry", () => {
    for (const faq of localFaqs) {
      expect(faq.responses).toHaveLength(3);
      expect(new Set(faq.responses).size).toBe(3);
    }
  });

  it("normalizes Arabic spelling, tashkeel, punctuation, and Arabic digits", () => {
    expect(normalizeChatText("إِنَّـ وأخواتُها؟ ١٢")).toBe("ان واخواتها 12");
    expect(normalizeForMatching("بالكورس")).toContain("كورس");
  });

  it.each(expectedQuestions)("matches %s to %s", (question, expectedId) => {
    expect(matchFaq(question, localFaqs)?.id).toBe(expectedId);
  });

  it("handles colloquial wording, a spelling typo, and contextual follow-ups", () => {
    expect(matchFaq("ازاي اشترك في كورس", localFaqs)?.id).toBe(
      "courses-enroll",
    );
    expect(matchFaq("أستخدم present continuous إمتى؟", localFaqs)?.id).toBe("grammar-kana");
    expect(matchFaq("يعني ايه prefix", localFaqs)?.id).toBe("morph-hamza-wasl");
    expect(matchFaq("present continous", localFaqs)?.id).toBe("grammar-kana");
    expect(matchFaq("عايز اعرف اسعار الباقات", localFaqs)?.id).toBe(
      "pricing-packages",
    );
    expect(matchFaq("مثال؟", localFaqs, "grammar-kana")?.id).toBe(
      "grammar-kana",
    );
    expect(matchFaq("سؤال عن الطقس", localFaqs)).toBeNull();
  });

  it("returns one of ten local fallbacks and three suggested questions", () => {
    expect(fallbackResponses).toHaveLength(10);
    expect(createAnswer(null, () => 0.99).answer).toBe(
      fallbackResponses[fallbackResponses.length - 1],
    );
    expect(createAnswer(null).followUps.length).toBeGreaterThan(0);
  });

  it("does not repeat the same response twice in succession", () => {
    const entry = localFaqs.find((faq) => faq.id === "grammar-kana");
    if (!entry) throw new Error("Expected grammar FAQ to exist.");
    clearResponderHistory();
    const first = createAnswer(entry, () => 0).answer;
    const second = createAnswer(entry, () => 0).answer;
    expect(second).not.toBe(first);
    const firstFallback = createAnswer(null, () => 0).answer;
    const secondFallback = createAnswer(null, () => 0).answer;
    expect(secondFallback).not.toBe(firstFallback);
  });
});
