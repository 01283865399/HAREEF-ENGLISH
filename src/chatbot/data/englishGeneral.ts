import { createFaq } from "./types";

const f = (id: string, q: string, k: string[], a: string) =>
  createFaq("englishGeneral", id, q, k, a, ["تحب مثال كمان؟"]);

export const englishGeneral = [
  f(
    "english-vocabulary-context",
    "أفهم كلمة جديدة إزاي من السياق؟",
    ["معنى كلمة من السياق", "context clues", "مفردات جديدة"],
    "اقرأ الجملة اللي قبل الكلمة وبعدها، وحدد إذا كان السياق بيدي تعريف أو مثال أو تضاد. بعد كده راجع المعنى في قاموس موثوق.",
  ),
  f(
    "english-collocation",
    "يعني إيه collocation؟",
    ["collocation", "الكلمات المتلازمة", "make a decision"],
    "الـ collocation كلمات بتتكرر مع بعض بشكل طبيعي، زي make a decision. اتعلم التعبير كامل في جملة بدل حفظ كل كلمة لوحدها.",
  ),
  f(
    "english-parts-of-speech",
    "إيه هي parts of speech؟",
    ["parts of speech", "أنواع الكلمات", "noun verb adjective"],
    "دي وظيفة الكلمة في الجملة: noun اسم، verb فعل، adjective صفة، adverb حال أو ظرف، pronoun ضمير، وpreposition حرف جر.",
  ),
  f(
    "english-adjective-adverb",
    "إيه الفرق بين adjective و adverb؟",
    ["adjective adverb", "الصفة والظرف", "quick quickly"],
    "الـ adjective بيوصف noun: a quick answer. والـ adverb غالبًا بيوصف verb أو adjective: answer quickly.",
  ),
  f(
    "english-pronunciation",
    "أحسن النطق إزاي؟",
    ["النطق", "pronunciation", "speaking"],
    "اسمع الكلمة من مصدر نطق موثوق، كررها بصوت مسموع، وقسمها لمقاطع. ركز على stress في الكلمة والجملة، مش على كتابة الحروف بس.",
  ),
  f(
    "english-word-family",
    "يعني إيه word family؟",
    ["word family", "عائلة الكلمات", "create creative creation"],
    "كلمات من أصل واحد بصيغ مختلفة، زي create وcreative وcreation. لاحظ نوع كل كلمة ومكانها المناسب في الجملة.",
  ),
  f(
    "english-prefix-suffix",
    "إيه الفرق بين prefix و suffix؟",
    ["prefix", "suffix", "بادئة ولاحقة"],
    "الـ prefix بيتضاف قبل الكلمة وبيغير معناها، زي unhappy. والـ suffix بيتضاف في آخرها وممكن يغير نوعها، زي teach وteacher.",
  ),
  f(
    "english-articles",
    "أستخدم a و an و the إمتى؟",
    ["a an the", "articles", "أدوات التعريف"],
    "a وan لاسم مفرد غير محدد؛ an قبل صوت متحرك. the لشيء محدد أو معروف من السياق. الاختيار متعلق بالصوت والمعنى مش أول حرف مكتوب بس.",
  ),
  f(
    "english-countable",
    "إيه الفرق بين countable و uncountable nouns؟",
    ["countable uncountable", "اسم معدود", "اسم غير معدود"],
    "الـ countable بيتعد وله مفرد وجمع، زي book/books. والـ uncountable غالبًا ما بيتجمعش، زي information، فنقول some information مش informations.",
  ),
  f(
    "english-pronouns",
    "إيه أنواع الضمائر في English؟",
    ["pronouns", "ضمائر انجليزي", "subject object pronouns"],
    "منها subject pronouns زي I وshe، وobject pronouns زي me وher، وpossessive adjectives زي my وtheir. اختار النوع حسب مكانه في الجملة.",
  ),
  f(
    "english-prepositions",
    "أفرق بين in و on و at إزاي؟",
    ["in on at", "prepositions of time", "حروف الجر"],
    "الاستخدام بيتغير حسب المعنى. غالبًا in مع فترات أو أماكن واسعة، on مع أيام أو أسطح، وat مع وقت محدد أو نقطة مكانية. راجع المثال والسياق.",
  ),
  f(
    "english-connectors",
    "أستخدم linking words إزاي؟",
    ["linking words", "connectors", "أدوات الربط"],
    "اختار الرابط حسب العلاقة: because للسبب، so للنتيجة، however للاستدراك، وfirst/then للترتيب. ما تكررّش الرابط من غير داعي.",
  ),
  f(
    "english-idiom",
    "أحفظ idioms إزاي؟",
    ["idioms", "تعبيرات اصطلاحية", "break the ice"],
    "اتعلم الـ idiom في سياق وجملة، وسجل معناه وموقف استخدامه. ما تترجمش كلماته حرفيًا لأن المعنى غالبًا اصطلاحي.",
  ),
  f(
    "english-phrasal-verb",
    "يعني إيه phrasal verb؟",
    ["phrasal verb", "الأفعال المركبة", "give up"],
    "فعل مع particle زي give up أو look after، والمعنى أحيانًا بيتغير عن معنى الفعل لوحده. احفظه مع مثال وحدد إذا كان separable أو لأ.",
  ),
  f(
    "english-reading-main-idea",
    "أطلع main idea من القطعة إزاي؟",
    ["main idea", "الفكرة الرئيسية", "reading comprehension"],
    "اقرأ العنوان وبداية القطعة، وبعدها راجع الجمل المتكررة في المعنى. اختار إجابة تشمل الفكرة العامة من غير تفاصيل زيادة.",
  ),
  f(
    "english-reading-inference",
    "أحل inference question إزاي؟",
    ["inference", "استنتاج", "reading question"],
    "اجمع دليلين أو أكتر من النص، واستنتج حاجة منطقية مدعومة بيهم. ما تختارش معلومة محتاجة معرفة خارج القطعة.",
  ),
  f(
    "english-paraphrase",
    "أعيد صياغة جملة بالإنجليزي إزاي؟",
    ["paraphrase", "إعادة صياغة", "rewrite sentence"],
    "حافظ على نفس المعنى، وغيّر تركيب الجملة أو مفرداتها من غير إضافة معلومة. بعد كده راجع الزمن والفاعل والتوافق.",
  ),
  f(
    "english-translation",
    "أترجم جملة من غير ترجمة حرفية إزاي؟",
    ["translation", "ترجمة", "ترجمة حرفية"],
    "حدد المعنى والعلاقة بين أجزاء الجملة الأول، وبعدها اختار تعبير طبيعي في اللغة المطلوبة. راجع الزمن والضمائر والتعبير الاصطلاحي.",
  ),
  f(
    "english-spelling",
    "أراجع spelling إزاي؟",
    ["spelling", "تهجئة الكلمات", "إملاء انجليزي"],
    "اكتب الكلمات اللي بتتلخبط فيها، راجع نمط الحروف ومقاطعها، واستخدم قاموس موثوق. جرّب تكتب الكلمة من الذاكرة في جملة.",
  ),
  f(
    "english-british-american",
    "إيه الفرق بين British و American spelling؟",
    ["British spelling", "American spelling", "colour color"],
    "في كلمات ليها تهجئتين شائعتين، زي colour في British English وcolor في American English. اختار نمط واحد والتزم بيه في نفس الكتابة.",
  ),
];