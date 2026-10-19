import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { useAuth } from "../features/auth/AuthContext";
import { usePlatform } from "../features/auth/PlatformContext";
import { getCourses, getLesson } from "../services/courseService";
import { useAsyncData } from "../hooks/useAsyncData";
import {
  activityForLastSevenDays,
  completedLessonsThisWeek,
  currentStreak,
} from "../services/progressService";
import styles from "./Dashboard.module.css";

export function DashboardPage() {
  const { user } = useAuth();
  const { progress, progressLoading } = usePlatform();
  const { data: coursesData } = useAsyncData(getCourses);
  const { data: lastLesson } = useAsyncData(() =>
    progress.lastLessonId
      ? getLesson(progress.lastLessonId)
      : Promise.resolve(null),
  );
  const courses = coursesData ?? [];
  const watched = progress.completedLessonIds.length;
  const activity = activityForLastSevenDays(progress);
  const streak = currentStreak(progress);
  const lessonsThisWeek = completedLessonsThisWeek(progress);
  const courseTitle = lastLesson
    ? courses.find((course) => course.id === lastLesson.courseId)?.title ?? ""
    : "";
  const goalPercentage = Math.min(
    100,
    Math.round((lessonsThisWeek / progress.weeklyGoal) * 100),
  );
  const lessonDuration = parseDuration(lastLesson?.duration ?? "");
  const lessonPercentage = lessonDuration
    ? Math.min(100, Math.round((progress.lastPosition / lessonDuration) * 100))
    : 0;

  return (
    <div className={styles.page}>
      {progressLoading ? (
        <p role="status">جارٍ تحميل تقدّمك المحفوظ...</p>
      ) : null}
      <div className={styles.topRow}>
        <Card className={styles.heroCard}>
          <div className={styles.heroMedia}>
            <img
              alt="متابعة الدرس"
              src="/src/assets/images/11-video-thumbnail.png"
            />
            <span className={styles.badge}>متابعة المشاهدة</span>
          </div>
          <div className={styles.heroInfo}>
            <h3>{lastLesson?.title ?? "ابدأ رحلتك التعليمية"}</h3>
            <p>{courseTitle || (lastLesson ? "" : "اختر كورسًا وابدأ التعلّم")}</p>
            {lastLesson && lessonDuration ? (
              <ProgressBar label="تقدّم الدرس" value={lessonPercentage} />
            ) : lastLesson ? (
              <p>
                آخر موضع محفوظ: {formatPosition(progress.lastPosition)}
              </p>
            ) : null}
            <Link
              className={styles.resumeButton}
              to={
                lastLesson
                  ? `/dashboard/lesson/${progress.lastLessonId}`
                  : "/courses"
              }
            >
              {lastLesson ? "أكمل الدرس" : "اذهب إلى دوراتي"}
            </Link>
          </div>
        </Card>
        <Card className={styles.activityCard}>
          <h3>النشاط الأسبوعي</h3>
          <div className={styles.barChart}>
            {activity.map(({ date, seconds, label }) => (
              <div key={date} className={styles.barWrap}>
                <span
                  style={{
                    height: `${Math.max(
                      seconds ? 8 : 2,
                        Math.min(
                          100,
                          (seconds /
                            Math.max(...activity.map((day) => day.seconds), 1)) *
                            100,
                        ),
                    )}%`,
                  }}
                  title={`${Math.round(seconds / 60)} دقيقة`}
                />
                <small>{label}</small>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className={styles.middleRow}>
        <Card className={styles.goalCard} dark>
          <div
            className={styles.goalRing}
            style={{
              background: `conic-gradient(var(--accent-2) 0 ${goalPercentage}%, var(--border) ${goalPercentage}% 100%)`,
            }}
          >
            <span>{goalPercentage}%</span>
          </div>
          <div>
            <h4>الهدف الأسبوعي</h4>
            <p>
              {lessonsThisWeek} من {progress.weeklyGoal} دروس
            </p>
          </div>
        </Card>
        <Card className={styles.streakCard}>
          <h4>الأيام المتتالية</h4>
          <div className={styles.dayPills}>
            {[1, 2, 3, 4, 5, 6, 7].map((item) => (
              <span
                className={item <= streak ? styles.filled : ""}
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        </Card>
      </div>
      <div className={styles.statGrid}>
        {[
          ["دروس مكتملة", watched],
          ["دقائق المشاهدة", Math.floor(progress.watchedSeconds / 60)],
          ["دروس هذا الأسبوع", lessonsThisWeek],
          ["أيام متتالية", streak],
        ].map(([label, value]) => (
          <Card key={label} className={styles.statCard}>
            <span>{label}</span>
            <strong>{value}</strong>
          </Card>
        ))}
      </div>
      <div className={styles.bottomRow}>
        <Card className={styles.skillsCard}>
          <h3>نتائج الاختبارات</h3>
          {Object.keys(progress.quizBestScores).length ? (
            Object.entries(progress.quizBestScores).map(([quizId, score]) => (
              <div key={quizId} className={styles.skillRow}>
                <span>{quizId}</span>
                <div className={styles.skillTrack}>
                  <span style={{ width: `${score}%` }} />
                </div>
                <strong>{score}%</strong>
              </div>
            ))
          ) : (
            <p className={styles.sessionEmpty}>ستظهر نتائجك بعد أداء الاختبارات.</p>
          )}
        </Card>
        <Card className={styles.assignmentsCard}>
          <h3>ملخص التعلّم</h3>
          <p>
            أكملت {watched} {watched === 1 ? "درس" : "دروس"} وسجّلت{" "}
            {Math.floor(progress.watchedSeconds / 60)} دقيقة مشاهدة.
          </p>
          <Link className={styles.resumeButton} to="/courses">
            استكشف الكورسات
          </Link>
        </Card>
      </div>
      <Card className={styles.assignmentsCard} id="assignments">
        <h3>الواجبات</h3>
        {progress.assignments.length ? (
          <div className={styles.assignmentList}>
            {progress.assignments.map((item) => (
              <div key={item.id} className={styles.assignmentItem}>
                <strong>{item.title}</strong>
                <small>{item.dueDate}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.sessionEmpty}>لا توجد واجبات مسجّلة حاليًا.</p>
        )}
      </Card>
      <Card className={styles.sessionsCard} id="schedule">
        <div className={styles.sessionsHeading}>
          <h3>الحصص القادمة</h3>
          <span className={styles.eyebrow}>مواعيدك التعليمية</span>
        </div>
        {progress.sessions.length ? (
          <div className={styles.sessionList}>
            {progress.sessions.map((session) => (
              <div className={styles.sessionItem} key={session.id}>
                <span className={styles.sessionIcon}>
                  <span />
                </span>
                <div>
                  <strong>{session.title}</strong>
                  <small>{session.time}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.sessionEmpty}>
            لا توجد حصص مسجّلة في حسابك حاليًا.
          </p>
        )}
      </Card>
      <div className={styles.footerNote}>
        <span>مرحبًا، {user?.name ?? "بك"}</span>
      </div>
    </div>
  );
}

function parseDuration(duration: string): number {
  const normalized = duration.replace(/[٠-٩]/g, (digit) =>
    String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
  );
  const parts = normalized.split(":").map(Number);
  const [minutesPart, secondsPart] = parts;
  if (
    parts.length === 2 &&
    minutesPart !== undefined &&
    secondsPart !== undefined &&
    parts.every(Number.isFinite)
  ) {
    return minutesPart * 60 + secondsPart;
  }
  const minutes = normalized.match(/(\d+)\s*دقيقة/);
  return minutes ? Number(minutes[1]) * 60 : 0;
}

function formatPosition(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
