import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";
import { strings } from "../data/strings";
import { categoryLabel, levelLabel } from "../data/coursePresentation";
import { getCourses, isFreeCourse } from "../services/courseService";
import { useAsyncData } from "../hooks/useAsyncData";
import { usePlatform } from "../features/auth/PlatformContext";
import styles from "./Courses.module.css";

export function CoursesPage() {
  const {
    progress,
    progressLoading,
    progressError,
    retryProgress,
    refreshEnrollments,
  } = usePlatform();
  const { data, loading, error, retry } = useAsyncData(getCourses);
  const courses = (data ?? []).filter((course) =>
    progress.enrolledCourseIds.includes(course.id),
  );
  useEffect(() => {
    void refreshEnrollments();
  }, [refreshEnrollments]);

  return (
    <main className={styles.page}>
      <section>
        <header className={styles.heading}>
          <div>
            <span className={styles.eyebrow}>مساراتك التعليمية</span>
            <h2>دوراتي</h2>
            <p>هنا تجد الكورسات التي اشتركت فيها فقط.</p>
          </div>
          <Link className={styles.backLink} to="/packages">
            تصفّح الباقات المتاحة
          </Link>
        </header>

        {loading || progressLoading ? (
          <div
            aria-label={strings.actions.loading}
            className={styles.loading}
          />
        ) : error || progressError ? (
          <div className={styles.emptyState} role="alert">
            <p>{error ?? progressError}</p>
            <button
              onClick={() => {
                if (error) retry();
                if (progressError) retryProgress();
              }}
              type="button"
            >
              {strings.actions.retry}
            </button>
          </div>
        ) : courses.length === 0 ? (
          <div className={styles.emptyState}>
            <p>لم تشترك في أي كورس بعد.</p>
            <Link className={styles.subscribe} to="/packages">
              اكتشف الكورسات والباقات
            </Link>
          </div>
        ) : (
          <div className={styles.courseGrid}>
            {courses.map((course) => {
              const free = isFreeCourse(course.id);
              return (
                <Card interactive key={course.id} className={styles.courseCard}>
                  <div className={styles.cardMedia}>
                    <img
                      alt={course.title}
                      src={`/src/assets/images/${course.image}`}
                    />
                    <span
                      className={free ? styles.freeBadge : styles.paidBadge}
                    >
                      {free ? "مجاني" : "مدفوع"}
                    </span>
                  </div>
                  <div className={styles.courseBody}>
                    <div className={styles.courseTopRow}>
                      <span className={styles.chip}>{categoryLabel(course.category)}</span>
                      <span className={styles.level}>{levelLabel(course.level)}</span>
                    </div>
                    <h3>{course.title}</h3>
                    <div className={styles.meta}>
                      <span>
                        <Icon name="cap" /> {course.lessons}
                      </span>
                      <span>
                        <Icon name="clock" /> {course.duration}
                      </span>
                    </div>
                    <div className={styles.priceRow}>
                      <strong>{free ? "مجانًا" : course.price}</strong>
                      <Link
                        className={styles.subscribe}
                        to={`/courses/${course.id}`}
                      >
                        التفاصيل
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
