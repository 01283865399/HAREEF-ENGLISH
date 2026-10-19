const synonymGroups: string[][] = [
  ["ما اسمك", "اسمك", "من حضرتك"],
  ["ازاي", "كيف", "طريقة", "اعمل ايه", "ازاي اعمل", "بكيفية"],
  ["عايز", "اريد", "نفسي", "محتاج", "ابغي", "عاوزه", "عاوزة"],
  ["فين", "اين", "مكان", "موضع"],
  ["بكام", "كم السعر", "السعر", "تكلفة", "ثمن", "فلوس", "بكم"],
  ["اشترك", "اسجل", "اعمل حساب", "انضم", "سجل", "التحاق"],
  ["مش شغال", "معطل", "بايظ", "واقف", "عطلان", "مفيش صوت", "لا يعمل"],
  ["نسيت الباسورد", "كلمة السر", "كلمة المرور", "الباسورد", "الرقم السري"],
  ["مثال", "مثال على", "زي ايه", "نموذج"],
  ["ما هو", "يعني ايه", "تعريف", "ما معنى", "ما المقصود"],
  ["مقارنة", "الفرق بين", "ايه الفرق", "فرق", "قارن"],
  ["كورس", "دورة", "مسار", "برنامج"],
  ["طالب", "دارس", "متعلم"],
  ["grammar", "جرامر", "قواعد انجليزي", "english grammar"],
  ["vocabulary", "مفردات انجليزي", "english words"],
  ["reading", "reading comprehension", "فهم المقروء"],
  ["writing", "english writing", "كتابة انجليزي"],
  ["رفع", "رفع الإيصال", "ارفع", "تحميل", "إرفاق"],
  ["الموقع", "المنصة", "الموقع الالكتروني"],
  ["موبايل", "هاتف", "تليفون", "جوال"],
  ["اختبار", "امتحان", "كويز", "تقييم"],
  ["المذاكرة", "الدراسة", "التعلم", "اذاكر"],
  ["سعر", "اسعار", "تكلفة", "ثمن", "بكام"],
  ["حساب", "ملف شخصي", "بياناتي"],
  ["الدفع", "ادفع", "تحويل", "سداد"],
  ["إيصال", "ايصال", "إثبات دفع", "صورة التحويل"],
  ["الدعم", "خدمة العملاء", "مساعدة", "مساندة"],
  ["بطيء", "تقيل", "بطئ", "تحميل بطيء"],
  ["الصوت", "سمع", "سماعة", "صوت الفيديو"],
  ["فيديو", "فيديوهات", "درس مسجل", "المحاضرة"],
  ["present simple", "المضارع البسيط", "he goes"],
  ["present continuous", "المضارع المستمر", "is studying"],
  ["past simple", "الماضي البسيط", "went yesterday"],
  ["present perfect", "الحاضر التام", "have finished"],
  ["parts of speech", "أنواع الكلمات", "noun verb adjective"],
  ["prefix", "بادئة", "word building"],
  ["suffix", "لاحقة", "word family"],
  ["metaphor", "imagery", "literary device"],
  ["قصة", "حكاية", "رواية"],
  ["وقت", "ميعاد", "متى", "موعد"],
  ["افتح", "ادخل", "روح", "انتقل"],
  ["شرح", "اشرح", "وضح", "فسر"],
  ["مش فاهم", "مش فاهمه", "لم أفهم", "غير واضح"],
  ["تمام", "حسنًا", "ماشي", "طيب"],
  ["سجل الدخول", "ادخل", "لوجين", "تسجيل الدخول"],
  ["تفعيل", "يشتغل", "يفتح", "يتاح"],
];

const phraseIndex = new Map<string, string[]>();
const tokenIndex = new Map<string, Set<string>>();

function normalizedPhrase(value: string): string {
  return value
    .toLocaleLowerCase("ar")
    .replace(/[أإآٱ]/gu, "ا")
    .replace(/[ؤئء]/gu, "ء")
    .replace(/[ىة]/gu, (letter) => (letter === "ى" ? "ي" : "ه"))
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

for (const group of synonymGroups) {
  const normalizedGroup = [...new Set(group.map(normalizedPhrase))];
  for (const phrase of normalizedGroup) {
    phraseIndex.set(phrase, normalizedGroup);
    for (const token of phrase.split(" ")) {
      if (!tokenIndex.has(token)) tokenIndex.set(token, new Set());
      for (const synonym of normalizedGroup) {
        for (const synonymToken of synonym.split(" ")) {
          tokenIndex.get(token)?.add(synonymToken);
        }
      }
    }
  }
}

export function expandSynonyms(value: string): string[] {
  const normalized = normalizedPhrase(value);
  const expansions = new Set<string>([normalized]);
  for (const [phrase, alternatives] of phraseIndex) {
    if (normalized.includes(phrase)) {
      for (const alternative of alternatives) {
        expansions.add(normalized.replace(phrase, alternative));
      }
    }
  }
  const tokens = normalized.split(" ");
  for (let index = 0; index < tokens.length; index += 1) {
    const alternatives = tokenIndex.get(tokens[index] ?? "");
    if (!alternatives) continue;
    for (const alternative of alternatives) {
      const expanded = [...tokens];
      expanded[index] = alternative;
      expansions.add(expanded.join(" "));
    }
  }
  return [...expansions];
}

export function getSynonyms(token: string): readonly string[] {
  return [...(tokenIndex.get(normalizedPhrase(token)) ?? [])];
}

export function addSynonymGroup(group: readonly string[]): void {
  const normalizedGroup = [
    ...new Set(group.map(normalizedPhrase).filter(Boolean)),
  ];
  for (const phrase of normalizedGroup) {
    phraseIndex.set(phrase, normalizedGroup);
    for (const token of phrase.split(" ")) {
      if (!tokenIndex.has(token)) tokenIndex.set(token, new Set());
      for (const synonym of normalizedGroup) {
        for (const synonymToken of synonym.split(" ")) {
          tokenIndex.get(token)?.add(synonymToken);
        }
      }
    }
  }
}
