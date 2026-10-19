import { createFaq } from "./types";

const f = (
  id: string,
  q: string,
  k: string[],
  a: string,
  next: string[] = [],
) => createFaq("morphology", id, q, k, a, next);

export const morphology = [
  f(
    "morph-hamza-cut",
    "أكوّن word family إزاي؟",
    ["word family", "عائلة الكلمات", "اشتقاق الكلمات"],
    "ابدأ بالكلمة الأصلية، وبعدها لاحظ البادئات واللواحق وتغير نوع الكلمة. مثلًا: educate, education, educational. استخدم كل صيغة في جملة.",
    ["prefix", "suffix"],
  ),
  f(
    "morph-hamza-wasl",
    "يعني إيه prefix؟",
    ["prefix", "بادئة", "unhappy"],
    "الـ prefix جزء بيتضاف قبل الكلمة وقد يغير معناها، زي un- في unhappy وre- في rewrite. اتأكد من معنى الكلمة الجديدة في السياق.",
    ["suffix", "word family"],
  ),
  f(
    "morph-hamza-difference",
    "إيه الفرق بين prefix و suffix؟",
    ["prefix suffix", "بادئة ولاحقة", "word building"],
    "الـ prefix بييجي في أول الكلمة زي dis-agree، والـ suffix في آخرها زي agree-ment. اللاحقة ممكن تغير نوع الكلمة كمان.",
  ),
  f(
    "morph-taa-marbuta",
    "إزاي أحول adjective لـ adverb؟",
    ["adjective adverb", "ly", "quick quickly"],
    "كتير من الظروف بتتكون بإضافة -ly: quick تصبح quickly. لكن في استثناءات زي good تصبح well، وفي صفات بتنتهي بـ -ly أصلًا.",
  ),
  f(
    "morph-taa-open",
    "إزاي أكون plural في English؟",
    ["plural nouns", "الجمع", "s es ies"],
    "غالبًا بنضيف -s، وأحيانًا -es أو نغير y إلى -ies حسب نهاية الكلمة. في جمع irregular لازم تحفظ الشكل زي child/children.",
  ),
  f(
    "morph-alif-maqsura",
    "إمتى أستخدم -ed مع الفعل؟",
    ["ed ending", "past simple regular", "الفعل المنتظم"],
    "الأفعال المنتظمة بتاخد -ed في past simple وpast participle غالبًا. راعي قواعد الإملاء والنطق؛ مش كل فعل بيتبع نفس الشكل الصوتي.",
  ),
  f(
    "morph-dhad-zaa",
    "إيه الفرق بين regular و irregular verbs؟",
    ["regular irregular verbs", "أفعال منتظمة وغير منتظمة", "went gone"],
    "الـ regular verbs غالبًا بتضيف -ed للماضي، زي work/worked. الـ irregular ليها أشكال خاصة، زي go/went/gone، فالأفضل تتعلمها في جمل.",
  ),
  f(
    "morph-verb-tenses",
    "إيه أشكال الفعل الأساسية؟",
    ["verb forms", "base past participle", "أشكال الفعل"],
    "اتعلم base form وpast simple وpast participle، ومعاهم -ing form. مثال: write, wrote, written, writing.",
    ["irregular verbs", "present perfect"],
  ),
  f(
    "morph-active-participle",
    "إيه هو gerund؟",
    ["gerund", "verb ing noun", "الفعل مع ing"],
    "الـ gerund هو verb-ing بيشتغل كاسم، زي Swimming is fun. بعد أفعال معينة زي enjoy بنستخدم gerund: I enjoy reading.",
  ),
  f(
    "morph-passive-participle",
    "إيه هو past participle؟",
    ["past participle", "التصريف الثالث", "written gone"],
    "هو شكل الفعل المستخدم مع have في perfect tenses ومع be في passive voice. مثال: has written وwas written.",
  ),
  f(
    "morph-infinitive",
    "إيه الفرق بين infinitive و gerund؟",
    ["infinitive gerund", "to read reading", "مصدر الفعل"],
    "الـ infinitive غالبًا to + base verb، والـ gerund verb-ing. أفعال مختلفة ييجي بعدها شكل معين، فاحفظ الفعل مع التركيب ومثال.",
  ),
  f(
    "morph-derivatives",
    "إزاي أتعلم word forms؟",
    ["word forms", "noun adjective verb", "صيغ الكلمات"],
    "اعمل جدول للكلمة ومعاها noun وverb وadjective وadverb لو موجودين، واكتب مثالًا لكل صيغة بدل حفظ قائمة من غير سياق.",
  ),
  f(
    "morph-verb-root",
    "يعني إيه compound word؟",
    ["compound word", "كلمات مركبة", "toothbrush"],
    "كلمة مكونة من كلمتين أو أكتر بتشتغل كوحدة واحدة، زي toothbrush أو bus stop. المعنى ممكن يكون قريب أو مختلف عن معنى كل جزء.",
  ),
  f(
    "morph-pattern",
    "أميز noun و verb إزاي؟",
    ["noun verb", "اسم وفعل بالانجليزي", "word class"],
    "راجع مكان الكلمة ونهايتها والمعنى في الجملة. بعض الكلمات ممكن تكون noun أو verb حسب الاستخدام: I answer a question / I write an answer.",
  ),
  f(
    "morph-transitive",
    "أحفظ irregular verbs إزاي؟",
    ["irregular verbs", "أفعال شاذة", "حفظ الأفعال"],
    "ذاكر مجموعات صغيرة في جمل، واختبر نفسك من base form للماضي والتصريف الثالث. راجع الكلمات على فترات بدل حفظ القائمة مرة واحدة.",
  ),
];