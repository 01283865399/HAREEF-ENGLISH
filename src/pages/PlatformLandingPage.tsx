import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/ui/Icon";
import { Logo } from "../components/ui/Logo";
import { Toast } from "../components/ui/Toast";
import { CONTACT_PHONES, teacherInfo } from "../data/teacherInfo";
import { useTheme } from "../features/theme/useTheme";
import { getCourses, isFreeCourse } from "../services/courseService";
import {
  academicSystemLabel,
  categoryLabel,
  levelLabel,
} from "../data/coursePresentation";
import { useAsyncData } from "../hooks/useAsyncData";
import styles from "./PlatformLandingPage.module.css";

type StageFilter = "all" | "general" | "bac" | "azhar" | "prep";
type PriceFilter = "all" | "free" | "paid";

const stageTabs: { id: StageFilter; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "general", label: "الثانوية العامة" },
  { id: "bac", label: "البكالوريا" },
  { id: "azhar", label: "الثانوية الأزهرية" },
  { id: "prep", label: "الإعدادية" },
];

const learningTracks = [
  {
    number: "1",
    title: "الثانوية العامة",
    text: "مسارات English حسب الصف الدراسي والمحتوى المتاح.",
    topics: ["Grammar", "Vocabulary", "Reading", "Writing"],
    stage: "general" as const,
    icon: "cap" as const,
  },
  {
    number: "2",
    title: "البكالوريا",
    text: "محتوى منظم لطلاب البكالوريا حسب الصف والترم.",
    topics: ["Grammar", "Translation", "Reading", "Final Revision"],
    stage: "bac" as const,
    icon: "star" as const,
  },
  {
    number: "3",
    title: "الثانوية الأزهرية",
    text: "مسارات للثانوية الأزهرية حسب الكورسات المسجلة.",
    topics: ["Vocabulary", "Writing", "Literature", "Final Revision"],
    stage: "azhar" as const,
    icon: "book" as const,
  },
];

const featureTiles = teacherInfo.groupFeatures.map((feature, index) => ({
  ...feature,
  number: String(index + 1).padStart(2, "0"),
  variant:
    feature.title === "مراجعة دورية"
      ? "featureReview"
      : feature.title === "امتحان بعد كل وحدة"
        ? "featureExam"
        : "featureItem",
}));

const teacherProfileGroups = [
  { icon: "cap" as const, title: "المؤهلات", items: teacherInfo.education },
  { icon: "clock" as const, title: "الخبرة", items: teacherInfo.experience },
  { icon: "spark" as const, title: "الدورات والبرامج", items: teacherInfo.courses },
  { icon: "star" as const, title: "إنجازات شخصية", items: teacherInfo.achievements },
];

