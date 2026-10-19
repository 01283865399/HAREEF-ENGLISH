import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Reveal } from "../components/ui/Reveal";
import { Icon } from "../components/ui/Icon";
import { strings } from "../data/strings";
import { teacherInfo } from "../data/teacherInfo";
import { academicSystemLabel, categoryLabel, levelLabel, matchesCategory } from "../data/coursePresentation";
import { getCourses } from "../services/courseService";
import { useAsyncData } from "../hooks/useAsyncData";
import { InteractiveIrab } from "../features/irab/InteractiveIrab";
import { LevelTestModal } from "../features/home/LevelTestModal";
import { usePlatform } from "../features/auth/PlatformContext";
import { currentStreak, lessonProgress } from "../services/progressService";
import { academicGrades, academicSystems } from "../data/coursePackages";
import styles from "./Home.module.css";

export function HomePage() {
  const { progress } = usePlatform();
  const {
    data: coursesData,
    loading: loadingCourses,
    error: coursesError,
  } = useAsyncData(getCourses);
  const courses = coursesData ?? [];
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");
  const [levelTestOpen, setLevelTestOpen] = useState(false);
  const filterValues = strings.home.filters;

  const visibleCourses =
    selectedCategory === "الكل"
      ? courses
      : courses.filter((course) => matchesCategory(course.category, selectedCategory));

  return (
    <div className={styles.page}>
      <section className={styles.heroWrap}>
        <div className={`container ${styles.hero}`}>
          <div className={styles.content}>
            <span className={styles.badge}>
              <Icon name="spark" /> {strings.home.heroBadge}
            </span>
            <h1>
              {strings.home.heroTitle}
              <span>{strings.home.heroTitleSecond}</span>
            </h1>
            <p>{strings.home.heroDescription}</p>
            <div className={styles.ctaRow}>
              <Link to="/courses" className={styles.primaryLinkButton}>
                <span>{strings.home.exploreCourses}</span>
                <Icon name="play" />
              </Link>
              <Button type="button" variant="secondary">
                {strings.home.freeLesson}
              </Button>
            </div>
            <div className={styles.levelCard}>
              <div className={styles.levelIcon}>
                <Icon name="check" />
              </div>
              <div>
                <strong>{strings.home.levelTest}</strong>
                    <small>جاوب على كام سؤال عشان نحدد مستواك.</small>
              </div>
              <Button
                compact
                onClick={() => setLevelTestOpen(true)}
                type="button"
              >
                {strings.home.start}
              </Button>
            </div>
            <div className={styles.students}>تابع تقدمك من لوحة الطالب.</div>
          </div>

          <div className={styles.media}>
            <div className={styles.mediaPlaceholder}>
              <img src="/teacher-mahmoud.jpg" alt="مستر محمود عبد الواحد" />
            </div>
            <div className={`${styles.floatingCard} ${styles.right}`}>
              <Icon name="video" />
              <div>
                <strong>{strings.home.nextSession}</strong>
                <small>
                  {progress.sessions[0]?.time ?? "مفيش مواعيد حصص مضافة لسه"}
                </small>
              </div>
            </div>
            <div className={`${styles.floatingCard} ${styles.left}`}>
              <div className={styles.ring}>
                <ProgressBar value={lessonProgress(progress)} label="تقدمك" />
              </div>
              <strong>{strings.home.weeklyProgress}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="container">
        <Card className={styles.statsCard}>
          <div className={styles.statsGrid}>
            {[
              [String(progress.completedLessonIds.length), "دروس خلصتها"],
              [String(Math.floor(progress.watchedSeconds / 60)), "دقيقة مشاهدة"],
              [String(currentStreak(progress)), "يوم متابعة"],
              [String(Object.keys(progress.quizBestScores).length), "اختبارات خلصتها"],
            ].map(([value, label]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="container">
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>{strings.home.featuresEyebrow}</span>
          <h2>{strings.home.whyTitle}</h2>
          <p>{strings.home.whyDescription}</p>
        </div>
        <Reveal className={styles.featureGrid}>
          <Card className={styles.libraryCard}>
            <img alt="English study library" src="/src/assets/images/04-books-stack-desk.png" />
            <div>
              <h3>{strings.home.libraryTitle}</h3>
              <p>{strings.home.libraryDescription}</p>
            </div>
          </Card>
          <div className={styles.irabCardWrap}>
            <InteractiveIrab />
          </div>
        </Reveal>
        <div className={styles.smallFeatureGrid}>
          {strings.home.featureCards.map((feature) => (
            <Card key={feature.title} className={styles.smallFeature}>
              <div className={styles.featureIcon}>
                <Icon name={feature.icon} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.detail}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="container" id="courses">
        <div className={styles.sectionHeaderRow}>
          <div>
            <span className={styles.eyebrow}>{strings.home.courseEyebrow}</span>
            <h2>{strings.home.courseTitle}</h2>
            <p>{strings.home.courseDescription}</p>
          </div>
          <div className={styles.filters}>
            {strings.home.filters.map((filter, index) => (
              <button
                className={
                  selectedCategory === (filterValues[index] ?? "الكل")
                    ? styles.filterActive
                    : ""
                }
                key={filter}
                onClick={() =>
                  setSelectedCategory(filterValues[index] ?? "الكل")
                }
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.courseGrid}>
          {loadingCourses ? (
            <div className={styles.loading} />
          ) : coursesError ? (
            <div className={styles.emptyState}>{coursesError}</div>
          ) : (
            visibleCourses.map((course) => (
              <Card key={course.id} className={styles.courseCard}>
                <img
                  alt={course.title}
                  src={`/src/assets/images/${course.image}`}
                />
                <div className={styles.courseBody}>
                  <div className={styles.courseTopRow}>
                    <span className={styles.chip}>{categoryLabel(course.category)}</span>
                    <span className={styles.level}>{levelLabel(course.level)}</span>
                  </div>
                  <h3>{course.title}</h3>
                  <div className={styles.meta}>
                    <span>
                      <Icon name="clock" /> {course.lessons} · {course.duration}
                    </span>
                  </div>
                  <div className={styles.priceRow}>
                    <strong>{course.price}</strong>
                    <Link className={styles.subscribe} to="/login">
                      {strings.home.subscribe}
                    </Link>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      <section className="container">
        <Card className={styles.quoteCard}>
          <span className={styles.quoteMark}>”</span>
          <div>
            <span className={styles.eyebrow}>
              {strings.home.todayBenefitEyebrow}
            </span>
            <blockquote>{strings.home.benefitPlaceholder}</blockquote>
            <small>{strings.home.benefitSource}</small>
            <Button compact type="button" variant="secondary">
              {strings.home.moreBenefits}
            </Button>
          </div>
        </Card>
      </section>

      <section className="container">
        <div className={styles.teacherCard}>
          <div className={styles.teacherText}>
            <span className={styles.eyebrowLight}>
              {strings.home.aboutEyebrow}
            </span>
            <h2>{strings.home.teacherName}</h2>
            <p>{strings.home.teacherBio}</p>
            <div className={styles.credentials}>
              {strings.home.teacherCredentials.map((cred) => (
                <span key={cred}>{cred}</span>
              ))}
            </div>
            <Link className={styles.teacherProfileLink} to="/#about">
              {strings.home.learnAboutTeacher}
              <Icon name="arrow" />
            </Link>
          </div>
          <div className={styles.teacherIdentity}>
            <img src="/logo-icon.png?v=3" alt="" />
            <span>{teacherInfo.tagline}</span>
            <strong>{teacherInfo.nickname}</strong>
            <small>{teacherInfo.hashtag}</small>
          </div>
        </div>
      </section>

      <section className="container">
        <div className={styles.sectionHeaderCenter}>
          <span className={styles.eyebrow}>باقات الثانوية</span>
          <h2>اختار صفك ونظامك الدراسي</h2>
        </div>
        <div className={styles.planGrid}>
          {academicGrades.map((grade) => (
            <Card key={grade} className={styles.plan}>
              <h3>{grade}</h3>
              <ul>
                {academicSystems.map((system) => (
                  <li key={system}>
                    <Icon name="check" /> {academicSystemLabel(system)}
                  </li>
                ))}
              </ul>
              <Link className={styles.subscribe} to="/packages">
                ترمين · التفاصيل هتضاف قريبًا
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="container">
        <div className={styles.ctaBanner}>
          <img
            alt="ابدأ رحلتك في اللغة الإنجليزية"
            src="/src/assets/images/10-banner-books-and-quill.png"
          />
          <div className={styles.ctaOverlay}>
            <h3>{strings.home.ctaTitle}</h3>
            <p>{strings.home.ctaDescription}</p>
            <Button type="button" variant="secondary">
              {strings.home.registerFree}
            </Button>
          </div>
        </div>
      </section>

      <LevelTestModal
        onClose={() => setLevelTestOpen(false)}
        open={levelTestOpen}
      />
    </div>
  );
}
