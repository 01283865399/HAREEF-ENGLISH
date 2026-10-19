/* eslint-disable react-refresh/only-export-components */
import {
  useEffect,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  initialProgress,
  markLessonComplete,
  migrateLegacyProgress,
  normalizeProgress,
  saveNote,
  saveProgress,
  saveQuizScore,
  updatePlayback,
} from "../../services/progressService";
import { readStorage } from "../../services/api";
import { isFreeCourse } from "../../services/courseService";
import type { Note, ProgressState } from "../../types/domain";
import type { CourseCategory } from "../../types/domain";
import { useAuth } from "./AuthContext";
import { isAdminDemoUser } from "../../services/adminDemoService";
import {
  enrollInFreeCourse,
  getMyEnrolledCourseIds,
  getStudentProgress,
  saveStudentProgress,
} from "../../services/studentDataService";

interface PlatformState {
  progress: ProgressState;
  notes: Note[];
}

type PlatformAction =
  | { type: "progress"; progress: ProgressState }
  | { type: "enrollments"; courseIds: string[] }
  | { type: "notes"; notes: Note[] };

interface PlatformContextValue extends PlatformState {
  progressLoading: boolean;
  progressError: string | null;
  retryProgress: () => void;
  refreshEnrollments: () => Promise<void>;
  completeLesson: (lessonId: string) => void;
  recordPlayback: (lessonId: string, seconds: number) => void;
  saveScore: (quizId: string, score: number) => void;
  saveLevelTest: (score: number, track: CourseCategory) => void;
  updateAssignment: (id: string, submitted: boolean) => void;
  enroll: (courseId: string) => Promise<void>;
  addOrUpdateNote: (note: Note) => Promise<void>;
  removeNote: (noteId: string) => void;
}

const Context = createContext<PlatformContextValue | null>(null);

function reducer(state: PlatformState, action: PlatformAction): PlatformState {
  if (action.type === "progress") return { ...state, progress: action.progress };
  if (action.type === "enrollments") {
    return {
      ...state,
      progress: { ...state.progress, enrolledCourseIds: action.courseIds },
    };
  }
  return { ...state, notes: action.notes };
}

