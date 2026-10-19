import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { Toast } from "../components/ui/Toast";
import { useAuth } from "../features/auth/AuthContext";
import { academicGrades, academicSystems, academicTerms } from "../data/coursePackages";
import { academicSystemLabel, categoryLabel, levelLabel } from "../data/coursePresentation";
import { generateUuidV4 } from "../lib/uuid";
import {
  changeAdminDemoCredentials,
  getAdminDemoUsername,
  isAdminDemoUser,
} from "../services/adminDemoService";
import { changePassword } from "../services/authService";
import { AdminOrdersPage } from "./AdminOrders";
import {
  deleteAdminCourse,
  deleteAdminLesson,
  getAdminActivity,
  getAdminLessons,
  getAdminOverview,
  saveAdminCourse,
  saveAdminLesson,
  type AdminActivity,
  type AdminOverview,
  type AdminStudent,
  type ManagedCourse,
  type ManagedLesson,
} from "../services/adminService";
import type { CourseCategory } from "../types/domain";
import styles from "./AdminDashboard.module.css";

type AdminSection = "overview" | "courses" | "lessons" | "students" | "orders" | "activity" | "security";

interface CourseFormState {
  title: string;
  description: string;
  category: CourseCategory;
  level: string;
  price: string;
  isFree: boolean;
  duration: string;
  thumbnail: string;
  grade: string;
  system: string;
  term: string;
}

interface LessonFormState {
  courseId: string;
  title: string;
  summary: string;
  videoSrc: string;
  duration: string;
  sortOrder: string;
}

const emptyCourseForm: CourseFormState = {
  title: "",
  description: "",
  category: "نحو",
  level: "مبتدئ",
  price: "",
  isFree: false,
  duration: "",
  thumbnail: "05-course-1.png",
  grade: "",
  system: "",
  term: "",
};

const emptyLessonForm: LessonFormState = {
  courseId: "",
  title: "",
  summary: "",
  videoSrc: "",
  duration: "",
  sortOrder: "1",
};

const sections: { id: AdminSection; label: string; icon: "chart" | "book" | "play" | "user" | "bell" | "file" }[] = [
  { id: "overview", label: "نظرة عامة", icon: "chart" },
  { id: "courses", label: "إدارة الكورسات", icon: "book" },
  { id: "lessons", label: "المحاضرات والفيديو", icon: "play" },
  { id: "students", label: "الطلاب والاشتراكات", icon: "user" },
  { id: "orders", label: "طلبات الدفع", icon: "bell" },
  { id: "activity", label: "سجل الإدارة", icon: "file" },
  { id: "security", label: "بيانات الدخول", icon: "user" },
];

