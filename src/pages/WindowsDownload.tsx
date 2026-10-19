import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/ui/Icon";
import { useTheme } from "../features/theme/useTheme";
import styles from "./DownloadApp.module.css";

const installSteps = [
  "نزّل الملف المضغوط وفك ضغطه إلى مجلد تختاره على جهازك.",
  "افتح المجلد وشغّل ملف التطبيق التنفيذي.",
  "سجّل الدخول بحسابك وابدأ متابعة دروسك من الكمبيوتر.",
];

export function WindowsDownloadPage() {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const previousDescription = description?.content;
    document.title = "تحميل تطبيق مستر محمود لـWindows";
    if (description) {
      description.content =
        "حمّل تطبيق مستر محمود لنظام Windows وتابع دروس اللغة الإنجليزية من الكمبيوتر.";
    }

    return () => {
      document.title = previousTitle;
      if (description && previousDescription) {
        description.content = previousDescription;
      }
    };
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="العودة إلى الرئيسية" className={styles.brand} to="/">
          <img src="/logo-icon.png?v=3" alt="" />
          <span>
            <strong>مستر محمود</strong>
            <small>مستر محمود عبد الواحد</small>
          </span>
        </Link>
        <div className={styles.headerActions}>
          <button
            aria-label={
              theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"
            }
            aria-pressed={theme === "dark"}
            className={styles.themeButton}
            onClick={(event) => toggleTheme(event.currentTarget)}
            type="button"
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          <Link className={styles.homeLink} to="/">
            <Icon name="arrow" />
            الرئيسية
          </Link>
          <Link className={styles.browseLink} to="/download-app">
            تطبيق Android
          </Link>
        </div>
      </header>

      <div className={styles.content}>
        <section
          aria-labelledby="windows-download-title"
          className={styles.windowsDownload}
        >
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>
              <Icon name="spark" />
              متوفر الآن لأجهزة الكمبيوتر
            </span>
            <h1 id="windows-download-title">
              تطبيق مستر محمود
              <span> لنظام Windows</span>
            </h1>
            <p>
              تابع دروسك وكورساتك من تطبيق مكتبي مستقل، مع تجربة المنصة نفسها
              على شاشة الكمبيوتر.
            </p>
          </div>

          <div className={styles.windowsGrid}>
            <article className={styles.windowsCard}>
              <span className={styles.windowsIcon}>
                <Icon name="book" />
              </span>
              <span className={styles.windowsBadge}>
                <Icon name="check" />
                النسخة الرسمية · Windows x64
              </span>
              <h2>مستر محمود · إصدار 1.1.0</h2>
              <p>
                نسخة محمولة داخل ملف ZIP؛ لا تحتاج إلى مُثبّت. فك الضغط وشغّل
                التطبيق مباشرة.
              </p>
              <a
                className={styles.downloadButton}
                download="Mr-Mahmoud-English-Windows-x64.zip"
                href="/windowsapp/alarrab-windows-x64.zip"
              >
                <Icon name="download" />
                <span>
                  <strong>تحميل تطبيق Windows</strong>
                  <small>ملف ZIP · حوالي 77 ميجابايت</small>
                </span>
              </a>
              <span className={styles.secureNote}>
                <Icon name="shield" />
                تنزيل مباشر من الموقع
              </span>
            </article>

            <article className={styles.windowsSteps}>
              <h2>طريقة التشغيل</h2>
              <ol className={styles.windowsStepList}>
                {installSteps.map((step, index) => (
                  <li key={step}>
                    <span>{index + 1}</span>
                    <p>{step}</p>
                  </li>
                ))}
              </ol>
              <p className={styles.windowsRequirement}>
                يتطلب Windows 10 أو أحدث بمعمارية 64-bit واتصالًا بالإنترنت
                لتسجيل الدخول وتحميل بيانات الدروس.
              </p>
            </article>
          </div>

          <p className={styles.windowsWarning}>
            قد يعرض Windows تنبيه SmartScreen لأن التطبيق غير موقّع رقميًا؛
            اتأكد إنك نزّلت الملف من الموقع قبل تشغيله.
          </p>
        </section>

        <p className={styles.windowsBackLink}>
          تستخدم هاتف Android؟
          <Link to="/download-app">انتقل إلى صفحة تحميل تطبيق Android</Link>
        </p>
      </div>

      <footer className={styles.footer}>
        <Link className={styles.footerBrand} to="/">
          <img src="/logo-icon.png?v=3" alt="" />
          <span>مستر محمود عبد الواحد · English</span>
        </Link>
        <span>© 2026 جميع الحقوق محفوظة</span>
      </footer>
    </main>
  );
}