function initialState(): PlatformState {
  const stored = readStorage<unknown>("alarrab:progress", null);
  const hasCurrentSchema =
    typeof stored === "object" &&
    stored !== null &&
    "activityByDate" in stored &&
    "lessonCompletionDates" in stored;
  return {
    progress: hasCurrentSchema
      ? normalizeProgress(stored)
      : migrateLegacyProgress(stored),
    notes: readStorage<Note[]>("alarrab:notes", []),
  };
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [progressLoading, setProgressLoading] = useState(Boolean(user));
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressErrorKind, setProgressErrorKind] = useState<
    "load" | "save" | null
  >(null);
  const [reloadToken, setReloadToken] = useState(0);
  const previousUserId = useRef(user?.id ?? null);
  const persistenceQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!user) {
      if (previousUserId.current !== null) {
        dispatch({ type: "progress", progress: initialProgress });
      }
      previousUserId.current = null;
      setProgressLoading(false);
      setProgressError(null);
      setProgressErrorKind(null);
      return undefined;
    }
    if (isAdminDemoUser(user)) {
      setProgressLoading(false);
      setProgressError(null);
      setProgressErrorKind(null);
      return undefined;
    }
    if (previousUserId.current !== user.id) {
      dispatch({ type: "progress", progress: initialProgress });
      previousUserId.current = user.id;
    }
    let active = true;
    setProgressLoading(true);
    setProgressError(null);
    setProgressErrorKind(null);
    Promise.all([
      getStudentProgress(user.id),
      getMyEnrolledCourseIds(),
    ])
      .then(async ([remoteProgress, currentEnrollments]) => {
        let enrolledCourseIds = currentEnrollments;
        if (remoteProgress === null) {
          const legacyProgress = migrateLegacyProgress(
            readStorage<unknown>("alarrab:progress", null),
          );
          const legacyFreeCourses = legacyProgress.enrolledCourseIds.filter(
            (courseId) =>
              isFreeCourse(courseId) && !currentEnrollments.includes(courseId),
          );
          if (legacyFreeCourses.length) {
            await Promise.all(
              legacyFreeCourses.map(enrollInFreeCourse),
            );
            enrolledCourseIds = await getMyEnrolledCourseIds();
          }
        }
        if (!active) return;
        const progress = normalizeProgress(remoteProgress ?? initialProgress);
        dispatch({
          type: "progress",
          progress: { ...progress, enrolledCourseIds },
        });
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setProgressError(
          reason instanceof Error ? reason.message : "تعذّر تحميل بياناتك.",
        );
        setProgressErrorKind("load");
      })
      .finally(() => {
        if (active) setProgressLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, reloadToken]);

  const commit = useCallback((progress: ProgressState) => {
    dispatch({ type: "progress", progress });
    setProgressError(null);
    setProgressErrorKind(null);
    persistenceQueue.current = persistenceQueue.current
      .then(() =>
        user && !isAdminDemoUser(user)
          ? saveStudentProgress(user.id, progress)
          : saveProgress(progress),
      )
      .catch((reason: unknown) => {
        setProgressError(
          reason instanceof Error ? reason.message : "تعذّر حفظ تقدّمك.",
        );
        setProgressErrorKind("save");
      });
  }, [user]);

  const completeLesson = useCallback(
    (lessonId: string) => commit(markLessonComplete(state.progress, lessonId)),
    [commit, state.progress],
  );
  const recordPlayback = useCallback(
    (lessonId: string, seconds: number) =>
      commit(updatePlayback(state.progress, lessonId, seconds)),
    [commit, state.progress],
  );
  const saveScore = useCallback(
    (quizId: string, score: number) =>
      commit(saveQuizScore(state.progress, quizId, score)),
    [commit, state.progress],
  );
  const saveLevelTest = useCallback(
    (score: number, track: CourseCategory) =>
      commit({ ...state.progress, levelTestResult: { score, track } }),
    [commit, state.progress],
  );
  const updateAssignment = useCallback(
    (id: string, submitted: boolean) =>
      commit({
        ...state.progress,
        assignments: state.progress.assignments.map((item) =>
          item.id === id ? { ...item, submitted } : item,
        ),
      }),
    [commit, state.progress],
  );
  const enroll = useCallback(
    async (courseId: string) => {
      if (user) {
        await enrollInFreeCourse(courseId);
        const enrolledCourseIds = await getMyEnrolledCourseIds();
        commit({ ...state.progress, enrolledCourseIds });
        return;
      }
      commit({
        ...state.progress,
        enrolledCourseIds: state.progress.enrolledCourseIds.includes(courseId)
          ? state.progress.enrolledCourseIds
          : [...state.progress.enrolledCourseIds, courseId],
      });
    },
    [commit, state.progress, user],
  );
  const refreshEnrollments = useCallback(async () => {
    if (!user) return;
    setProgressError(null);
    setProgressErrorKind(null);
    try {
      dispatch({
        type: "enrollments",
        courseIds: await getMyEnrolledCourseIds(),
      });
    } catch (reason) {
      setProgressError(
        reason instanceof Error
          ? reason.message
          : "تعذّر تحديث قائمة اشتراكاتك.",
      );
      setProgressErrorKind("load");
    }
  }, [user]);
  const retryProgress = useCallback(() => {
    if (progressErrorKind !== "save") {
      setReloadToken((token) => token + 1);
      return;
    }
    setProgressError(null);
    setProgressErrorKind(null);
    const progress = state.progress;
    persistenceQueue.current = persistenceQueue.current
      .then(() =>
        user
          ? saveStudentProgress(user.id, progress)
          : saveProgress(progress),
      )
      .catch((reason: unknown) => {
        setProgressError(
          reason instanceof Error ? reason.message : "تعذّر حفظ تقدّمك.",
        );
        setProgressErrorKind("save");
      });
  }, [progressErrorKind, state.progress, user]);
  const addOrUpdateNote = useCallback(async (note: Note) => {
    const next = await saveNote(note);
    dispatch({ type: "notes", notes: next });
  }, []);
  const removeNote = useCallback(
    (noteId: string) => {
      const notes = state.notes.filter(({ id }) => id !== noteId);
      window.localStorage.setItem("alarrab:notes", JSON.stringify(notes));
      dispatch({ type: "notes", notes });
    },
    [state.notes],
  );

  const value = useMemo(
    () => ({
      ...state,
      progressLoading,
      progressError,
      retryProgress,
      refreshEnrollments,
      completeLesson,
      recordPlayback,
      saveScore,
      saveLevelTest,
      updateAssignment,
      enroll,
      addOrUpdateNote,
      removeNote,
    }),
    [
      state,
      progressLoading,
      progressError,
      retryProgress,
      refreshEnrollments,
      completeLesson,
      recordPlayback,
      saveScore,
      saveLevelTest,
      updateAssignment,
      enroll,
      addOrUpdateNote,
      removeNote,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePlatform(): PlatformContextValue {
  const value = useContext(Context);
  if (!value)
    throw new Error("usePlatform must be used inside PlatformProvider.");
  return value;
}
