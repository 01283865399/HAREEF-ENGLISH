import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";
import { academicSystemLabel } from "../data/coursePresentation";
import {
  academicGrades,
  academicSystems,
  coursePackageTemplates,
} from "../data/coursePackages";
import { useAsyncData } from "../hooks/useAsyncData";
import { getCourses, isFreeCourse } from "../services/courseService";
import styles from "./Packages.module.css";

export function PackagesPage() {
  const { data: courses, loading, error, retry } = useAsyncData(getCourses);
  const coursesById = new Map(
    (courses ?? []).map((course) => [course.id, course]),
  );

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <span className={styles.eyebrow}>اختر مسارك الدراسي</span>
        <h2>الباقات والكورسات المتاحة</h2>
        <p>
          تصفّح الكورسات المتاحة الآن، واختر الصف والنظام والفصل المناسب لمسارك.
        </p>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>جاهزة للانضمام</span>
            <h3>الكورسات المتاحة الآن</h3>
          </div>
          <Link className={styles.backLink} to="/courses">
            دوراتي
          </Link>
        </div>
        {loading ? (
          <div aria-label="جارٍ تحميل الكورسات" className={styles.loading} />
        ) : error ? (
          <div className={styles.emptyState} role="alert">
            <p>{error}</p>
            <button onClick={retry} type="button">
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <div className={styles.courseGrid}>
            {(courses ?? []).map((course) => (
              <Card className={styles.courseCard} key={course.id}>
                <span className={styles.chip}>
                  {isFreeCourse(course.id) ? "مجاني" : "متاح"}
                </span>
                <h4>{course.title}</h4>
                <p>
                  {course.category} · {course.level} · {course.lessons}
                </p>
                <div className={styles.courseFooter}>
                  <strong>
                    {isFreeCourse(course.id) ? "مجانًا" : course.price}
                  </strong>
                  <Link to={`/courses/${course.id}`}>
                    التفاصيل والاشتراك
                    <Icon name="arrow" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>باقات المرحلة الثانوية</span>
            <h3>اختر الصف والنظام الدراسي</h3>
          </div>
        </div>
        <div className={styles.gradeList}>
          {academicGrades.map((grade) => (
            <Card className={styles.gradeCard} key={grade}>
              <h3>{grade}</h3>
              <div className={styles.systemGrid}>
                {academicSystems.map((system) => (
                  <section className={styles.systemCard} key={system}>
                    <h4>{academicSystemLabel(system)}</h4>
                    <div className={styles.termList}>
                      {coursePackageTemplates
                        .filter(
                          (template) =>
                            template.grade === grade &&
                            template.system === system,
                        )
                        .map((template) => {
                          const course = coursesById.get(template.id);
                          return (
                            <div className={styles.termItem} key={template.id}>
                              <span>{template.term}</span>
                              {course ? (
                                <Link
                                  className={styles.packageLink}
                                  to={`/courses/${course.id}`}
                                >
                                  {course.price}
                                  <Icon name="arrow" />
                                </Link>
                              ) : (
                                <span className={styles.soon}>غير متاح</span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </section>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <p className={styles.note}>
          تفاصيل المحتوى والفيديوهات هتظهر هنا لما يتم إضافتها لكل مسار.
        </p>
      </section>
    </main>
  );
}
