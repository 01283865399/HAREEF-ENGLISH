import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { Icon } from "../components/ui/Icon";
import { Pattern } from "../components/ui/Pattern";
import { useAuth } from "../features/auth/AuthContext";
import { usePlatform } from "../features/auth/PlatformContext";
import { isAdminDemoUser } from "../services/adminDemoService";
import { useAsyncData } from "../hooks/useAsyncData";
import { categoryLabel, courseDescription, levelLabel } from "../data/coursePresentation";
import { isSupabaseConfigured } from "../lib/supabase";
import {
  getCourses,
  getLessonCatalog,
  isFreeCourse,
  isLocallyFreeCourse,
} from "../services/courseService";
import {
  canAccessCourse,
  getMyCourseOrderStatus,
  type OrderStatus,
} from "../services/orderService";
import { CoursePaymentForm } from "./CoursePaymentForm";
import styles from "./CourseDetails.module.css";

export function CourseDetailsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const demoAccount = import.meta.env.DEV && isAdminDemoUser(user);
  const { progress, enroll } = usePlatform();
  const [courseAccess, setCourseAccess] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<{
    id: string;
    whatsappLink: string | null;
  } | null>(null);
  const { data, loading, error, retry } = useAsyncData(async () => {
    const [courses, lessons] = await Promise.all([
      getCourses(),
      getLessonCatalog(),
    ]);
    const course = courses.find((item) => item.id === courseId);
    if (!course) throw new Error("لم يتم العثور على هذا الكورس.");
    return {
      course,
      lessons: lessons.filter((item) => item.courseId === course.id),
    };
  }, courseId ?? "");

  useEffect(() => {
    if (demoAccount) {
      setCourseAccess(false);
      setOrderStatus(null);
      setAccessLoading(false);
      setAccessError(null);
      return;
    }
    if (!user || !data) {
      setCourseAccess(false);
      setOrderStatus(null);
      setAccessLoading(false);
      setAccessError(null);
      return;
    }
    let active = true;
    setAccessLoading(true);
    setAccessError(null);
    Promise.all([
      canAccessCourse(data.course.id),
      getMyCourseOrderStatus(data.course.id),
    ])
      .then(([hasAccess, status]) => {
        if (!active) return;
        setCourseAccess(hasAccess);
        setOrderStatus(status);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setAccessError(
          reason instanceof Error
            ? reason.message
            : "تعذّر التحقق من صلاحية الكورس.",
        );
      })
      .finally(() => {
        if (active) setAccessLoading(false);
      });
    return () => {
      active = false;
    };
  }, [data, demoAccount, user]);

  if (loading) {
    return <main className={styles.state}>جارٍ تحميل تفاصيل الكورس...</main>;
  }

  if (error) {
    return (
      <main className={styles.state} role="alert">
        <p>{error}</p>
        <Button onClick={retry} type="button">
          إعادة المحاولة
        </Button>
        <Link className={styles.backLink} to="/">
          العودة إلى الرئيسية
        </Link>
      </main>
    );
  }

  if (!data) return null;

  const { course, lessons } = data;
  const free = isSupabaseConfigured()
    ? isFreeCourse(course.id)
    : isLocallyFreeCourse(course.id);
  const hasAccess = free || courseAccess;
  const enrolled =
    (free && progress.enrolledCourseIds.includes(course.id)) || courseAccess;
  const selectedCourseId = course.id;

  async function enrollInCourse() {
    if (!user) {
      navigate("/login", { state: { from: `/courses/${selectedCourseId}` } });
      return;
    }
    if (free) {
      setEnrollmentLoading(true);
      setEnrollmentError(null);
      try {
        await enroll(selectedCourseId);
        navigate("/dashboard");
      } catch (reason) {
        setEnrollmentError(
          reason instanceof Error ? reason.message : "تعذّر إتمام الاشتراك.",
        );
      } finally {
        setEnrollmentLoading(false);
      }
      return;
    }
    if (courseAccess) {
      navigate("/dashboard");
      return;
    }
    setPaymentOpen(true);
  }

  return (
    <main className={styles.page}>
      <nav aria-label="مسار التنقل" className={styles.breadcrumb}>
        <Link to={user ? "/courses" : "/#courses"}>الكورسات</Link>
        <Icon name="chevron" />
        <span>{course.title}</span>
      </nav>

      <section className={styles.hero}>
        <Pattern />
        <img
          alt=""
          className={styles.heroImage}
          src={`/src/assets/images/${course.image}`}
        />
        <div className={styles.heroContent}>
          <div className={styles.chips}>
            <Chip gold>{free ? "مجاني" : "مدفوع"}</Chip>
            <Chip dark>{categoryLabel(course.category)}</Chip>
            <Chip dark>{levelLabel(course.level)}</Chip>
          </div>
          <h1>{course.title}</h1>
          <p>{courseDescription(course.description)}</p>
          <div className={styles.meta}>
            <span>
              <Icon name="book" /> {course.lessons}
            </span>
            <span>
              <Icon name="clock" /> {course.duration}
            </span>
          </div>
        </div>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.curriculum}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>خطة التعلّم</span>
            <h2>محتوى الكورس</h2>
            <p>{lessons.length} دروس ضمن هذا المسار</p>
          </div>
          {lessons.length ? (
            <div className={styles.lessonList}>
              {lessons.map((lesson, index) => (
                <Card className={styles.lessonCard} key={lesson.id}>
                  <span className={styles.lessonNumber}>{index + 1}</span>
                  <div className={styles.lessonInfo}>
                    <h3>{lesson.title}</h3>
                    <p>{lesson.duration}</p>
                  </div>
                  {hasAccess ? (
                    <Link
                      aria-label={`فتح درس ${lesson.title}`}
                      className={styles.lessonLink}
                      to={`/dashboard/lesson/${lesson.id}`}
                    >
                      <Icon name="arrow" />
                    </Link>
                  ) : (
                    <span
                      aria-label="يتطلب تفعيل الاشتراك"
                      className={styles.lessonLocked}
                      title="يتطلب تفعيل الاشتراك"
                    >
                      <Icon name="lock" />
                    </span>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className={styles.emptyCurriculum}>
              سيتم إضافة دروس هذا المسار قريبًا.
            </Card>
          )}
        </section>

        <aside>
          <Card className={styles.purchaseCard}>
            <span className={styles.eyebrow}>الاشتراك في المسار</span>
            <h2>{free ? "مجانًا" : course.price}</h2>
            <ul>
              <li>
                <Icon name="check" /> دروس مسجّلة
              </li>
              <li>
                <Icon name="check" /> متابعة تقدّمك
              </li>
              <li>
                <Icon name="check" /> محتوى منظّم حسب المستوى
              </li>
            </ul>
            {demoAccount && !free ? (
              <Button
                onClick={() => setPaymentOpen(true)}
                type="button"
                variant="secondary"
              >
                عرض بيانات الدفع
              </Button>
            ) : enrolled ? (
              <Button onClick={() => navigate("/dashboard")} type="button">
                تابع التعلّم
              </Button>
            ) : orderStatus === "pending" ? (
              <Button disabled type="button" variant="secondary">
                طلب الاشتراك قيد المراجعة
              </Button>
            ) : (
              <Button
                disabled={accessLoading || enrollmentLoading}
                onClick={enrollInCourse}
                type="button"
              >
                {enrollmentLoading
                  ? "جارٍ تسجيل الاشتراك..."
                  : user
                    ? "اشترك الآن"
                    : "سجّل للانضمام"}
              </Button>
            )}
            {accessLoading ? <p>جارٍ التحقق من الاشتراك...</p> : null}
            {accessError ? (
              <p className={styles.paymentError} role="alert">
                {accessError}
              </p>
            ) : null}
            {enrollmentError ? (
              <p className={styles.paymentError} role="alert">
                {enrollmentError}
              </p>
            ) : null}
            {orderStatus === "pending" ? (
              <p role="status">طلبك قيد المراجعة من الإدارة.</p>
            ) : null}
            {demoAccount && !free ? (
              <p role="status">
                حساب المعاينة يمكنه عرض بيانات الدفع فقط؛ لإرسال طلب حقيقي
                استخدم حساب طالب مسجلًا.
              </p>
            ) : null}
            {orderStatus === "rejected" ? (
              <p role="status">
                تعذّر اعتماد آخر طلب. يمكنك إرسال إيصال جديد بعد المراجعة.
              </p>
            ) : null}
            <p>ابدأ التعلّم بالوتيرة التي تناسبك.</p>
          </Card>
          {paymentOpen && user && !courseAccess ? (
            <CoursePaymentForm
              course={course}
              demoAccount={demoAccount}
              onSubmitted={(orderId, link) => {
                setPaymentOpen(false);
                if (!demoAccount) setOrderStatus("pending");
                setSubmittedOrder({
                  id: orderId,
                  whatsappLink: link,
                });
              }}
            />
          ) : null}
          {submittedOrder ? (
            <Card className={styles.paymentCard} role="status">
              <h3>تم تسجيل الطلب للمراجعة</h3>
              <p>
                رقم طلبك: <strong dir="ltr">{submittedOrder.id}</strong>. سيُفتح
                الكورس بعد مراجعة الإيصال واعتماد الإدارة.
              </p>
              {submittedOrder.whatsappLink ? (
                <a
                  className={styles.whatsappLink}
                  href={submittedOrder.whatsappLink}
                  rel="noreferrer"
                  target="_blank"
                >
                  إرسال تفاصيل الطلب على واتساب
                </a>
              ) : null}
              {!submittedOrder.whatsappLink ? (
                <p>
                  يمكنك متابعة حالة طلبك من{" "}
                  <Link to="/dashboard/orders">طلباتي واشتراكاتي</Link>؛ لا يلزم
                  واتساب لإرسال الطلب.
                </p>
              ) : null}
            </Card>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
