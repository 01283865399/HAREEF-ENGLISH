import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/ui/Icon";
import { useTheme } from "../features/theme/useTheme";
import styles from "./DownloadApp.module.css";

const appFeatures = [
  {
    icon: "book",
    title: "دروسك في مكان واحد",
    description: "تصفّح الدورات والمحاضرات وتابع ما اشتركت فيه بسهولة.",
  },
  {
    icon: "play",
    title: "تعلّم على راحتك",
    description: "ارجع إلى الدروس وتابع رحلتك التعليمية من هاتفك.",
  },
  {
    icon: "chart",
    title: "تابع تقدّمك",
    description: "اختبارات ومتابعة تساعدك على معرفة خطواتك القادمة.",
  },
  {
    icon: "sun",
    title: "واجهة مريحة",
    description: "تصميم المنصة الدافئ مع دعم الوضع الفاتح والداكن.",
  },
] as const;

const installSteps = [
  "اضغط على زر تحميل التطبيق وانتظر اكتمال تنزيل ملف APK.",
  "افتح الملف من إشعار التنزيلات أو من مجلد «التنزيلات».",
  "إذا طلب Android ذلك، اسمح بالتثبيت من هذا المصدر ثم أكمل التثبيت.",
];

export function DownloadAppPage() {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const previousDescription = description?.content;
    document.title = "تحميل تطبيق مستر محمود للأندرويد";
    if (description) {
      description.content =
        "حمّل تطبيق مستر محمود للأندرويد وتابع دروس اللغة الإنجليزية من موبايلك.";
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
          <Link className={styles.browseLink} to="/download-windows">
            تطبيق Windows
          </Link>
        </div>
      </header>

      <div className={styles.content}>
        <section aria-labelledby="download-title" className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <Icon name="spark" />
                اتعلم English من موبايلك
            </span>
            <h1 id="download-title">
              مستر محمود معاك،
              <span> أين ما تذاكر</span>
            </h1>
            <p className={styles.intro}>
              حمّل التطبيق وتابع كورسات English ودروسك من موبايلك.
            </p>
            <div className={styles.heroActions}>
              <a
                className={styles.downloadButton}
                download="Mr-Mahmoud-English-Android.apk"
                href="/apkapp/app-debug.apk"
              >
                <Icon name="download" />
                <span>
                  <strong>حمّل تطبيق الأندرويد</strong>
                  <small>ملف APK · حوالي 9 ميجابايت</small>
                </span>
              </a>
              <span className={styles.secureNote}>
                <Icon name="shield" />
                التحميل مباشر من الموقع
              </span>
            </div>
          </div>

          <div className={styles.appShowcase}>
            <div className={styles.appCard}>
              <span className={styles.appBadge}>
                <Icon name="check" />
                التطبيق الرسمي
              </span>
              <img
                className={styles.appIcon}
                src="/logo-icon.png?v=3"
                alt="شعار مستر محمود عبد الواحد"
              />
              <h2>مستر محمود</h2>
              <p>مستر محمود عبد الواحد</p>
              <div className={styles.appDivider} />
              <div className={styles.appDetails}>
                <span>English</span>
                <span>Android · APK</span>
              </div>
            </div>
            <div className={styles.teacherCard}>
              <img src="/logo-icon.png?v=3" alt="" />
              <div>
                <span>معك خطوة بخطوة</span>
                <strong>مستر محمود عبد الواحد</strong>
              </div>
            </div>
            <div aria-hidden="true" className={styles.decorativeTile}>
              <Icon name="book" />
            </div>
          </div>
        </section>

        <section aria-labelledby="features-title" className={styles.features}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>كل ما تحتاجه لتواصل رحلتك</span>
            <h2 id="features-title">منصتك التعليمية، أقرب إليك</h2>
            <p>
              تجربة التطبيق تجمع لك أدوات المنصة في مكان واحد، مع الحفاظ على
              حسابك ومحتواك التعليمي.
            </p>
          </div>
          <div className={styles.featureGrid}>
            {appFeatures.map((feature) => (
              <article className={styles.featureCard} key={feature.title}>
                <span className={styles.featureIcon}>
                  <Icon name={feature.icon} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="teacher-title" className={styles.teacherNote}>
          <img src="/logo-icon.png?v=3" alt="" />
          <div>
            <span className={styles.eyebrow}>عن الأستاذ</span>
            <h2 id="teacher-title">شرح واضح ومتابعة تهتم بتقدّمك</h2>
            <p>
              مستر محمود عبد الواحد مدرس أول اللغة الإنجليزية لكل المراحل،
              وبالتخصيص: البكالوريا والأزهرية والثانوية العامة.
            </p>
          </div>
          <Link className={styles.browseLink} to="/#why">
            اكتشف مميزات المنصة
            <Icon name="arrow" />
          </Link>
        </section>

        <section aria-labelledby="install-title" className={styles.install}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>ثلاث خطوات بسيطة</span>
            <h2 id="install-title">كيف تثبّت التطبيق؟</h2>
          </div>
          <ol className={styles.steps}>
            {installSteps.map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
          <a
            className={styles.downloadButton}
            download="Mr-Mahmoud-English-Android.apk"
            href="/apkapp/app-debug.apk"
          >
            <Icon name="download" />
            <span>
              <strong>تحميل التطبيق الآن</strong>
              <small>Android · APK</small>
            </span>
          </a>
          <p className={styles.requirementNote}>
            يحتاج التطبيق إلى اتصال بالإنترنت للوصول إلى حسابك والدروس والمحتوى
            المحدّث.
          </p>
        </section>

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
