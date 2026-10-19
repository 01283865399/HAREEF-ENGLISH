import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Tabs } from "../components/ui/Tabs";
import { useAuth } from "../features/auth/AuthContext";
import { usePlatform } from "../features/auth/PlatformContext";
import { useAsyncData } from "../hooks/useAsyncData";
import { isSupabaseConfigured } from "../lib/supabase";
import { generateUuidV4 } from "../lib/uuid";
import {
  canAccessCourse,
  getSignedCourseVideoUrl,
} from "../services/orderService";
import {
  getCourses,
  getLesson,
  getLessons,
  isFreeCourse,
  isLocallyFreeCourse,
} from "../services/courseService";
import type { Note } from "../types/domain";
import styles from "./Lesson.module.css";

type YouTubeStateEvent = { data: number };

type YouTubeApi = {
  PlayerState: { ENDED: number; PLAYING: number };
  Player: new (
    element: HTMLIFrameElement,
    options: {
      events: {
        onReady: () => void;
        onStateChange: (event: YouTubeStateEvent) => void;
        onError: () => void;
      };
    },
  ) => { destroy: () => void; getCurrentTime: () => number };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | undefined;

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => {
      youtubeApiPromise = undefined;
      reject(new Error("تعذّر تحميل مشغّل YouTube."));
    };
    window.onYouTubeIframeAPIReady = () => {
      if (window.YT) resolve(window.YT);
      else reject(new Error("تعذّر تهيئة مشغّل YouTube."));
    };
    document.head.appendChild(script);
  });

  return youtubeApiPromise;
}

