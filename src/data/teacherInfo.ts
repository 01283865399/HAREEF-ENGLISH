export const CONTACT_PHONES: readonly string[] = [];

export const teacherInfo = {
  name: "مستر محمود عبد الواحد",
  englishName: "Mr. Mahmoud Abdelwahed",
  tagline: "An English Teacher",
  nickname: "حريف إنجليش",
  hashtag: "#حريف_إنجلش",
  teachingDescription:
    "معلم أول لغة إنجليزية، يدرّس لكل المراحل وبالتخصيص المرحلة الثانوية: الثانوية العامة، والبكالوريا، والأزهرية.",
  facebookPage: "MR. Mahmoud Abdelwahed",
  education: [
    "ليسانس اللغات والترجمة، قسم الترجمة الفورية لغة إنجليزية (2011).",
    "دبلومة الترجمة التحريرية، الجامعة الأمريكية (2011).",
    "دبلومة التربوي (2014).",
    "تمهيدي ماجستير، كلية الألسن، جامعة قناة السويس.",
  ],
  experience: ["محاضر لغة إنجليزية بمكتبة مصر العامة (2013–2014)."],
  courses: [
    "كورس التفاوض الدولي، جامعة الأزهر.",
    "كورس مهارات التواصل.",
    "حضور دورات تدريبية لمنظمة اليونيسف.",
    "حضور البرنامج التدريبي التربوي (2016).",
    "دورة التحول الرقمي.",
  ],
  achievements: [
    "المركز السابع في الشهادة الثانوية على مستوى محافظة الإسماعيلية.",
    "المركز الأول على مستوى الجمهورية في مسابقة أوائل الطلاب.",
  ],
  groupFeatures: [
    {
      icon: "check",
      className: "featurePrimary",
      title: "تأسيس وتقوية",
      text: "تأسيس وتقوية.",
    },
    {
      icon: "user",
      className: "featureSecondary",
      title: "متابعة الطالب",
      text: "متابعة الطالب وتغطية المادة كاملة بشكل مستمر.",
    },
    {
      icon: "file",
      className: "featureSmall",
      title: "واجبات",
      text: "إعطاء واجبات على كل درس.",
    },
    {
      icon: "book",
      className: "featureSage",
      title: "مراجعة دورية",
      text: "مراجعة دورية على ما تم دراسته من المنهج.",
    },
    {
      icon: "search",
      className: "featureSmall",
      title: "تجنب الأخطاء الشائعة",
      text: "شرح لتفادي الأخطاء الشائعة وعدم الوقوع فيها.",
    },
    {
      icon: "edit",
      className: "featureSmall",
      title: "امتحان بعد كل وحدة",
      text: "امتحان بعد نهاية كل وحدة.",
    },
  ],
  locations: [
    {
      name: "سنتر الأصدقاء",
      area: "التل الكبير",
      details: "ميدان التحريات، خلف معرض الأستاذ خالد إمام.",
    },
    {
      name: "سنتر التميز",
      area: "القصاصين",
      details: "شارع الألفي.",
    },
    {
      name: "فروع سنتر 2M",
      area: "الإسماعيلية، التل الكبير، القصاصين",
      details: 'شعار السنتر: "حلمك يبدأ من هنا".',
    },
  ],
} as const;
