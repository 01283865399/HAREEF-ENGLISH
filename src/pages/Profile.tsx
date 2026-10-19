import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";
import { useAuth } from "../features/auth/AuthContext";
import { usePlatform } from "../features/auth/PlatformContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import styles from "./Profile.module.css";

interface ProfilePreferences {
  lessonReminders: boolean;
  weeklySummary: boolean;
  emailUpdates: boolean;
  fontSize: "small" | "medium" | "large";
}

const defaultPreferences: ProfilePreferences = {
  lessonReminders: true,
  weeklySummary: true,
  emailUpdates: false,
  fontSize: "medium",
};

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, error, updateProfile, signOut } = useAuth();
  const { progress } = usePlatform();
  const [preferences, setPreferences] = useLocalStorage(
    "alarrab:profile-preferences",
    defaultPreferences,
  );
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.fontSize = preferences.fontSize;
  }, [preferences.fontSize]);

  async function savePersonalData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSaved(false);
    setFormError(null);
    try {
      const updatedUser = await updateProfile(name, email);
      const emailChangePending =
        updatedUser.email !== email.trim().toLowerCase();
      setEmail(updatedUser.email);
      setSavedMessage(
        emailChangePending
          ? "تم تحديث الاسم. أكّد البريد الجديد من الرسالة المرسلة، وسيظل بريدك الحالي مستخدمًا حتى التأكيد."
          : "تم حفظ بيانات الحساب.",
      );
      setSaved(true);
    } catch (reason) {
      setFormError(
        reason instanceof Error ? reason.message : "تعذّر تحديث بيانات الحساب.",
      );
    } finally {
      setLoading(false);
    }
  }

  function togglePreference(key: keyof Omit<ProfilePreferences, "fontSize">) {
    setPreferences({ ...preferences, [key]: !preferences[key] });
  }

  async function logOut() {
    try {
      await signOut();
      navigate("/login");
    } catch {
      // The auth context exposes the error to the page.
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeading}>
        <span className={styles.eyebrow}>إعدادات الحساب</span>
        <h2>حسابي</h2>
        <p>أدر بياناتك وتفضيلات التعلّم من مكان واحد.</p>
      </header>

      <div className={styles.profileGrid}>
        <Card className={styles.accountCard}>
          <div className={styles.avatar}>
            <span>{user?.name.slice(0, 1) ?? "ط"}</span>
            <span aria-hidden="true" className={styles.avatarEdit}>
              <Icon name="user" />
            </span>
          </div>
          <h3>{user?.name ?? "الطالب"}</h3>
          <p>{user?.email}</p>
          <div className={styles.stats}>
            <div>
              <strong>{progress.completedLessonIds.length}</strong>
              <span>درس مكتمل</span>
            </div>
            <div>
              <strong>{progress.enrolledCourseIds.length}</strong>
              <span>دورة نشطة</span>
            </div>
          </div>
          <Button onClick={logOut} type="button" variant="outline">
            تسجيل الخروج
          </Button>
        </Card>

        <div className={styles.settingsColumn}>
          <Card as="section" className={styles.formCard}>
            <div className={styles.sectionHeading}>
              <span className={styles.iconTile}>
                <Icon name="user" />
              </span>
              <div>
                <h3>البيانات الشخصية</h3>
                <p>حدّث المعلومات المرتبطة بحسابك.</p>
              </div>
            </div>
            <form className={styles.personalForm} onSubmit={savePersonalData}>
              <label>
                الاسم الكامل
                <input
                  autoComplete="name"
                  onChange={(event) => setName(event.target.value)}
                  required
                  value={name}
                />
              </label>
              <label>
                البريد الإلكتروني
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
              {formError || error ? (
                <p className={styles.error} role="alert">
                  {formError ?? error}
                </p>
              ) : null}
              {saved ? (
                <p className={styles.success} role="status">
                  {savedMessage}
                </p>
              ) : null}
              <Button
                disabled={loading || !name.trim() || !email.trim()}
                loading={loading}
                type="submit"
              >
                حفظ التغييرات
              </Button>
            </form>
          </Card>

          <Card as="section" className={styles.preferencesCard}>
            <div className={styles.sectionHeading}>
              <span className={styles.iconTile}>
                <Icon name="gear" />
              </span>
              <div>
                <h3>التفضيلات</h3>
                <p>اختر طريقة متابعة دراستك.</p>
              </div>
            </div>
            <div className={styles.preferenceList}>
              {(
                [
                  ["lessonReminders", "تذكير بمواعيد الدروس"],
                  ["weeklySummary", "ملخص التقدّم الأسبوعي"],
                  ["emailUpdates", "التحديثات عبر البريد الإلكتروني"],
                ] as const
              ).map(([key, label]) => (
                <div className={styles.preference} key={key}>
                  <span>{label}</span>
                  <button
                    aria-checked={preferences[key]}
                    aria-label={label}
                    className={`${styles.toggle}${preferences[key] ? ` ${styles.toggleOn}` : ""}`}
                    onClick={() => togglePreference(key)}
                    role="switch"
                    type="button"
                  >
                    <span />
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.fontSizeRow}>
              <span>حجم الخط</span>
              <div
                aria-label="حجم الخط"
                className={styles.fontOptions}
                role="group"
              >
                {(
                  [
                    ["small", "صغير"],
                    ["medium", "متوسط"],
                    ["large", "كبير"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    aria-pressed={preferences.fontSize === value}
                    className={
                      preferences.fontSize === value ? styles.fontActive : ""
                    }
                    key={value}
                    onClick={() =>
                      setPreferences({ ...preferences, fontSize: value })
                    }
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