export function PlatformLandingPage() {
  const { theme, toggleTheme } = useTheme();
  const {
    data: coursesData,
    loading: loadingCourses,
    error: coursesError,
    retry: retryCourses,
  } = useAsyncData(getCourses);
  const courses = coursesData ?? [];
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<StageFilter>("all");
  const [price, setPrice] = useState<PriceFilter>("all");
  const [visibleCount, setVisibleCount] = useState(6);
  const [hidden, setHidden] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("top");
  const [toastMessage, setToastMessage] = useState("");

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return courses.filter((course) => {
      const grade = course.grade ?? "";
      const system = course.academicSystem ?? "";
      const matchesStage =
        stage === "all" ||
        (stage === "general" && system.includes("عام")) ||
        (stage === "bac" && system.includes("بكالوريا")) ||
        (stage === "azhar" && system.includes("أزهري")) ||
        (stage === "prep" && grade.includes("إعدادي"));
      const matchesPrice =
        price === "all" ||
        (price === "free" && isFreeCourse(course.id)) ||
        (price === "paid" && !isFreeCourse(course.id));
      const searchable = [
        course.title,
        course.category,
        categoryLabel(course.category),
        course.level,
        course.grade ?? "",
        course.academicSystem ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase();
      return (
        matchesStage &&
        matchesPrice &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [courses, price, query, stage]);

  const visibleCourses = filteredCourses.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(6);
  }, [price, query, stage]);

  useEffect(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    let previousY = window.scrollY;
    const updateHeader = () => {
      const currentY = window.scrollY;
      setHidden(currentY > 80 && currentY > previousY);
      previousY = currentY;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(scrollable > 0 ? (currentY / scrollable) * 100 : 0);
    };
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>("main section[id]")];
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let revealObserver: IntersectionObserver | undefined;
    let sectionObserver: IntersectionObserver | undefined;
    if (!reducedMotion && "IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            (entry.target as HTMLElement).dataset.revealed = "true";
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -32px 0px" },
      );
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((item) => {
        revealObserver?.observe(item);
      });
      sectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection((entry.target as HTMLElement).id);
            }
          });
        },
        { rootMargin: "-35% 0px -55% 0px" },
      );
      sections.forEach((section) => sectionObserver?.observe(section));
      document.body.dataset.revealReady = "true";
    } else {
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((item) => {
        item.dataset.revealed = "true";
      });
    }
    return () => {
      revealObserver?.disconnect();
      sectionObserver?.disconnect();
      delete document.body.dataset.revealReady;
    };
  }, [visibleCourses.length]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const navLinks = [
    { id: "tracks", label: "المراحل" },
    { id: "why", label: "المميزات" },
    { id: "about", label: "عن المدرس" },
    { id: "courses", label: "الكورسات" },
  ];

  return (
    <div className={styles.page}>
      <header className={`${styles.header}${hidden ? ` ${styles.headerHidden}` : ""}`}>
        <div className={`container ${styles.headerInner}`}>
          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            className={styles.menuButton}
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
          <div className={styles.brand}>
            <Logo responsive />
          </div>
          <nav aria-label="التنقل الرئيسي" className={styles.desktopNav}>
            {navLinks.map((item) => (
              <a
                aria-current={activeSection === item.id ? "location" : undefined}
                className={activeSection === item.id ? styles.navActive : ""}
                href={`#${item.id}`}
                key={item.id}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className={styles.headerActions}>
            <button
              aria-label={theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
              className={styles.iconButton}
              onClick={(event) => toggleTheme(event.currentTarget)}
              type="button"
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <button
              aria-label="الإشعارات"
              className={styles.iconButton}
              onClick={() => setToastMessage("مفيش إشعارات جديدة دلوقتي")}
              type="button"
            >
              <Icon name="bell" />
              <span className={styles.notificationDot} />
            </button>
            <Link className={styles.ghostButton} to="/login">تسجيل الدخول</Link>
            <Link className={styles.primaryButton} to="/register">حساب جديد</Link>
          </div>
        </div>
        <span
          aria-hidden="true"
          className={styles.scrollProgress}
          style={{ width: `${scrollProgress}%` }}
        />
      </header>

      <div
        className={`${styles.drawerScrim}${menuOpen ? ` ${styles.drawerScrimOpen}` : ""}`}
        onClick={() => setMenuOpen(false)}
      />
      <aside
        aria-hidden={!menuOpen}
        aria-label="قائمة التنقل"
        className={`${styles.drawer}${menuOpen ? ` ${styles.drawerOpen}` : ""}`}
      >
        <div className={styles.drawerTop}>
          <Logo responsive />
          <button
            aria-label="إغلاق القائمة"
            className={styles.iconButton}
            onClick={() => setMenuOpen(false)}
            type="button"
          ><Icon name="close" /></button>
        </div>
        <nav>
          {navLinks.map((item) => (
            <a href={`#${item.id}`} key={item.id} onClick={() => setMenuOpen(false)}>
              {item.label}
            </a>
          ))}
          <Link to="/download-app" onClick={() => setMenuOpen(false)}>تطبيق Android</Link>
          <Link to="/download-windows" onClick={() => setMenuOpen(false)}>تطبيق Windows</Link>
        </nav>
        <div className={styles.drawerActions}>
          <Link className={styles.primaryButton} to="/register" onClick={() => setMenuOpen(false)}>حساب جديد</Link>
          <Link className={styles.ghostButton} to="/login" onClick={() => setMenuOpen(false)}>تسجيل الدخول</Link>
        </div>
      </aside>

      <main id="top">
        <section className={styles.hero}>
          <div className={`container ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <span className={`${styles.eyebrow} ${styles.reveal}`} data-reveal>
                <Icon name="spark" /> {teacherInfo.tagline}
              </span>
              <h1 className={styles.reveal} data-reveal>
                <span>{teacherInfo.name}</span>
              </h1>
              <p className={`${styles.teacherRole} ${styles.reveal}`} data-reveal>
                مدرس أول لغة إنجليزية
              </p>
              <p className={`${styles.heroLead} ${styles.reveal}`} data-reveal>
                {teacherInfo.teachingDescription}
              </p>
              <p className={`${styles.heroLead} ${styles.reveal}`} data-reveal>
                معروف بـ <strong>{teacherInfo.nickname}</strong> · {teacherInfo.hashtag}
              </p>
              <div className={`${styles.heroChips} ${styles.reveal}`} data-reveal>
                <span className={styles.chip}><Icon name="star" /> البكالوريا</span>
                <span className={styles.chip}><Icon name="book" /> الثانوية الأزهرية</span>
                <span className={styles.chip}><Icon name="cap" /> الثانوية العامة</span>
                <span className={styles.chip}><Icon name="plus" /> وباقي المراحل</span>
              </div>
              <div className={styles.heroActions}>
                <Link className={styles.primaryButtonLarge} to="/register">
                  <Icon name="user" /> ابدأ دلوقتي
                </Link>
                <a className={styles.ghostButtonLarge} href="#courses">
                  <Icon name="play" /> شوف الكورسات
                </a>
              </div>
            </div>
            <div className={`${styles.portrait} ${styles.reveal}`} data-reveal>
              <div className={styles.portraitFrame}>
                <img src="/teacher-mahmoud.jpg" alt="مستر محمود عبد الواحد" />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} id="tracks">
          <div className="container">
            <header className={`${styles.sectionHeading} ${styles.reveal}`} data-reveal>
              <span className={styles.kicker}>المراحل الدراسية</span>
              <h2>اختار مسارك، وإحنا نكمّل معاك</h2>
              <p>محتوى متخصص حسب مرحلتك ونظامك الدراسي.</p>
            </header>
            <div className={styles.trackGrid}>
              {learningTracks.map((track) => (
                <article className={`${styles.trackCard} ${styles.reveal}`} data-reveal key={track.number}>
                  <span aria-hidden="true" className={styles.trackNumber}>{track.number}</span>
                  <span className={styles.trackIcon}><Icon name={track.icon} /></span>
                  <h3>{track.title}</h3>
                  <p>{track.text}</p>
                  <ul>{track.topics.map((topic) => <li key={topic}><Icon name="check" />{topic}</li>)}</ul>
                  <a className={styles.trackLink} href="#courses" onClick={() => setStage(track.stage)}>
                    شوف كورسات المسار <Icon name="arrow" />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} id="why">
          <div className="container">
            <header className={`${styles.sectionHeading} ${styles.centerHeading} ${styles.reveal}`} data-reveal>
              <span className={styles.kicker}>مميزات المجموعات</span>
              <h2>متابعة منظمة في كل خطوة</h2>
              <p>من التأسيس لحد امتحان نهاية كل وحدة، بخطوات واضحة ومستمرة.</p>
            </header>
            <div className={styles.bentoGrid}>
              {featureTiles.map((tile) => (
                <article className={`${styles.bentoCell} ${styles.featureCard} ${styles[tile.variant]} ${styles.reveal}`} data-reveal key={tile.title}>
                  <div className={styles.featureCardTop}>
                    <span className={styles.bentoIcon}><Icon name={tile.icon} /></span>
                    <span aria-hidden="true" className={styles.featureNumber}>
                      {tile.number}
                    </span>
                  </div>
                  <div className={styles.featureCopy}>
                    <h3>{tile.title}</h3>
                    <p>{tile.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} id="about">
          <div className="container">
            <div className={styles.profileLayout}>
              <article
                aria-labelledby="teacher-profile-title"
                className={`${styles.profileIntro} ${styles.reveal}`}
                data-reveal
              >
                <div className={styles.profileBrand}>
                  <img src="/logo-icon.png?v=3" alt="" />
                  <span>
                    <strong>{teacherInfo.tagline}</strong>
                    <small>{teacherInfo.englishName}</small>
                  </span>
                </div>
                <span className={styles.profileKicker}>عن المدرس</span>
                <h2 id="teacher-profile-title">{teacherInfo.name}</h2>
                <p>{teacherInfo.teachingDescription}</p>
                <div className={styles.profileStages}>
                  <span>الثانوية العامة</span>
                  <span>البكالوريا</span>
                  <span>الأزهرية</span>
                </div>
                <div className={styles.profileSignature}>
                  <span>{teacherInfo.hashtag}</span>
                  <span>صفحة فيسبوك: {teacherInfo.facebookPage}</span>
                </div>
                <a className={styles.profileAction} href="#courses">
                  شوف الكورسات <Icon name="arrow" />
                </a>
              </article>
              <div className={styles.profileGrid}>
                {teacherProfileGroups.map((group) => (
                  <article
                    className={`${styles.profileCard} ${styles.reveal}`}
                    data-reveal
                    key={group.title}
                  >
                    <div className={styles.profileCardHeading}>
                      <span><Icon name={group.icon} /></span>
                      <h3>{group.title}</h3>
                    </div>
                    <ul>
                      {group.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} id="courses">
          <div className="container">
            <header className={`${styles.sectionHeading} ${styles.reveal}`} data-reveal>
              <span className={styles.kicker}>الكورسات</span>
              <h2>ابدأ من الكورس المناسب ليك</h2>
              <p>فلتر حسب مرحلتك وشوف الكورسات المرتبطة بالنظام المسجل.</p>
            </header>
            <div className={`${styles.catalogToolbar} ${styles.reveal}`} data-reveal>
              <div className={styles.stageTabs} role="tablist" aria-label="فلترة حسب المرحلة">
                {stageTabs.map((tab) => (
                  <button
                    aria-selected={stage === tab.id}
                    className={stage === tab.id ? styles.tabActive : styles.tab}
                    key={tab.id}
                    onClick={() => setStage(tab.id)}
                    role="tab"
                    type="button"
                  >{tab.label}</button>
                ))}
              </div>
              <div className={styles.catalogControls}>
                <label className={styles.searchField}>
                  <Icon name="search" />
                  <input
                    aria-label="ابحث عن كورس"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ابحث باسم الكورس أو المرحلة..."
                    type="search"
                    value={query}
                  />
                </label>
                <label className={styles.priceFilter}>
                  <span>السعر</span>
                  <select onChange={(event) => setPrice(event.target.value as PriceFilter)} value={price}>
                    <option value="all">الكل</option>
                    <option value="free">مجاني</option>
                    <option value="paid">مدفوع</option>
                  </select>
                </label>
              </div>
            </div>
            <p aria-live="polite" className={styles.resultsCount}>
              {filteredCourses.length ? `عرض ${visibleCourses.length} من ${filteredCourses.length} كورس` : "مفيش كورسات في المرحلة دي حاليًا."}
            </p>
            {loadingCourses ? (
              <div aria-label="جارٍ تحميل الكورسات" className={styles.courseGrid}>
                {Array.from({ length: 3 }, (_, index) => <div className={styles.courseSkeleton} key={index} />)}
              </div>
            ) : coursesError ? (
              <div className={styles.stateMessage} role="alert">
                <p>{coursesError}</p><button className={styles.ghostButton} onClick={retryCourses} type="button">جرّب تاني</button>
              </div>
            ) : visibleCourses.length ? (
              <div className={styles.courseGrid}>
                {visibleCourses.map((course) => {
                  const free = isFreeCourse(course.id);
                  return (
                    <article className={`${styles.courseCard} ${styles.reveal}`} data-reveal key={course.id}>
                      <div className={styles.courseTop}>
                        <span className={styles.courseTag}>{academicSystemLabel(course.academicSystem ?? categoryLabel(course.category))}</span>
                        <h3>{course.title}</h3>
                        <span className={styles.courseIcon}><Icon name="book" /></span>
                      </div>
                      <div className={styles.courseBody}>
                        <div className={styles.courseMeta}>
                          <span><Icon name="cap" />{levelLabel(course.level)}</span>
                          <span><Icon name="clock" />{course.duration}</span>
                          <span><Icon name="file" />{course.lessons}</span>
                        </div>
                        <p className={styles.courseCategory}>{categoryLabel(course.category)}</p>
                        <div className={styles.courseFoot}>
                          <div className={styles.price}><strong>{free ? "مجاني" : course.price}</strong></div>
                          <Link className={styles.enrollButton} to={`/courses/${course.id}`}>
                            اشترك <Icon name="arrow" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.stateMessage}>
                لا توجد كورسات مطابقة. غيّر المرحلة أو كلمة البحث.
              </div>
            )}
            {coursesError ? null : filteredCourses.length > visibleCourses.length ? (
              <div className={styles.moreCourses}>
                <button className={styles.ghostButton} onClick={() => setVisibleCount((count) => count + 6)} type="button">شوف كورسات أكتر</button>
              </div>
            ) : null}
          </div>
        </section>

        <section className={`container ${styles.ctaSection}`}>
          <div className={styles.ctaBanner}>
            <div>
              <span className={styles.kicker}>ابدأ رحلتك</span>
              <h2>جاهز تبدأ رحلتك في الإنجليزي؟</h2>
              <p>أنشئ حسابك دلوقتي واختار المرحلة اللي تناسبك.</p>
            </div>
            <Link className={styles.sageButton} to="/register"><Icon name="user" /> أنشئ حسابك</Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer} id="contact">
        <div className={`container ${styles.footerGrid}`}>
          <div className={styles.footerAbout}>
            <Logo dark />
            <p>{teacherInfo.teachingDescription}</p>
            <div className={styles.socials} aria-label="حسابات التواصل الاجتماعي">
              {(["youtube", "facebook", "telegram", "whatsapp"] as const).map((name) => (
                <Link aria-label={name} key={name} to="/about-developer"><Icon name={name} /></Link>
              ))}
            </div>
          </div>
          <div className={styles.footerColumn}>
            <h3>المراحل</h3>
            {learningTracks.map((track) => <a href="#courses" key={track.stage} onClick={() => setStage(track.stage)}>{track.title}</a>)}
          </div>
          <div className={styles.footerColumn}>
            <h3>أماكن المجموعات الأوفلاين للمرحلة الثانوية</h3>
            {teacherInfo.locations.map((location) => (
              <p key={location.name}>
                <strong>{location.name} — {location.area}</strong>
                <span>{location.details}</span>
              </p>
            ))}
          </div>
          <div className={styles.footerColumn}>
            <h3>للحجز والاستفسار</h3>
            {CONTACT_PHONES.length ? (
              CONTACT_PHONES.map((phone) => <a href={`tel:${phone}`} key={phone}>{phone}</a>)
            ) : (
              <p>أرقام التواصل هتظهر بعد تأكيد الرقم المعتمد.</p>
            )}
            <Link to="/download-app">تطبيق Android</Link>
            <Link to="/download-windows">تطبيق Windows</Link>
          </div>
        </div>
        <div className={`container ${styles.copyright}`}>
          © 2026 مستر محمود عبد الواحد. كل الحقوق محفوظة.
        </div>
      </footer>
      <Toast message={toastMessage} onDismiss={() => setToastMessage("")} open={Boolean(toastMessage)} />
    </div>
  );
}