export function LessonPage() {
  const { lessonId } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeFrameRef = useRef<HTMLIFrameElement>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [videoEnded, setVideoEnded] = useState(false);
  const [externalVideoConfirmed, setExternalVideoConfirmed] = useState(false);
  const [youtubeError, setYoutubeError] = useState(false);
  const [youtubePlayerReady, setYoutubePlayerReady] = useState(false);
  const [loadedYoutubeFrame, setLoadedYoutubeFrame] = useState<string | null>(
    null,
  );
  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const { user } = useAuth();
  const {
    notes,
    addOrUpdateNote,
    progress,
    completeLesson,
    recordPlayback,
  } = usePlatform();
  const lastPlaybackRecordRef = useRef(0);
  const recordPlaybackRef = useRef(recordPlayback);
  useEffect(() => {
    recordPlaybackRef.current = recordPlayback;
  }, [recordPlayback]);

  const { data, loading, error, retry } = useAsyncData(
    async () => {
      const lesson = await getLesson(lessonId ?? "");
      const hasAccess = isSupabaseConfigured()
        ? isFreeCourse(lesson.courseId) ||
          (await canAccessCourse(lesson.courseId))
        : isLocallyFreeCourse(lesson.courseId);
      if (!hasAccess) {
        return {
          lesson,
          lessons: [],
          course: null,
          hasAccess: false,
          videoUrl: null,
        };
      }
      const [lessons, courses] = await Promise.all([
        getLessons(),
        getCourses(),
      ]);
      const isYoutubeEmbed = lesson.videoSrc.startsWith(
        "https://www.youtube.com/embed/",
      );
      const videoUrl = lesson.videoSrc
        ? isYoutubeEmbed
          ? lesson.videoSrc
          : lesson.videoSrc.startsWith("https://")
            ? lesson.videoSrc
            : await getSignedCourseVideoUrl(lesson.videoSrc)
        : null;
      return {
        lesson,
        lessons: lessons.filter((item) => item.courseId === lesson.courseId),
        course: courses.find((item) => item.id === lesson.courseId) ?? null,
        hasAccess: true,
        videoUrl,
      };
    },
    `${lessonId ?? ""}:${user?.id ?? ""}`,
  );

  const savedNote = notes.find((note) => note.lessonId === lessonId);
  useEffect(() => {
    setNoteText(savedNote?.text ?? "");
  }, [savedNote?.id, savedNote?.text]);

  const youtubeEmbedUrl = data?.videoUrl?.startsWith(
    "https://www.youtube.com/embed/",
  )
    ? (() => {
        const url = new URL(data.videoUrl);
        url.searchParams.set("enablejsapi", "1");
        url.searchParams.set("origin", window.location.origin);
        url.searchParams.set("controls", "1");
        url.searchParams.set("fs", "1");
        url.searchParams.set("playsinline", "1");
        return url.href;
      })()
      : null;
  const youtubeVideoId = youtubeEmbedUrl
    ? new URL(youtubeEmbedUrl).pathname.split("/").pop()
    : undefined;
  const youtubeWatchUrl = youtubeVideoId
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeVideoId)}`
    : data?.videoUrl;
  const currentLessonId = data?.lesson.id;
  const youtubeFrameKey = `${currentLessonId ?? ""}:${youtubeEmbedUrl ?? ""}`;
  const isExternalEmbed = Boolean(
    data?.videoUrl &&
      !data.videoUrl.startsWith("https://www.youtube.com/embed/") &&
      /(?:vimeo\.com\/(?:video|embed)\/|\/embed\/)/i.test(data.videoUrl),
  );
  const videoComplete =
    videoEnded || (isExternalEmbed && externalVideoConfirmed);

  useEffect(() => {
    setVideoEnded(false);
    setExternalVideoConfirmed(false);
    setYoutubeError(false);
    setYoutubePlayerReady(false);
    lastPlaybackRecordRef.current = 0;
  }, [currentLessonId, youtubeEmbedUrl]);

  useEffect(() => {
    if (!youtubeEmbedUrl || !currentLessonId || youtubePlayerReady) return;
    const timeoutId = window.setTimeout(() => setYoutubeError(true), 15000);
    return () => window.clearTimeout(timeoutId);
  }, [currentLessonId, youtubeEmbedUrl, youtubePlayerReady]);

  useEffect(() => {
    if (
      !youtubeEmbedUrl ||
      !currentLessonId ||
      loadedYoutubeFrame !== youtubeFrameKey ||
      !youtubeFrameRef.current
    ) {
      return;
    }
    let active = true;
    let player:
      | { destroy: () => void; getCurrentTime: () => number }
      | undefined;
    let playbackTimer: number | undefined;

    void loadYouTubeApi()
      .then((youtube) => {
        if (!active || !youtubeFrameRef.current) return;
        player = new youtube.Player(youtubeFrameRef.current, {
          events: {
            onReady: () => {
              setYoutubePlayerReady(true);
              setYoutubeError(false);
            },
            onStateChange: (event) => {
              if (event.data === youtube.PlayerState.ENDED) {
                setVideoEnded(true);
                if (playbackTimer !== undefined) {
                  window.clearInterval(playbackTimer);
                  playbackTimer = undefined;
                }
              } else if (event.data === youtube.PlayerState.PLAYING) {
                if (playbackTimer === undefined) {
                  playbackTimer = window.setInterval(() => {
                    if (player && currentLessonId) {
                      recordPlaybackRef.current(
                        currentLessonId,
                        player.getCurrentTime(),
                      );
                    }
                  }, 5000);
                }
              } else if (playbackTimer !== undefined) {
                window.clearInterval(playbackTimer);
                playbackTimer = undefined;
              }
            },
            onError: () => setYoutubeError(true),
          },
        });
      })
      .catch(() => {
        if (active) setYoutubeError(true);
      });

    return () => {
      active = false;
      if (playbackTimer !== undefined) window.clearInterval(playbackTimer);
      player?.destroy();
    };
  }, [
    currentLessonId,
    loadedYoutubeFrame,
    youtubeEmbedUrl,
    youtubeFrameKey,
  ]);

  if (loading) return <div className={styles.state}>جارٍ تحميل الدرس...</div>;
  if (error)
    return (
      <div className={styles.state} role="alert">
        <p>{error}</p>
        <Button onClick={retry} type="button">
          إعادة المحاولة
        </Button>
      </div>
    );
  if (!data) return <div className={styles.state}>لا يوجد درس.</div>;

  if (!data.hasAccess) {
    return (
      <div className={styles.state}>
        <h2>هذا الدرس يتطلب اشتراكًا مفعّلًا</h2>
        <p>بعد مراجعة إيصال الدفع واعتماد الطلب سيصبح محتوى الدرس متاحًا.</p>
        <Link to={`/courses/${data.lesson.courseId}`}>عرض الاشتراك</Link>
      </div>
    );
  }

  const { lesson, lessons, course, videoUrl } = data;
  const completed = progress.completedLessonIds.includes(lesson.id);

  function seekTo(seconds: number) {
    if (videoRef.current) videoRef.current.currentTime = seconds;
  }

  function handleNativeVideoTimeUpdate(
    event: SyntheticEvent<HTMLVideoElement>,
  ) {
    const now = Date.now();
    if (now - lastPlaybackRecordRef.current < 5000) return;
    lastPlaybackRecordRef.current = now;
    recordPlayback(lesson.id, event.currentTarget.currentTime);
  }

  async function saveLessonNote() {
    if (!noteText.trim()) return;
    setNoteError(null);
    setNoteSaved(false);
    const note: Note = {
      id: savedNote?.id ?? generateUuidV4(),
      lessonId: lesson.id,
      text: noteText.trim(),
      seconds: videoRef.current?.currentTime ?? 0,
      updatedAt: new Date().toISOString(),
    };
    try {
      await addOrUpdateNote(note);
      setNoteSaved(true);
    } catch (reason) {
      setNoteError(
        reason instanceof Error ? reason.message : "تعذّر حفظ الملاحظة.",
      );
    }
  }

  const tabs = [
    {
      id: "overview",
      label: "نظرة عامة",
      content: (
        <Card className={styles.panel}>
          <h3>نقاط الدرس</h3>
          {lesson.keyPoints.length ? (
            <div className={styles.keyPoints}>
              {lesson.keyPoints.map((item) => (
                <button
                  key={`${item.label}-${item.seconds}`}
                  onClick={() => seekTo(item.seconds)}
                  type="button"
                >
                  <Icon name="play" /> {item.label}
                </button>
              ))}
            </div>
          ) : (
            <p className={styles.keyPointsEmpty}>
              لا توجد نقاط زمنية محددة لهذا الدرس.
            </p>
          )}
          <ProgressBar
            label="الإنجاز"
            value={
              completed
                ? 100
                : Math.min(95, Math.round((lesson.keyPoints.length / 5) * 100))
            }
          />
        </Card>
      ),
    },
    {
      id: "notes",
      label: "ملاحظاتي",
      content: (
        <Card className={styles.panel}>
          <label className={styles.notesLabel} htmlFor="lesson-note">
            أضف ملاحظة مرتبطة بهذا الدرس
          </label>
          <textarea
            id="lesson-note"
            onChange={(event) => {
              setNoteText(event.target.value);
              setNoteSaved(false);
            }}
            placeholder="اكتب ملاحظتك هنا"
            value={noteText}
          />
          {noteError ? (
            <p className={styles.error} role="alert">
              {noteError}
            </p>
          ) : null}
          {noteSaved ? (
            <p className={styles.saved} role="status">
              تم حفظ الملاحظة.
            </p>
          ) : null}
          <Button
            disabled={!noteText.trim()}
            onClick={saveLessonNote}
            type="button"
          >
            حفظ الملاحظة
          </Button>
        </Card>
      ),
    },
  ];

  return (
    <main className={styles.page}>
      <nav aria-label="مسار التنقل" className={styles.breadcrumb}>
        <Link to="/courses">{course?.title ?? "الكورسات"}</Link>
        <Icon name="chevron" />
        <span>{lesson.title}</span>
      </nav>

      <section className={styles.contentGrid}>
        <div className={styles.mainColumn}>
          <Card className={styles.videoCard}>
            <div className={styles.videoWrapper}>
              {videoUrl ? (
                videoUrl.startsWith("https://www.youtube.com/embed/") ? (
                  <iframe
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    className={styles.videoEmbed}
                    key={youtubeFrameKey}
                    loading="eager"
                    onLoad={() => setLoadedYoutubeFrame(youtubeFrameKey)}
                    onError={() => setYoutubeError(true)}
                    referrerPolicy="unsafe-url"
                    ref={youtubeFrameRef}
                    src={youtubeEmbedUrl ?? undefined}
                    title={lesson.title}
                  />
                ) : isExternalEmbed ? (
                  <iframe
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    className={styles.videoEmbed}
                    loading="eager"
                    referrerPolicy="strict-origin-when-cross-origin"
                    src={videoUrl}
                    title={lesson.title}
                  />
                ) : (
                  <video
                    controls
                    onEnded={() => {
                      setVideoEnded(true);
                    }}
                    onTimeUpdate={handleNativeVideoTimeUpdate}
                    poster="/src/assets/images/11-video-thumbnail.png"
                    ref={videoRef}
                    src={videoUrl}
                  >
                    المتصفح لا يدعم الفيديو.
                  </video>
                )
              ) : (
                <div className={styles.poster}>
                  <Icon name="playCircle" />
                  <span>الدروس تضاف قريبًا</span>
                </div>
              )}
              {isExternalEmbed && !externalVideoConfirmed ? (
                <Button
                  compact
                  onClick={() => setExternalVideoConfirmed(true)}
                  type="button"
                  variant="outline"
                >
                  أؤكد إكمال مشاهدة الفيديو
                </Button>
              ) : null}
              {youtubeError ? (
                <div className={styles.videoError} role="alert">
                  <span>تعذّر تشغيل الفيديو داخل المنصة.</span>
                  {youtubeWatchUrl ? (
                    <a href={youtubeWatchUrl} rel="noreferrer" target="_blank">
                      مشاهدة الفيديو على YouTube
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className={styles.metaRow}>
              <div>
                <h1>{lesson.title}</h1>
                <p>{lesson.summary}</p>
              </div>
              <Button
                onClick={() => completeLesson(lesson.id)}
                type="button"
                disabled={Boolean(videoUrl) && !videoComplete && !completed}
                variant={completed ? "secondary" : "primary"}
              >
                {completed
                  ? "تم إكمال الدرس"
                  : videoUrl && !videoComplete
                    ? "أكمل مشاهدة الدرس أولًا"
                    : "إكمال الدرس"}
              </Button>
            </div>
          </Card>

          <Tabs activeId={activeTab} items={tabs} onChange={setActiveTab} />
        </div>

        <aside className={styles.sidebar}>
          <Card className={styles.contentCard}>
            <div className={styles.sidebarHeading}>
              <div>
                <span className={styles.eyebrow}>محتوى الكورس</span>
                <h3>{course?.title ?? "الدروس"}</h3>
              </div>
              <span className={styles.lessonCount}>{lessons.length} دروس</span>
            </div>
            <div className={styles.lessonList}>
              {lessons.map((item, index) => {
                const isCurrent = item.id === lesson.id;
                const isDone = progress.completedLessonIds.includes(item.id);
                return (
                  <Link
                    aria-current={isCurrent ? "step" : undefined}
                    className={`${styles.lessonItem}${isCurrent ? ` ${styles.lessonCurrent}` : ""}`}
                    key={item.id}
                    to={`/dashboard/lesson/${item.id}`}
                  >
                    <span
                      className={`${styles.lessonStatus}${isDone ? ` ${styles.lessonDone}` : ""}`}
                    >
                      {isDone ? <Icon name="check" /> : index + 1}
                    </span>
                    <span className={styles.lessonTitle}>{item.title}</span>
                    <small>{item.duration}</small>
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card className={styles.teacherCard}>
            <span className={styles.teacherAvatar}>
              <Icon name="user" />
            </span>
            <div>
              <span className={styles.eyebrow}>مدرس المسار</span>
              <h3>مستر محمود عبد الواحد</h3>
              <p>مدرس أول اللغة الإنجليزية لكل المراحل</p>
            </div>
            <span className={styles.studentName}>
              مرحبًا، {user?.name ?? "الطالب"}
            </span>
          </Card>
        </aside>
      </section>
    </main>
  );
}
