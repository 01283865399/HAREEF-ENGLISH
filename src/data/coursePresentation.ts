const legacyCategoryLabels: Record<string, string> = {
  نحو: "Grammar",
  صرف: "Vocabulary",
  بلاغة: "Reading",
  أدب: "Literature",
};

const legacyLevelLabels: Record<string, string> = {
  مبتدئ: "Beginner",
  متوسط: "Intermediate",
  متقدم: "Advanced",
};

const legacyCourseTitles: Record<string, string> = {
  "course-nahw": "English Grammar Foundations",
  "course-sarf": "Verb Forms and Tenses",
  "course-balagha": "Reading for Meaning",
  "course-adab": "Literature and Text Analysis",
};

const legacyLessonTitles: Record<string, string> = {
  "lesson-1": "Parts of Speech: Nouns and Verbs",
  "lesson-2": "Present Simple and Present Continuous",
  "lesson-3": "Sentence Structure and Word Order",
  "lesson-4": "Vocabulary in Context",
  "lesson-5": "Prepositions of Time and Place",
  "lesson-6": "Reading Comprehension: Finding the Main Idea",
};

const placementLevels: Record<string, string> = {
  نحو: "Beginner",
  صرف: "Intermediate",
  أدب: "Upper Intermediate",
  بلاغة: "Advanced",
};

const legacyCategoryByLabel: Record<string, string> = {
  Grammar: "نحو",
  Vocabulary: "صرف",
  Reading: "بلاغة",
  Literature: "أدب",
};

const academicSystemLabels: Record<string, string> = {
  "الثانوي العام": "الثانوية العامة",
  الأزهري: "الثانوية الأزهرية",
  البكالوريا: "البكالوريا",
};

export function categoryLabel(category: string): string {
  return legacyCategoryLabels[category] ?? category;
}

export function academicSystemLabel(system: string): string {
  return academicSystemLabels[system] ?? system;
}

export function courseTitle(id: string, title: string): string {
  if (!/[\u0600-\u06ff]/u.test(title)) return title;
  return legacyCourseTitles[id] ?? "English course content coming soon";
}

export function lessonTitle(id: string, title: string): string {
  if (!/[\u0600-\u06ff]/u.test(title)) return title;
  return legacyLessonTitles[id] ?? "English lesson content coming soon";
}

export function lessonSummary(summary: string): string {
  if (!/[\u0600-\u06ff]/u.test(summary)) return summary;
  return "تفاصيل الدرس هتتضاف قريبًا.";
}

export function levelLabel(level: string): string {
  return legacyLevelLabels[level] ?? level;
}

export function courseDescription(description?: string): string {
  if (!description || /[\u0600-\u06ff]/u.test(description)) {
    return "مسار منظم لتطوير مستواك في English بالتدريب والمتابعة.";
  }
  return description;
}

export function matchesCategory(courseCategory: string, selected: string): boolean {
  return (
    courseCategory === selected ||
    courseCategory === legacyCategoryByLabel[selected]
  );
}

export function placementLevelLabel(track: string): string {
  return placementLevels[track] ?? track;
}