import { createFaq } from "./types";

const f = (
  id: string,
  q: string,
  k: string[],
  a: string,
  next: string[] = [],
) => createFaq("rhetoric", id, q, k, a, next);

export const rhetoric = [
  f(
    "rhetoric-simile",
    "يعني إيه simile؟",
    ["simile", "like as", "تشبيه بالانجليزي"],
    "الـ simile مقارنة مباشرة باستخدام like أو as. مثال: Her smile was like sunshine. وضح إيه الصفة المشتركة وتأثير المقارنة.",
    ["metaphor", "imagery"],
  ),
  f(
    "rhetoric-metaphor",
    "يعني إيه metaphor؟",
    ["metaphor", "استعارة بالانجليزي", "time is a thief"],
    "الـ metaphor بيصف حاجة كأنها حاجة تانية من غير like أو as. مثال: Time is a thief. اشرح الصورة والمعنى اللي بتضيفه للسياق.",
    ["simile", "personification"],
  ),
  f(
    "rhetoric-kinaya",
    "أحلل metaphor إزاي؟",
    ["تحليل metaphor", "معنى مجازي", "metaphor example"],
    "حدد الكلمات اللي بتعمل المقارنة، وفسر المعنى المقصود، وبعدها اشرح تأثير الصورة على الفكرة أو النبرة.",
  ),
  f(
    "rhetoric-metonymy",
    "يعني إيه personification؟",
    ["personification", "تشخيص", "human qualities"],
    "هو إعطاء شيء أو فكرة صفات بشرية. مثال: The wind whispered. اشرح الصورة اللي بتخلقها في ذهن القارئ.",
  ),
  f(
    "rhetoric-antithesis",
    "يعني إيه contrast في النص؟",
    ["contrast", "تضاد الأفكار", "opposites in text"],
    "الـ contrast بيبرز الفرق بين شخصيتين أو فكرتين أو حالتين. حدد الطرفين واشرح إزاي الفرق بيدعم معنى النص.",
  ),
  f(
    "rhetoric-antithesis-pair",
    "إيه تأثير juxtaposition؟",
    ["juxtaposition", "وضع فكرتين جنب بعض", "literary contrast"],
    "الكاتب بيحط صورتين أو فكرتين جنب بعض عشان يبرز التشابه أو الاختلاف. اربط الأثر بالسياق بدل ما تكتفي بالتعريف.",
  ),
  f(
    "rhetoric-paronomasia",
    "يعني إيه pun؟",
    ["pun", "wordplay", "تلاعب بالألفاظ"],
    "الـ pun تلاعب بكلمة لها أكتر من معنى أو بكلمات متشابهة في الصوت. حدد المعنيين واشرح ليه الاختيار مناسب للسياق.",
  ),
  f(
    "rhetoric-rhyme-prose",
    "يعني إيه rhyme؟",
    ["rhyme", "قافية انجليزية", "ending sounds"],
    "الـ rhyme هو تشابه أصوات نهايات كلمات، وغالبًا بيساعد على الإيقاع والتأكيد. استمع للصوت النهائي بدل الاعتماد على شكل الكتابة.",
  ),
  f(
    "rhetoric-metaphor-types",
    "إيه الفرق بين simile و metaphor؟",
    ["simile metaphor", "like as", "مقارنة مباشرة ومجاز"],
    "الـ simile بيستخدم like أو as غالبًا، زي brave as a lion. الـ metaphor بيقدم المقارنة مباشرة، زي He is a lion.",
  ),
  f(
    "rhetoric-simile-types",
    "يعني إيه imagery؟",
    ["imagery", "صور حسية", "sensory language"],
    "الـ imagery كلمات بتخاطب الحواس وتخلي القارئ يتخيل منظر أو صوت أو ملمس. استخرج الكلمات الحسية واربطها بالمزاج أو الفكرة.",
  ),
  f(
    "rhetoric-figurative-purpose",
    "أشرح effect of a literary device إزاي؟",
    ["effect of a literary device", "أثر الصورة", "تأثير الأسلوب"],
    "اكتب اسم الأسلوب، اقتبس دليلًا قصيرًا، فسر معناه في السياق، وبعدها وضح تأثيره على القارئ أو النبرة.",
  ),
  f(
    "rhetoric-alliteration",
    "يعني إيه alliteration؟",
    ["alliteration", "تكرار أول صوت", "repeated consonant"],
    "هو تكرار صوت consonant في بداية كلمات قريبة، زي wild and windy. لاحظ الإيقاع أو التركيز اللي بيعمله في العبارة.",
  ),
  f(
    "rhetoric-sound",
    "يعني إيه assonance؟",
    ["assonance", "تكرار صوت vowel", "vowel sounds"],
    "هو تكرار أصوات vowel داخل كلمات قريبة، وممكن يخلق إيقاع أو نغمة مميزة. ركز على الصوت المنطوق مش الحرف المكتوب فقط.",
  ),
  f(
    "rhetoric-meaning",
    "إيه هو symbolism؟",
    ["symbolism", "رمز أدبي", "symbol in literature"],
    "الـ symbol شيء أو صورة بتمثل معنى أوسع داخل النص. استدل من تكرارها وسياقها قبل ما تحدد معناها.",
  ),
  f(
    "rhetoric-analysis",
    "أحلل literary device في سؤال إزاي؟",
    ["analyze literary device", "تحليل نص", "literary analysis"],
    "حدد الأسلوب والدليل من النص، اشرح المعنى الحرفي أو المجازي، وبعدها اربطه بالنبرة أو الفكرة الرئيسية.",
  ),
];