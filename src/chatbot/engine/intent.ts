import { expandSynonyms } from "./synonyms";
import { normalizeChatText } from "./normalize";

export type ChatIntent =
  | "definition"
  | "how-to"
  | "price"
  | "technical-problem"
  | "example"
  | "comparison"
  | "location"
  | "enrollment"
  | "payment"
  | "study-advice"
  | "unknown";

export interface DetectedIntent {
  intent: ChatIntent;
  intents: ChatIntent[];
  entity: string | null;
  entityTokens: string[];
}

const intentCues: Array<[ChatIntent, RegExp]> = [
  ["comparison", /(?:الفرق بين|ايه الفرق|قارن|مقارنه|مقارنة)/u],
  ["price", /(?:بكام|بكم|السعر|اسعار|ثمن|تكلفه|فلوس)/u],
  ["example", /(?:مثال|مثال على|نموذج|زي ايه)/u],
  ["definition", /(?:يعني ايه|ما معنى|ما المقصود|تعريف|ما هو|ما هي)/u],
  ["how-to", /(?:ازاي|كيف|طريقه|اعمل|اكتب|اصوغ|استخدم)/u],
  ["location", /(?:فين|اين|مكان|اجيب|اجد)/u],
  ["enrollment", /(?:اشترك|اشتراك|اسجل|تسجيل|انضم|كورس)/u],
  ["payment", /(?:دفع|ادفع|تحويل|ايصال|إيصال|فاتوره)/u],
  [
    "technical-problem",
    /(?:مش شغال|لا يعمل|عطل|مش قادر|مشكله|بطيء|صوت|بايظ|واقف)/u,
  ],
  ["study-advice", /(?:اذاكر|مذاكره|امتحان|توتر|تركيز|تنظيم الوقت)/u],
];

const intentTokens = new Set([
  "ما",
  "هو",
  "هي",
  "ايه",
  "يعني",
  "معني",
  "المقصود",
  "تعريف",
  "كيف",
  "ازاي",
  "طريقه",
  "اعمل",
  "اعرف",
  "اكتب",
  "مثال",
  "على",
  "الفرق",
  "بين",
  "قارن",
  "بكام",
  "بكم",
  "السعر",
  "اسعار",
  "تكلفه",
  "ثمن",
  "فين",
  "اين",
  "مكان",
  "اشترك",
  "اشتراك",
  "اسجل",
  "تسجيل",
  "ادفع",
  "دفع",
  "مشكله",
  "مش",
  "لا",
  "يعمل",
  "شغال",
  "بطيء",
  "عطل",
  "صوت",
  "متى",
  "امتى",
]);

export function detectIntent(value: string): DetectedIntent {
  const normalized = normalizeChatText(value);
  const expanded = expandSynonyms(normalized);
  const intents = new Set<ChatIntent>();
  for (const variant of expanded) {
    for (const [intent, cue] of intentCues) {
      if (cue.test(variant)) intents.add(intent);
    }
  }
  const meaningful = normalized
    .split(" ")
    .filter((token) => token.length > 1 && !intentTokens.has(token));
  const entityTokens = [...new Set(meaningful)];
  return {
    intent: intents.values().next().value ?? "unknown",
    intents: [...intents],
    entityTokens,
    entity: entityTokens.length ? entityTokens.join(" ") : null,
  };
}

export function getIntentCompatibility(
  queryIntents: ChatIntent[],
  candidate: string,
): number {
  if (queryIntents.length === 0) return 0;
  const entryIntent = detectIntent(candidate).intents;
  if (entryIntent.some((intent) => queryIntents.includes(intent))) return 1;
  return 0;
}
