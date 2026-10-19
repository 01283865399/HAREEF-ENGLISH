const diacritics = /[\u064B-\u065F\u0670\u06D6-\u06ED]/gu;
const punctuation = /[^\p{L}\p{N}\s]/gu;
const digitMap: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

const francoWords: Record<string, string> = {
  "3ayez": "عايز",
  "3ayza": "عايزه",
  "3aiz": "عايز",
  a3rf: "اعرف",
  a3mel: "اعمل",
  a3ml: "اعمل",
  "a3ml eh": "اعمل ايه",
  ana: "انا",
  enta: "انت",
  enti: "انتي",
  eh: "ايه",
  eih: "ايه",
  ezay: "ازاي",
  ezzay: "ازاي",
  ezayak: "ازيك",
  feen: "فين",
  fin: "فين",
  feyn: "فين",
  leh: "ليه",
  leih: "ليه",
  meen: "مين",
  meia: "ميه",
  mesh: "مش",
  msh: "مش",
  mafish: "مفيش",
  mafesh: "مفيش",
  grammar: "جرامر",
  present: "present",
  simple: "simple",
  prefix: "prefix",
  metaphor: "metaphor",
  theme: "theme",
  essay: "essay",
  vocabulary: "فوكابيولاري",
  reading: "ريدنج",
  literature: "ليتريتشر",
  course: "كورس",
  platform: "المنصة",
  password: "كلمة المرور",
  as3ar: "اسعار",
  quiz: "اختبار",
  "past participle": "التصريف الثالث",
  "parts of speech": "أنواع الكلمات",
  adaker: "اذاكر",
  video: "فيديو",
  da3m: "الدعم",
  "video mesh shaghal": "الفيديو مش شغال",
  study: "مذاكرة",
  el: "ال",
  al: "ال",
  fil: "في ال",
  fel: "في ال",
  "3ala": "علي",
  "3alaashan": "علشان",
  "3ashan": "عشان",
  "7aga": "حاجه",
  "7ad": "حد",
  "7atta": "حتي",
  "5alas": "خلاص",
  "5": "خ",
  "8": "غ",
  "9": "ق",
  "6": "ط",
  "2": "ء",
  "3": "ع",
  "7": "ح",
};

const francoTokenMap: Record<string, string> = {
  a: "ا",
  b: "ب",
  c: "ك",
  d: "د",
  e: "ي",
  f: "ف",
  g: "ج",
  h: "ه",
  i: "ي",
  j: "ج",
  k: "ك",
  l: "ل",
  m: "م",
  n: "ن",
  o: "و",
  p: "ب",
  q: "ق",
  r: "ر",
  s: "س",
  t: "ت",
  u: "و",
  v: "ف",
  w: "و",
  x: "كس",
  y: "ي",
  z: "ز",
  "2": "ء",
  "3": "ع",
  "5": "خ",
  "6": "ط",
  "7": "ح",
  "8": "غ",
  "9": "ق",
};

const francoDigraphs: Array<[RegExp, string]> = [
  [/sh/gu, "ش"],
  [/kh/gu, "خ"],
  [/gh/gu, "غ"],
  [/th/gu, "ث"],
  [/dh/gu, "ذ"],
  [/ch/gu, "ش"],
];

const singleLetterRun = /(?:^|\s)([\p{L}])(?:\s+([\p{L}])){1,}/gu;
const normalizedTextCache = new Map<string, string>();
const matchingVariantsCache = new Map<string, string[]>();

function cacheResult<T>(cache: Map<string, T>, key: string, result: T): T {
  if (cache.size >= 5000) cache.clear();
  cache.set(key, result);
  return result;
}

const joinedSeparatelyTypedLetters = (text: string): string =>
  text.replace(singleLetterRun, (run) => run.replace(/\s+/gu, ""));