export function AdminDashboardPage() {
  const { user } = useAuth();
  const demoMode = isAdminDemoUser(user);
  const [section, setSection] = useState<AdminSection>("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [lessons, setLessons] = useState<ManagedLesson[]>([]);
  const [activity, setActivity] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null);
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState(emptyLessonForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState(() =>
    demoMode ? getAdminDemoUsername() : "admin",
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (demoMode) {
      setOverview({
        students: [],
        courses: [],
        pendingOrders: 0,
        approvedSubscriptions: 0,
        totalRevenue: 0,
        activeStudents: 0,
        coursePopularity: [],
        averageLevelTestScore: null,
      });
      setLessons([]);
      setActivity([]);
      setLoading(false);
      return;
    }
    try {
      const [nextOverview, nextLessons, nextActivity] = await Promise.all([
        getAdminOverview(),
        getAdminLessons(),
        getAdminActivity(),
      ]);
      setOverview(nextOverview);
      setLessons(nextLessons);
      setActivity(nextActivity);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذّر تحميل بيانات الإدارة.");
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (overview?.students ?? []).filter((student) =>
      !query ||
      `${student.full_name} ${student.email} ${student.phone}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [overview?.students, search]);

  function startEditCourse(course: ManagedCourse) {
    setEditingCourse(course.id);
    setCourseForm({
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      price: String(course.price),
      isFree: course.is_free,
      duration: course.duration_text,
      thumbnail: course.thumbnail_url,
      grade: course.grade ?? "",
      system: course.academic_system ?? "",
      term: course.term ?? "",
    });
  }

  async function submitCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = courseForm.title.trim();
    const price = Number(courseForm.price || 0);
    if (!title || !Number.isFinite(price) || price < 0) {
      setError("تحقق من عنوان الكورس والسعر.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const id =
        editingCourse ??
        `course-${generateUuidV4().replaceAll("-", "").slice(0, 12)}`;
      await saveAdminCourse(
        {
          id,
          title,
          description: courseForm.description.trim(),
          category: courseForm.category,
          level: courseForm.level.trim(),
          price: courseForm.isFree ? 0 : price,
          is_free: courseForm.isFree,
          lesson_count: 0,
          duration_text: courseForm.duration.trim(),
          thumbnail_url: courseForm.thumbnail.trim(),
          grade: courseForm.grade || null,
          academic_system: courseForm.system || null,
          term: courseForm.term || null,
        },
        editingCourse ?? undefined,
      );
      setNotice(editingCourse ? "تم تحديث الكورس." : "تمت إضافة الكورس.");
      setEditingCourse(null);
      setCourseForm(emptyCourseForm);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذّر حفظ الكورس.");
    } finally {
      setSaving(false);
    }
  }

  async function removeCourse(course: ManagedCourse) {
    if (!window.confirm(`هل تريد حذف كورس «${course.title}»؟`)) return;
    setError(null);
    setNotice(null);
    try {
      await deleteAdminCourse(course.id);
      setNotice("تم حذف الكورس.");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذّر حذف الكورس.");
    }
  }

  function startEditLesson(lesson: ManagedLesson) {
    setEditingLesson(lesson.id);
    setLessonForm({
      courseId: lesson.course_id,
      title: lesson.title,
      summary: lesson.summary,
      videoSrc: lesson.video_src,
      duration: lesson.duration,
      sortOrder: String(lesson.sort_order),
    });
  }

  async function submitLesson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = lessonForm.title.trim();
    const videoSrc = normalizeVideoUrl(lessonForm.videoSrc.trim());
    if (!lessonForm.courseId || !title) {
      setError("اختر كورسًا واكتب عنوان المحاضرة.");
      return;
    }
    if (videoSrc && !isHttpsUrl(videoSrc)) {
      setError("رابط الفيديو يجب أن يبدأ بـ HTTPS.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const id =
        editingLesson ??
        `lesson-${generateUuidV4().replaceAll("-", "").slice(0, 12)}`;
      await saveAdminLesson(
        {
          id,
          course_id: lessonForm.courseId,
          title,
          summary: lessonForm.summary.trim(),
          video_src: videoSrc,
          duration: lessonForm.duration.trim(),
          sort_order: Math.max(0, Number(lessonForm.sortOrder) || 0),
          key_points: [],
        },
        editingLesson ?? undefined,
      );
      setNotice(editingLesson ? "تم تحديث المحاضرة." : "تمت إضافة المحاضرة.");
      setEditingLesson(null);
      setLessonForm(emptyLessonForm);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذّر حفظ المحاضرة.");
    } finally {
      setSaving(false);
    }
  }

  async function removeLesson(lesson: ManagedLesson) {
    if (!window.confirm(`هل تريد حذف المحاضرة «${lesson.title}»؟`)) return;
    setError(null);
    try {
      await deleteAdminLesson(lesson.id);
      setNotice("تم حذف المحاضرة.");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذّر حذف المحاضرة.");
    }
  }

  async function updateAdminCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    setSaving(true);
    try {
      if (demoMode) {
        changeAdminDemoCredentials(adminUsername, currentPassword, newPassword);
        setNotice("تم تغيير بيانات الدخول التجريبية. استخدمها في تسجيل الدخول القادم.");
      } else if (user) {
        await changePassword(user, currentPassword, newPassword);
        setNotice("تم تغيير كلمة مرور حساب الإدارة.");
      } else {
        throw new Error("تعذّر تحديد حساب المدير الحالي.");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذّر تغيير بيانات الدخول.");
    } finally {
      setSaving(false);
    }
  }

  function exportStudents() {
    const header = ["الاسم", "البريد الإلكتروني", "الهاتف", "الكورسات", "الدروس المكتملة", "دقائق المشاهدة"];
    const rows = (overview?.students ?? []).map((student) => [
      student.full_name,
      student.email,
      student.phone,
      student.enrolledCourses.map((course) => course.title).join("، "),
      String(student.completedLessons),
      String(student.watchedMinutes),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mr-mahmoud-students.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const courses = overview?.courses ?? [];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>مركز التحكم</span>
          <h2>لوحة إدارة مستر محمود</h2>
          <p>إدارة المحتوى والطلاب ومتابعة مؤشرات المنصة من مكان واحد.</p>
        </div>
        <Button onClick={() => void refresh()} variant="outline">
          <Icon name="clock" /> تحديث البيانات
        </Button>
      </header>
      {demoMode ? (
        <div className={styles.demoBanner} role="status">
          وضع تجريبي محلي فقط: تغييرات بيانات الدخول محفوظة في هذا المتصفح، أما بيانات الطلاب والكورسات الحقيقية فتحتاج ربط Supabase.
        </div>
      ) : null}

      <nav aria-label="أقسام لوحة الإدارة" className={styles.tabs}>
        {sections.map((item) => (
          <button
            aria-current={section === item.id ? "page" : undefined}
            className={section === item.id ? styles.activeTab : styles.tab}
            key={item.id}
            onClick={() => setSection(item.id)}
            type="button"
          >
            <Icon name={item.icon} />
            {item.label}
            {item.id === "orders" && overview?.pendingOrders ? (
              <span className={styles.tabCount}>{overview.pendingOrders}</span>
            ) : null}
          </button>
        ))}
      </nav>

      {error ? (
        <div className={styles.errorBanner} role="alert">
          <span>{error}</span>
          <button onClick={() => void refresh()} type="button">
            إعادة المحاولة
          </button>
        </div>
      ) : null}
      <Toast
        message={notice ?? ""}
        onDismiss={() => setNotice(null)}
        open={Boolean(notice)}
        tone="success"
      />
      {loading ? (
        <Card className={styles.loading} role="status">
          جارٍ تحميل بيانات لوحة الإدارة...
        </Card>
      ) : (
        <>
          {section === "overview" ? (
            <OverviewSection overview={overview} />
          ) : null}
          {section === "courses" ? (
            <section className={styles.section}>
              <SectionHeading
                eyebrow="إدارة المحتوى"
                title="الكورسات"
                action={
                  <Button
                    onClick={() => {
                      setEditingCourse(null);
                      setCourseForm(emptyCourseForm);
                    }}
                  >
                    <Icon name="plus" /> كورس جديد
                  </Button>
                }
              />
              <Card className={styles.formCard}>
                <form className={styles.form} onSubmit={submitCourse}>
                  <h3>{editingCourse ? "تعديل الكورس" : "إضافة كورس جديد"}</h3>
                  <div className={styles.formGrid}>
                    <label>
                      اسم الكورس
                      <input
                        onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })}
                        required
                        value={courseForm.title}
                      />
                    </label>
                    <label>
                      التصنيف
                      <select
                        onChange={(event) => setCourseForm({ ...courseForm, category: event.target.value as CourseCategory })}
                        value={courseForm.category}
                      >
                        {(["نحو", "صرف", "بلاغة", "أدب"] as const).map((category) => (
                          <option key={category} value={category}>
                            {categoryLabel(category)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      المستوى
                      <input
                        onChange={(event) => setCourseForm({ ...courseForm, level: event.target.value })}
                        value={courseForm.level}
                      />
                    </label>
                    <label>
                      السعر بالجنيه
                      <input
                        min="0"
                        onChange={(event) => setCourseForm({ ...courseForm, price: event.target.value })}
                        type="number"
                        value={courseForm.price}
                      />
                    </label>
                    <label>
                      المدة
                      <input
                        onChange={(event) => setCourseForm({ ...courseForm, duration: event.target.value })}
                        placeholder="مثال: ٤ أسابيع"
                        value={courseForm.duration}
                      />
                    </label>
                    <label>
                      الصف الدراسي
                      <select
                        onChange={(event) => setCourseForm({ ...courseForm, grade: event.target.value })}
                        value={courseForm.grade}
                      >
                        <option value="">غير محدد</option>
                        {academicGrades.map((grade) => <option key={grade}>{grade}</option>)}
                      </select>
                    </label>
                    <label>
                      النظام الدراسي
                      <select
                        onChange={(event) => setCourseForm({ ...courseForm, system: event.target.value })}
                        value={courseForm.system}
                      >
                        <option value="">غير محدد</option>
                        {academicSystems.map((system) => (
                          <option key={system} value={system}>{academicSystemLabel(system)}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      الفصل الدراسي
                      <select
                        onChange={(event) => setCourseForm({ ...courseForm, term: event.target.value })}
                        value={courseForm.term}
                      >
                        <option value="">غير محدد</option>
                        {academicTerms.map((term) => <option key={term}>{term}</option>)}
                      </select>
                    </label>
                    <label className={styles.wideField}>
                      مسار الصورة
                      <input
                        onChange={(event) => setCourseForm({ ...courseForm, thumbnail: event.target.value })}
                        placeholder="05-course-1.png"
                        value={courseForm.thumbnail}
                      />
                    </label>
                    <label className={styles.wideField}>
                      وصف الكورس
                      <textarea
                        onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })}
                        rows={3}
                        value={courseForm.description}
                      />
                    </label>
                    <label className={styles.checkboxLabel}>
                      <input
                        checked={courseForm.isFree}
                        onChange={(event) => setCourseForm({ ...courseForm, isFree: event.target.checked })}
                        type="checkbox"
                      />
                      كورس مجاني
                    </label>
                  </div>
                  <div className={styles.formActions}>
                    <Button loading={saving} type="submit">
                      {editingCourse ? "حفظ التعديلات" : "إضافة الكورس"}
                    </Button>
                    {editingCourse ? (
                      <Button
                        onClick={() => {
                          setEditingCourse(null);
                          setCourseForm(emptyCourseForm);
                        }}
                        type="button"
                        variant="white"
                      >
                        إلغاء
                      </Button>
                    ) : null}
                  </div>
                </form>
              </Card>
              <div className={styles.courseList}>
                {courses.map((course) => (
                  <Card className={styles.courseRow} key={course.id}>
                    <div>
                      <span className={styles.badge}>{course.is_free ? "مجاني" : `${course.price} ج.م`}</span>
                      <h3>{course.title}</h3>
                      <p>{categoryLabel(course.category)} · {levelLabel(course.level)} · {course.lesson_count} درس</p>
                      {course.grade ? <small>{course.grade} · {course.academic_system}</small> : null}
                    </div>
                    <div className={styles.rowActions}>
                      <Button compact onClick={() => startEditCourse(course)} variant="outline">تعديل</Button>
                      <Button compact onClick={() => void removeCourse(course)} variant="quiet">حذف</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
          {section === "lessons" ? (
            <section className={styles.section}>
              <SectionHeading eyebrow="مكتبة الدروس" title="المحاضرات وروابط الفيديو" />
              <Card className={styles.formCard}>
                <form className={styles.form} onSubmit={submitLesson}>
                  <h3>{editingLesson ? "تعديل محاضرة" : "إضافة محاضرة"}</h3>
                  <p>يدعم الرابط فيديو YouTube أو رابط فيديو مباشر عبر HTTPS.</p>
                  <div className={styles.formGrid}>
                    <label>
                      الكورس
                      <select
                        onChange={(event) => setLessonForm({ ...lessonForm, courseId: event.target.value })}
                        required
                        value={lessonForm.courseId}
                      >
                        <option value="">اختر كورسًا</option>
                        {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                      </select>
                    </label>
                    <label>
                      عنوان المحاضرة
                      <input
                        onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })}
                        required
                        value={lessonForm.title}
                      />
                    </label>
                    <label className={styles.wideField}>
                      رابط الفيديو
                      <input
                        onChange={(event) => setLessonForm({ ...lessonForm, videoSrc: event.target.value })}
                        placeholder="https://www.youtube.com/watch?v=..."
                        type="url"
                        value={lessonForm.videoSrc}
                      />
                    </label>
                    <label className={styles.wideField}>
                      ملخص الدرس
                      <textarea
                        onChange={(event) => setLessonForm({ ...lessonForm, summary: event.target.value })}
                        rows={3}
                        value={lessonForm.summary}
                      />
                    </label>
                    <label>
                      المدة
                      <input
                        onChange={(event) => setLessonForm({ ...lessonForm, duration: event.target.value })}
                        placeholder="مثال: ١٧:٣٥"
                        value={lessonForm.duration}
                      />
                    </label>
                    <label>
                      ترتيب الدرس
                      <input
                        min="0"
                        onChange={(event) => setLessonForm({ ...lessonForm, sortOrder: event.target.value })}
                        type="number"
                        value={lessonForm.sortOrder}
                      />
                    </label>
                  </div>
                  <div className={styles.formActions}>
                    <Button loading={saving} type="submit">
                      {editingLesson ? "حفظ المحاضرة" : "إضافة المحاضرة"}
                    </Button>
                    {editingLesson ? (
                      <Button
                        onClick={() => {
                          setEditingLesson(null);
                          setLessonForm(emptyLessonForm);
                        }}
                        type="button"
                        variant="white"
                      >
                        إلغاء
                      </Button>
                    ) : null}
                  </div>
                </form>
              </Card>
              <div className={styles.courseList}>
                {lessons.map((lesson) => (
                  <Card className={styles.courseRow} key={lesson.id}>
                    <div>
                      <h3>{lesson.title}</h3>
                      <p>{courses.find((course) => course.id === lesson.course_id)?.title ?? "كورس غير معروف"}</p>
                      {lesson.video_src ? (
                        <a className={styles.videoLink} href={lesson.video_src} rel="noreferrer" target="_blank">
                          <Icon name="play" /> معاينة رابط الفيديو
                        </a>
                      ) : <small>لم يُضف رابط فيديو بعد</small>}
                    </div>
                    <div className={styles.rowActions}>
                      <Button compact onClick={() => startEditLesson(lesson)} variant="outline">تعديل</Button>
                      <Button compact onClick={() => void removeLesson(lesson)} variant="quiet">حذف</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
          {section === "students" ? (
            <section className={styles.section}>
              <SectionHeading
                eyebrow="إدارة المجتمع"
                title={`الطلاب (${overview?.students.length ?? 0})`}
                action={
                  <Button onClick={exportStudents} variant="outline">
                    <Icon name="download" /> تصدير CSV لبرنامج Excel
                  </Button>
                }
              />
              <label className={styles.search}>
                <Icon name="search" />
                <input
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث باسم الطالب أو البريد أو الهاتف"
                  value={search}
                />
              </label>
              <div className={styles.studentTableWrap}>
                <table className={styles.studentTable}>
                  <thead>
                    <tr>
                      <th>الطالب</th><th>الكورسات والاشتراكات</th><th>الدروس</th><th>المشاهدة</th><th>نشاط الحساب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStudents.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <button className={styles.studentName} onClick={() => setSelectedStudent(student)} type="button">
                            <strong>{student.full_name || "طالب جديد"}</strong>
                            <small>{student.email}</small>
                          </button>
                        </td>
                        <td>{student.enrolledCourses.length || "لا يوجد اشتراك"}</td>
                        <td>{student.completedLessons}</td>
                        <td>{student.watchedMinutes} دقيقة</td>
                        <td>{student.latestActivity ? new Date(student.latestActivity).toLocaleDateString("ar-EG") : "لا يوجد نشاط مسجل"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!visibleStudents.length ? <p className={styles.empty}>لا توجد نتائج مطابقة.</p> : null}
              </div>
              {selectedStudent ? (
                <StudentDetails student={selectedStudent} onClose={() => setSelectedStudent(null)} />
              ) : null}
            </section>
          ) : null}
          {section === "orders" ? <AdminOrdersPage /> : null}
          {section === "activity" ? (
            <section className={styles.section}>
              <SectionHeading eyebrow="الأمان والشفافية" title="سجل نشاطات الأدمن" />
              <div className={styles.activityList}>
                {activity.map((item) => (
                  <Card className={styles.activityItem} key={item.id}>
                    <span className={styles.activityIcon}><Icon name="check" /></span>
                    <div>
                      <strong>{item.action}</strong>
                      <p>{item.details}</p>
                    </div>
                    <time>{new Date(item.created_at).toLocaleString("ar-EG")}</time>
                  </Card>
                ))}
                {!activity.length ? <Card className={styles.empty}>لا توجد إجراءات مسجلة بعد.</Card> : null}
              </div>
            </section>
          ) : null}
          {section === "security" ? (
            <section className={styles.section}>
              <SectionHeading eyebrow="أمان الحساب" title="تغيير بيانات دخول الإدارة" />
              <Card className={styles.formCard}>
                <form className={styles.form} onSubmit={updateAdminCredentials}>
                  <h3>{demoMode ? "بيانات الدخول التجريبية" : "كلمة مرور حساب الإدارة"}</h3>
                  {demoMode ? (
                    <div className={styles.formGrid}>
                      <label>
                        اسم المستخدم الجديد
                        <input
                          autoComplete="username"
                          dir="ltr"
                          minLength={3}
                          onChange={(event) => setAdminUsername(event.target.value)}
                          required
                          value={adminUsername}
                        />
                      </label>
                    </div>
                  ) : (
                    <p>الحساب الحالي: {user?.email}. لتغيير اسم الدخول «admin»، حدّث VITE_ADMIN_EMAIL في إعدادات Supabase بالموقع.</p>
                  )}
                  <div className={styles.formGrid}>
                    <label>
                      كلمة المرور الحالية
                      <input
                        autoComplete="current-password"
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        required
                        type="password"
                        value={currentPassword}
                      />
                    </label>
                    <label>
                      كلمة المرور الجديدة
                      <input
                        autoComplete="new-password"
                        minLength={demoMode ? 4 : 8}
                        onChange={(event) => setNewPassword(event.target.value)}
                        required
                        type="password"
                        value={newPassword}
                      />
                    </label>
                    <label>
                      تأكيد كلمة المرور الجديدة
                      <input
                        autoComplete="new-password"
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        required
                        type="password"
                        value={confirmPassword}
                      />
                    </label>
                  </div>
                  <div className={styles.formActions}>
                    <Button loading={saving} type="submit">حفظ بيانات الدخول</Button>
                  </div>
                </form>
              </Card>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}

function OverviewSection({ overview }: { overview: AdminOverview | null }) {
  if (!overview) return null;
  const stats = [
    { label: "إجمالي الطلاب", value: overview.students.length, icon: "user" as const },
    { label: "اشتراكات فعالة", value: overview.approvedSubscriptions, icon: "check" as const },
    { label: "طلبات قيد المراجعة", value: overview.pendingOrders, icon: "bell" as const },
    { label: "إجمالي الإيرادات", value: `${overview.totalRevenue.toLocaleString("ar-EG")} ج.م`, icon: "chart" as const },
  ];
  const maxPopularity = Math.max(1, ...overview.coursePopularity.map((course) => course.subscriptions));
  return (
    <>
      <div className={styles.statGrid}>
        {stats.map((stat) => (
          <Card className={styles.statCard} key={stat.label}>
            <span className={styles.statIcon}><Icon name={stat.icon} /></span>
            <small>{stat.label}</small>
            <strong>{stat.value}</strong>
          </Card>
        ))}
      </div>
      <div className={styles.analyticsGrid}>
        <Card className={styles.analyticsCard}>
          <div className={styles.cardHeading}>
            <div><span className={styles.eyebrow}>الأكثر طلبًا</span><h3>اشتراكات الكورسات</h3></div>
            <Icon name="chart" />
          </div>
          {overview.coursePopularity.length ? (
            <div className={styles.popularityList}>
              {overview.coursePopularity.slice(0, 6).map((course) => (
                <div className={styles.popularityRow} key={course.courseId}>
                  <div><strong>{course.title}</strong><small>{course.subscriptions} اشتراك</small></div>
                  <span className={styles.popularityTrack}><span style={{ width: `${course.subscriptions / maxPopularity * 100}%` }} /></span>
                </div>
              ))}
            </div>
          ) : <p className={styles.empty}>ستظهر البيانات بعد تسجيل الاشتراكات.</p>}
        </Card>
        <Card className={styles.analyticsCard}>
          <div className={styles.cardHeading}>
            <div><span className={styles.eyebrow}>تفاعل الطلاب</span><h3>ملخص النشاط</h3></div>
            <Icon name="steps" />
          </div>
          <div className={styles.engagementStats}>
            <div><strong>{overview.activeStudents}</strong><span>طلاب لديهم نشاط تعليمي</span></div>
            <div><strong>{overview.averageLevelTestScore === null ? "—" : `${overview.averageLevelTestScore}%`}</strong><span>متوسط اختبار المستوى</span></div>
            <div><strong>{overview.courses.length}</strong><span>كورسات منشورة</span></div>
          </div>
          <p className={styles.dataNote}>الإحصاءات محسوبة من حسابات الطلاب وطلبات الدفع والتقدم المسجل.</p>
        </Card>
      </div>
      <div className={styles.quickActions}>
        <span>إجراءات سريعة</span>
        <p>من الأقسام أعلاه يمكنك نشر كورس، إضافة محاضرة، مراجعة طلبات الدفع، أو تصدير قائمة الطلاب.</p>
      </div>
    </>
  );
}

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <header className={styles.sectionHeading}>
      <div><span className={styles.eyebrow}>{eyebrow}</span><h3>{title}</h3></div>
      {action}
    </header>
  );
}

function StudentDetails({
  student,
  onClose,
}: {
  student: AdminStudent;
  onClose: () => void;
}) {
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <section
        aria-labelledby="student-details-title"
        aria-modal="true"
        className={styles.studentModal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button aria-label="إغلاق" className={styles.closeButton} onClick={onClose} type="button">
          <Icon name="close" />
        </button>
        <span className={styles.eyebrow}>ملف الطالب</span>
        <h3 id="student-details-title">{student.full_name || "طالب جديد"}</h3>
        <p>{student.email} · {student.phone || "لا يوجد رقم هاتف"}</p>
        <div className={styles.detailStats}>
          <span>{student.completedLessons} درس مكتمل</span>
          <span>{student.watchedMinutes} دقيقة مشاهدة</span>
          <span>{student.quizCount} اختبار محفوظ</span>
        </div>
        {student.levelTestScore !== null ? <p>نتيجة اختبار المستوى: {student.levelTestScore}%</p> : null}
        <h4>الكورسات المسجل بها</h4>
        {student.enrolledCourses.length ? (
          <ul className={styles.enrolledList}>
            {student.enrolledCourses.map((course) => (
              <li key={course.id}><span>{course.title}</span><small>{course.status}</small></li>
            ))}
          </ul>
        ) : <p>لا يوجد اشتراك مسجل لهذا الطالب.</p>}
      </section>
    </div>
  );
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeVideoUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return value;
    if (url.hostname === "youtu.be") {
      const id = url.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : value;
    }
    if (url.hostname.endsWith("youtube.com")) {
      const videoId =
        url.pathname === "/watch"
          ? url.searchParams.get("v")
          : url.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/)?.[1];
      return videoId
        ? `https://www.youtube.com/embed/${videoId}${url.search}`
        : value;
    }
    return value;
  } catch {
    return value;
  }
}
