import { createFaq } from "./types";

const f = (
  id: string,
  q: string,
  k: string[],
  a: string,
  next: string[] = [],
) => createFaq("writing", id, q, k, a, next);

export const writing = [
  f(
    "writing-essay",
    "أكتب essay منظم إزاي؟",
    ["essay", "مقال بالانجليزي", "essay structure"],
    "ابدأ بـ introduction فيها الفكرة الرئيسية، وبعدها body paragraphs لكل نقطة مع دليل أو مثال، واختم بـ conclusion تلخص الفكرة من غير إضافة موضوع جديد.",
    ["topic sentence", "conclusion"],
  ),
  f(
    "writing-introduction",
    "أكتب introduction إزاي؟",
    ["introduction", "مقدمة essay", "opening paragraph"],
    "ابدأ بجملة مناسبة للموضوع، قدم خلفية مختصرة، وبعدها وضح thesis statement اللي بتحدد رأيك أو النقطة الأساسية.",
  ),
  f(
    "writing-body",
    "أنظم body paragraph إزاي؟",
    ["body paragraph", "تنظيم الفقرة", "supporting details"],
    "ابدأ بـ topic sentence، وبعدها supporting details أو مثال، واشرح علاقتهم بالفكرة. استخدم transition مناسب قبل الانتقال للنقطة التالية.",
  ),
  f(
    "writing-conclusion",
    "أكتب conclusion إزاي؟",
    ["conclusion", "خاتمة essay", "closing paragraph"],
    "أعد صياغة thesis بجملة جديدة، لخص أهم النقاط، واقفل بفكرة أخيرة مرتبطة بالموضوع. بلاش تنسخ المقدمة أو تضيف حجة جديدة.",
  ),
  f(
    "writing-paragraph",
    "أكتب paragraph قوية إزاي؟",
    ["paragraph writing", "topic sentence", "فقرة انجليزي"],
    "خلي الفقرة بتدور حوالين فكرة واحدة، وابدأ بجملة topic sentence، وبعدها تفاصيل داعمة، واستخدم روابط منطقية.",
  ),
  f(
    "writing-style",
    "أحسن writing style إزاي؟",
    ["writing style", "تحسين الكتابة", "clear writing"],
    "استخدم جمل واضحة ومتنوعة، واختار كلمات دقيقة، وراجع التكرار والجمل الطويلة. اقرأ النص بصوت مسموع عشان تلاحظ الجمل غير الطبيعية.",
  ),
  f(
    "writing-punctuation",
    "أستخدم punctuation إزاي؟",
    ["punctuation", "علامات الترقيم انجليزي", "comma period"],
    "استخدم period لنهاية الجملة، وcomma للفصل حسب تركيبها، وquestion mark للسؤال. راجع تركيب الجملة عشان تتجنب comma splice.",
  ),
  f(
    "writing-hamza",
    "أراجع grammar في essay إزاي؟",
    ["proofreading", "grammar check", "مراجعة essay"],
    "راجع agreement والأزمنة وأدوات التعريف وحروف الجر، وبعدها راجع spelling والترقيم. افحص نوع خطأ واحد في كل مرة.",
  ),
  f(
    "writing-paraphrase",
    "أعمل paraphrase من غير ما أغير المعنى إزاي؟",
    ["paraphrase", "إعادة صياغة بالانجليزي", "rewrite"],
    "افهم المعنى الأول، اقفل النص، واكتب الفكرة بتركيبك ومفرداتك. قارن بالنسخة الأصلية للتأكد إن المعنى ثابت ومفيش نقل حرفي.",
  ),
  f(
    "writing-summary",
    "ألخص passage إزاي؟",
    ["summary", "تلخيص passage", "summarize"],
    "حدد main idea والتفاصيل الضرورية، وبعدها اكتبها باختصار وبكلماتك. احذف الأمثلة الثانوية والتكرار من غير ما تغير الفكرة.",
  ),
  f(
    "writing-description",
    "أكتب descriptive paragraph إزاي؟",
    ["descriptive paragraph", "وصف بالانجليزي", "sensory details"],
    "اختار تفاصيل محددة عن الشخص أو المكان، واستخدم sensory details مناسبة، ورتبها بطريقة تخلي القارئ يتخيل المشهد.",
  ),
  f(
    "writing-letter",
    "أكتب formal email إزاي؟",
    ["formal email", "رسالة رسمية بالانجليزي", "email format"],
    "اكتب subject واضح، واستخدم greeting مناسب، وضح الغرض بجمل مباشرة ومهذبة، واختم بـ closing واسمك. راجع النبرة قبل الإرسال.",
  ),
  f(
    "writing-connectors",
    "أستخدم transition words إزاي؟",
    ["transition words", "linking words", "روابط الكتابة"],
    "اختار الرابط حسب العلاقة: however للاستدراك، therefore للنتيجة، for example للمثال، وin addition للإضافة. ما تستخدمش رابط لمجرد تزيين الجملة.",
  ),
  f(
    "writing-common-errors",
    "إيه أشهر أخطاء writing؟",
    ["writing mistakes", "أخطاء الكتابة", "subject verb agreement"],
    "راجع subject-verb agreement، الأزمنة، spelling، واستخدام a/an/the. اقرأ كل جملة وتأكد إن معناها وتركيبها واضحين.",
  ),
  f(
    "writing-poetry",
    "أحلل poem في إجابة قصيرة إزاي؟",
    ["poem analysis", "تحليل قصيدة انجليزية", "poetry response"],
    "اكتب الفكرة الأساسية، واذكر دليلًا قصيرًا من القصيدة، واشرح صورة أو اختيار كلمة وتأثيره. فرّق بين الشاعر والـ speaker.",
  ),
];