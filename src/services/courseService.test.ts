import { beforeEach, describe, expect, it, vi } from "vitest";

const { courseOrder, from, isConfigured, maybeSingle, rpc, select } =
  vi.hoisted(() => {
    const maybeSingle = vi.fn();
    const select = vi.fn(() => ({
      eq: vi.fn(() => ({ maybeSingle })),
      order: courseOrder,
    }));
    const from = vi.fn(() => ({ select }));
    const courseOrder = vi.fn();
    const rpc = vi.fn();
    const isConfigured = { value: true };
    return { courseOrder, from, isConfigured, maybeSingle, rpc, select };
  });

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: () => ({ from, rpc }),
  isSupabaseConfigured: () => isConfigured.value,
  safeSupabaseQuery: async (query: () => Promise<unknown>) => query(),
}));

vi.mock("./backendApi", () => ({
  backendRequest: vi.fn(),
  isBackendApiConfigured: () => false,
}));

import {
  getCourses,
  getLesson,
  getLessonCatalog,
  getLessons,
  isFreeCourse,
  isLocallyFreeCourse,
} from "./courseService";

const lessonCatalogRow = {
  id: "lesson-1",
  course_id: "course-paid",
  title: "Parts of Speech: Nouns and Verbs",
  summary: "Learn how nouns and verbs work in English sentences.",
  duration: "١٠ دقائق",
  key_points: [],
  sort_order: 1,
};

describe("courseService lesson access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isConfigured.value = true;
  });

  it("uses the English package title even before the database migration is rerun", async () => {
    courseOrder.mockResolvedValue({
      data: [
        {
          id: "grade-1-system-1-term-1",
          title: "النحو - الأول الثانوي - الثانوي العام - الفصل الدراسي الأول",
          description: "",
          price: 229,
          thumbnail_url: "05-course-1.png",
          is_free: false,
          category: "نحو",
          level: "مبتدئ",
          lesson_count: 4,
          duration_text: "٤ أسابيع",
          grade: "الأول الثانوي",
          academic_system: "الثانوي العام",
          term: "الفصل الدراسي الأول",
        },
      ],
      error: null,
    });

    await expect(getCourses()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "grade-1-system-1-term-1",
          title:
            "English Course - الأول الثانوي - الثانوي العام - الفصل الدراسي الأول",
          price: "٢٢٩ ج.م",
        }),
      ]),
    );
  });

  it("uses only the actual database course price when determining paid access", async () => {
    courseOrder.mockResolvedValue({
      data: [
        {
          id: "course-sarf",
          title: "صرف الأفعال",
          description: "",
          price: 179,
          thumbnail_url: "06-course-2.png",
          is_free: false,
          category: "صرف",
          level: "متوسط",
          lesson_count: 4,
          duration_text: "٤ أسابيع",
          grade: null,
          academic_system: null,
          term: null,
        },
      ],
      error: null,
    });

    await getCourses();

    expect(isFreeCourse("course-sarf")).toBe(false);
    expect(isLocallyFreeCourse("course-sarf")).toBe(false);
  });

  it("loads course lesson listings without requesting video URLs", async () => {
    rpc.mockResolvedValue({ data: [lessonCatalogRow], error: null });

    await expect(getLessonCatalog()).resolves.toEqual([
      {
        id: "lesson-1",
        courseId: "course-paid",
        title: "Parts of Speech: Nouns and Verbs",
        summary: "Learn how nouns and verbs work in English sentences.",
        videoSrc: "",
        duration: "١٠ دقائق",
        keyPoints: [],
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("get_lesson_catalog");
    expect(from).not.toHaveBeenCalled();
  });

  it("returns lesson metadata but never requests the video for non-enrolled students", async () => {
    rpc
      .mockResolvedValueOnce({ data: [lessonCatalogRow], error: null })
      .mockResolvedValueOnce({ data: false, error: null });

    const lesson = await getLesson("lesson-1");

    expect(lesson.title).toBe("Parts of Speech: Nouns and Verbs");
    expect(lesson.videoSrc).toBe("");
    expect(rpc).toHaveBeenNthCalledWith(1, "get_lesson_catalog");
    expect(rpc).toHaveBeenNthCalledWith(2, "can_access_course", {
      p_course_id: "course-paid",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("loads the video URL only after course access is confirmed", async () => {
    rpc
      .mockResolvedValueOnce({ data: [lessonCatalogRow], error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    maybeSingle.mockResolvedValue({
      data: { ...lessonCatalogRow, video_src: "course-paid/lesson-1.mp4" },
      error: null,
    });

    await expect(getLesson("lesson-1")).resolves.toMatchObject({
      id: "lesson-1",
      videoSrc: "course-paid/lesson-1.mp4",
    });
    expect(from).toHaveBeenCalledWith("lessons");
    expect(select).toHaveBeenCalledWith(
      "id, course_id, title, summary, video_src, duration, key_points",
    );
  });

  it("does not reuse Arabic videos across English courses", async () => {
    isConfigured.value = false;

    const lessons = await getLessons();
    const reusedLessons = lessons.filter(
      (lesson) => lesson.courseId !== "course-nahw",
    );

    expect(reusedLessons).toHaveLength(0);
    expect(
      reusedLessons.filter((lesson) => lesson.courseId === "course-sarf"),
    ).toHaveLength(0);
  });
});
