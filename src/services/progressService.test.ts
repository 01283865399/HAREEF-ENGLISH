import { beforeEach, describe, expect, it } from "vitest";
import {
  initialProgress,
  activityForLastSevenDays,
  completedLessonsThisWeek,
  currentStreak,
  lessonProgress,
  migrateLegacyProgress,
  markLessonComplete,
  recommendTrack,
  saveQuizScore,
  updatePlayback,
} from "./progressService";

describe("progressService", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("marks lessons complete once", () => {
    const completedAt = new Date(2026, 2, 12, 12);
    const updated = markLessonComplete(
      initialProgress,
      "lesson-2",
      completedAt,
    );

    expect(updated.completedLessonIds).toContain("lesson-2");
    expect(updated.lessonCompletionDates["lesson-2"]).toBe("2026-03-12");
    expect(
      markLessonComplete(updated, "lesson-2").completedLessonIds,
    ).toHaveLength(1);
  });

  it("keeps the best score for a quiz", () => {
    const next = saveQuizScore(
      saveQuizScore(initialProgress, "quiz-1", 7),
      "quiz-1",
      9,
    );

    expect(next.quizBestScores["quiz-1"]).toBe(9);
  });

  it("recommends a track based on the score", () => {
    expect(recommendTrack(9)).toBe("بلاغة");
    expect(recommendTrack(7)).toBe("أدب");
    expect(recommendTrack(4)).toBe("صرف");
    expect(recommendTrack(1)).toBe("نحو");
  });

  it("computes lesson progress from completed lessons", () => {
    const next = {
      ...initialProgress,
      completedLessonIds: ["lesson-1", "lesson-2"],
    };

    expect(lessonProgress(next)).toBeGreaterThan(0);
  });

  it("tracks playback activity and current learning streak", () => {
    const firstDay = new Date(2026, 2, 11, 12);
    const secondDay = new Date(2026, 2, 12, 12);
    const progress = updatePlayback(
      updatePlayback(initialProgress, "lesson-1", 5, firstDay),
      "lesson-1",
      10,
      secondDay,
    );

    expect(progress.watchedSeconds).toBe(10);
    expect(progress.activityByDate).toEqual({
      "2026-03-11": 5,
      "2026-03-12": 5,
    });
    expect(currentStreak(progress, secondDay)).toBe(2);
    const week = activityForLastSevenDays(progress, secondDay);
    expect(week).toHaveLength(7);
    expect(week[6]?.seconds).toBe(5);
  });

  it("counts completed lessons in the current Monday-to-Sunday week", () => {
    const progress = {
      ...initialProgress,
      lessonCompletionDates: {
        monday: "2026-03-09",
        sunday: "2026-03-15",
        previousWeek: "2026-03-08",
      },
    };

    expect(
      completedLessonsThisWeek(progress, new Date(2026, 2, 15, 12)),
    ).toBe(2);
  });

  it("keeps real learning data while discarding legacy demo statistics", () => {
    const migrated = migrateLegacyProgress({
      completedLessonIds: ["lesson-2"],
      lastLessonId: "lesson-2",
      lastPosition: 45,
      watchedSeconds: 120,
      enrolledCourseIds: ["course-nahw"],
      weeklyActivity: [90, 80],
      streak: 7,
      skills: { نحو: 90 },
      assignments: [{ id: "demo", title: "واجب تجريبي" }],
      sessions: [{ id: "demo", title: "حصة تجريبية" }],
    });

    expect(migrated.completedLessonIds).toEqual(["lesson-2"]);
    expect(migrated.enrolledCourseIds).toEqual(["course-nahw"]);
    expect(migrated.watchedSeconds).toBe(120);
    expect(migrated.assignments).toEqual([]);
    expect(migrated.sessions).toEqual([]);
    expect(migrated.activityByDate).toEqual({});
    expect("streak" in migrated).toBe(false);
  });
});
