import lessonData from "../data/lessons.json";
import type { CourseCategory, Note, ProgressState } from "../types/domain";
import { mockRequest, readStorage, writeStorage } from "./api";

export const PROGRESS_KEY = "alarrab:progress";
export const NOTES_KEY = "alarrab:notes";

export const initialProgress: ProgressState = {
  completedLessonIds: [],
  lessonCompletionDates: {},
  lastLessonId: "",
  lastPosition: 0,
  watchedSeconds: 0,
  weeklyGoal: 5,
  activityByDate: {},
  assignments: [],
  sessions: [],
  enrolledCourseIds: [],
  quizBestScores: {},
  levelTestResult: null,
};

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeProgress(value: unknown): ProgressState {
  if (!value || typeof value !== "object") return initialProgress;
  const progress = value as Partial<ProgressState>;
  const stringRecord = (candidate: unknown): Record<string, string> =>
    typeof candidate === "object" && candidate !== null
      ? Object.fromEntries(
          Object.entries(candidate).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        )
      : {};
  const numberRecord = (candidate: unknown): Record<string, number> =>
    typeof candidate === "object" && candidate !== null
      ? Object.fromEntries(
          Object.entries(candidate).filter(
            (entry): entry is [string, number] =>
              typeof entry[1] === "number" && Number.isFinite(entry[1]),
          ),
        )
      : {};
  const completedLessonIds = Array.isArray(progress.completedLessonIds)
    ? progress.completedLessonIds.filter(
        (lessonId): lessonId is string => typeof lessonId === "string",
      )
    : [];
  const watchedSeconds =
    typeof progress.watchedSeconds === "number" ? progress.watchedSeconds : 0;
  return {
    completedLessonIds,
    lessonCompletionDates: stringRecord(progress.lessonCompletionDates),
    lastLessonId:
      typeof progress.lastLessonId === "string" &&
      (watchedSeconds > 0 || completedLessonIds.length > 0)
        ? progress.lastLessonId
        : "",
    lastPosition:
      typeof progress.lastPosition === "number" ? progress.lastPosition : 0,
    watchedSeconds,
    weeklyGoal:
      typeof progress.weeklyGoal === "number" && progress.weeklyGoal > 0
        ? progress.weeklyGoal
        : initialProgress.weeklyGoal,
    activityByDate: numberRecord(progress.activityByDate),
    assignments: [],
    sessions: [],
    enrolledCourseIds: Array.isArray(progress.enrolledCourseIds)
      ? progress.enrolledCourseIds.filter(
          (courseId): courseId is string => typeof courseId === "string",
        )
      : [],
    quizBestScores: numberRecord(progress.quizBestScores),
    levelTestResult:
      progress.levelTestResult &&
      typeof progress.levelTestResult.score === "number" &&
      ["نحو", "صرف", "بلاغة", "أدب"].includes(
        progress.levelTestResult.track,
      )
        ? progress.levelTestResult
        : null,
  };
}

export function migrateLegacyProgress(value: unknown): ProgressState {
  const progress = normalizeProgress(value);
  return {
    ...progress,
    lessonCompletionDates: {},
    activityByDate: {},
    assignments: [],
    sessions: [],
  };
}

export async function getProgress(): Promise<ProgressState> {
  return mockRequest(() => {
    const stored = readStorage<unknown>(PROGRESS_KEY, null);
    if (
      !stored ||
      typeof stored !== "object" ||
      !("activityByDate" in stored) ||
      !("lessonCompletionDates" in stored)
    ) {
      return migrateLegacyProgress(stored);
    }
    return normalizeProgress(stored);
  });
}

export async function saveProgress(progress: ProgressState): Promise<void> {
  await mockRequest(() => writeStorage(PROGRESS_KEY, progress));
}

export async function getNotes(lessonId: string): Promise<Note[]> {
  return mockRequest(() =>
    readStorage<Note[]>(NOTES_KEY, []).filter(
      (note) => note.lessonId === lessonId,
    ),
  );
}

export async function saveNote(note: Note): Promise<Note[]> {
  return mockRequest(() => {
    const notes = readStorage<Note[]>(NOTES_KEY, []);
    const updated = notes.some(({ id }) => id === note.id)
      ? notes.map((existing) => (existing.id === note.id ? note : existing))
      : [...notes, note];
    writeStorage(NOTES_KEY, updated);
    return updated;
  });
}

export async function deleteNote(
  noteId: string,
  lessonId: string,
): Promise<Note[]> {
  return mockRequest(() => {
    const updated = readStorage<Note[]>(NOTES_KEY, []).filter(
      ({ id }) => id !== noteId,
    );
    writeStorage(NOTES_KEY, updated);
    return updated.filter((note) => note.lessonId === lessonId);
  });
}

export function markLessonComplete(
  progress: ProgressState,
  lessonId: string,
  completedAt = new Date(),
): ProgressState {
  return progress.completedLessonIds.includes(lessonId)
    ? progress
    : {
        ...progress,
        completedLessonIds: [...progress.completedLessonIds, lessonId],
        lessonCompletionDates: {
          ...progress.lessonCompletionDates,
          [lessonId]: dateKey(completedAt),
        },
      };
}

export function updatePlayback(
  progress: ProgressState,
  lessonId: string,
  seconds: number,
  playedAt = new Date(),
): ProgressState {
  const key = dateKey(playedAt);
  return {
    ...progress,
    lastLessonId: lessonId,
    lastPosition: Math.max(0, seconds),
    watchedSeconds: progress.watchedSeconds + 5,
    activityByDate: {
      ...progress.activityByDate,
      [key]: (progress.activityByDate[key] ?? 0) + 5,
    },
  };
}

export function completedLessonsThisWeek(
  progress: ProgressState,
  now = new Date(),
): number {
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  const daysSinceMonday = (startOfWeek.getDay() + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);
  const startKey = dateKey(startOfWeek);
  const todayKey = dateKey(now);
  return Object.values(progress.lessonCompletionDates).filter(
    (date) => date >= startKey && date <= todayKey,
  ).length;
}

export function currentStreak(
  progress: ProgressState,
  now = new Date(),
): number {
  const activeDays = new Set(
    Object.entries(progress.activityByDate)
      .filter(([, seconds]) => seconds > 0)
      .map(([date]) => date),
  );
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!activeDays.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (activeDays.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function activityForLastSevenDays(
  progress: ProgressState,
  now = new Date(),
): { date: string; seconds: number; label: string }[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = dateKey(date);
    return {
      date: key,
      seconds: progress.activityByDate[key] ?? 0,
      label: new Intl.DateTimeFormat("ar-EG", { weekday: "short" }).format(date),
    };
  });
}

export function saveQuizScore(
  progress: ProgressState,
  quizId: string,
  score: number,
): ProgressState {
  return {
    ...progress,
    quizBestScores: {
      ...progress.quizBestScores,
      [quizId]: Math.max(progress.quizBestScores[quizId] ?? 0, score),
    },
  };
}

export function recommendTrack(score: number): CourseCategory {
  if (score >= 8) return "بلاغة";
  if (score >= 6) return "أدب";
  if (score >= 3) return "صرف";
  return "نحو";
}

export function lessonProgress(progress: ProgressState): number {
  const total = lessonData.length;
  return total === 0
    ? 0
    : Math.round((progress.completedLessonIds.length / total) * 100);
}