function normalizeArabic(value: string): string {
  return joinedSeparatelyTypedLetters(
    value
      .replace(diacritics, "")
      .replace(/ـ/gu, "")
      .replace(/[أإآٱ]/gu, "ا")
      .replace(/[ؤئء]/gu, "ء")
      .replace(/[ىي]/gu, "ي")
      .replace(/ة/gu, "ه")
      .replace(/[٠-٩]/gu, (digit) => digitMap[digit] ?? digit)
      .toLocaleLowerCase("ar")
      .replace(punctuation, " ")
      .replace(/([\p{Script=Arabic}])\1{1,}/gu, "$1")
      .replace(/([a-z])\1{2,}/gu, "$1")
      .replace(/\s+/gu, " ")
      .trim(),
  );
}

function transliterateFrancoToken(token: string): string {
  if (/^[a-z0-9]+$/u.test(token)) {
    const known = francoWords[token];
    if (known) return known;

    let transformed = token;
    for (const [pattern, replacement] of francoDigraphs) {
      transformed = transformed.replace(pattern, replacement);
    }
    return [...transformed]
      .map((character) => francoTokenMap[character] ?? character)
      .join("");
  }
  return token;
}

export function transliterateFranco(value: string): string {
  const lowered = value.toLocaleLowerCase("en");
  const phraseEntries = Object.entries(francoWords)
    .filter(([word]) => word.includes(" "))
    .sort(([left], [right]) => right.length - left.length);
  let text = lowered;
  for (const [source, target] of phraseEntries) {
    text = text.replace(
      new RegExp(
        `(?:^|\\s)${source.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}(?=\\s|$)`,
        "gu",
      ),
      ` ${target} `,
    );
  }
  return text.split(/\s+/u).map(transliterateFrancoToken).join(" ");
}

export function normalizeChatText(value: string): string {
  const cached = normalizedTextCache.get(value);
  if (cached !== undefined) return cached;
  return cacheResult(
    normalizedTextCache,
    value,
    normalizeArabic(transliterateFranco(value)),
  );
}

function stripPrefixes(text: string): string {
  return text
    .split(" ")
    .map((word) => {
      const stripped =
        word.length > 4
          ? word.replace(/^(?:وال|بال|كال|فال|لل|ال|و|ف|ب|ل|ك)/u, "")
          : word;
      return stripped.length >= 2 ? stripped : word;
    })
    .join(" ");
}

function stemToken(token: string): string {
  let stem = token;
  if (stem.length > 4) {
    stem = stem.replace(/^(?:وال|بال|كال|فال|لل|ال|و|ف|ب|ل|ك)/u, "");
  }
  if (stem.length > 4) {
    stem = stem.replace(/(?:هما|كما|هم|هن|ها|كم|كن|ون|ين|ات|ان|ية|يه)$/u, "");
  }
  if (stem.length > 3) {
    stem = stem.replace(/(?:ه|ة|ي)$/u, "");
  }
  return stem.length >= 2 ? stem : token;
}

function compactLetters(text: string): string {
  return text.replace(/\s+/gu, "");
}

export function normalizeForMatching(value: string): string[] {
  const cached = matchingVariantsCache.get(value);
  if (cached) return cached;
  const raw = value.normalize("NFC").toLocaleLowerCase("ar").trim();
  const normalized = normalizeChatText(value);
  const prefixesRemoved = stripPrefixes(normalized);
  const stemmed = normalized.split(" ").map(stemToken).join(" ");
  const variants = [
    raw,
    normalized,
    prefixesRemoved,
    stemmed,
    compactLetters(normalized),
    compactLetters(prefixesRemoved),
  ].map(normalizeArabic);
  return cacheResult(matchingVariantsCache, value, [
    ...new Set(variants.filter(Boolean)),
  ]);
}

export function normalizeTokens(value: string): string[] {
  return normalizeChatText(value).split(" ").filter(Boolean);
}

export const francoConversionTable = Object.freeze({
  "3": "ع",
  "7": "ح",
  "2": "ء",
  "5": "خ",
  "8": "غ",
  "9": "ق",
  "6": "ط",
});
