export type CourseCategory = "نحو" | "صرف" | "بلاغة" | "أدب";

export interface Course {
  id: string;
  category: CourseCategory;
  title: string;
  level: string;
  lessons: string;
  duration: string;
  price: string;
  image: string;
  description?: string;
  priceAmount?: number;
  isFree?: boolean;
  grade?: string | null;
  academicSystem?: string | null;
  term?: string | null;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  summary: string;
  videoSrc: string;
  duration: string;
  keyPoints: { label: string; seconds: number }[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
}

export interface Quiz {
  id: string;
  questions: QuizQuestion[];
}

export interface IrabWord {
  text: string;
  role: string;
  reason: string;
}

export interface IrabSentence {
  text: string;
  words: IrabWord[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Plan {
  id: string;
  title: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Note {
  id: string;
  lessonId: string;
  text: string;
  seconds: number;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  submitted: boolean;
}

export interface LiveSession {
  id: string;
  title: string;
  time: string;
}

export interface ProgressState {
  completedLessonIds: string[];
  lessonCompletionDates: Record<string, string>;
  lastLessonId: string;
  lastPosition: number;
  watchedSeconds: number;
  weeklyGoal: number;
  activityByDate: Record<string, number>;
  assignments: Assignment[];
  sessions: LiveSession[];
  enrolledCourseIds: string[];
  quizBestScores: Record<string, number>;
  levelTestResult: { score: number; track: CourseCategory } | null;
}
