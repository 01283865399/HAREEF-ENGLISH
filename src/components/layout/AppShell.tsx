import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { strings } from "../../data/strings";
import { useAuth } from "../../features/auth/AuthContext";
import { usePlatform } from "../../features/auth/PlatformContext";
import { useAsyncData } from "../../hooks/useAsyncData";
import { getCourses } from "../../services/courseService";
import { getAdminRole } from "../../services/orderService";
import { isAdminDemoUser } from "../../services/adminDemoService";
import { Icon } from "../ui/Icon";
import { Logo } from "../ui/Logo";
import { Pattern } from "../ui/Pattern";
import styles from "./AppShell.module.css";

const dashboardLinks = [
  { label: strings.dashboard.home, to: "/dashboard", icon: "home" as const },
  {
    label: strings.dashboard.courses,
    to: "/courses",
    icon: "book" as const,
  },
  {
    label: "طلباتي واشتراكاتي",
    to: "/dashboard/orders",
    icon: "file" as const,
  },
  {
    label: "الباقات المتاحة",
    to: "/packages",
    icon: "cap" as const,
  },
  {
    label: strings.dashboard.assignments,
    to: "/dashboard#assignments",
    icon: "edit" as const,
  },
  {
    label: strings.dashboard.schedule,
    to: "/dashboard#schedule",
    icon: "calendar" as const,
  },
  { label: "اختباراتي", to: "/dashboard/quiz", icon: "file" as const },
  { label: "ملفي الشخصي", to: "/dashboard/profile", icon: "user" as const },
];

export function AppShell() {
  const { user, signOut } = useAuth();
  const { progressError, retryProgress } = usePlatform();
  const developerPreview = isAdminDemoUser(user);
  const location = useLocation();
  const contentRef = useRef<HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null);
  const { data: courses, loading, error, retry } = useAsyncData(getCourses);

  useEffect(() => {
    if (!user) return undefined;
    if (isAdminDemoUser(user)) {
      setIsAdmin(true);
      setAdminCheckError(null);
      return undefined;
    }
    let active = true;
    setIsAdmin(false);
    setAdminCheckError(null);
    getAdminRole()
      .then((value) => {
        if (active) setIsAdmin(value);
      })
      .catch((reason: unknown) => {
        if (active) {
          setAdminCheckError(
            reason instanceof Error
              ? reason.message
              : "تعذّر التحقق من صلاحية الإدارة.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return undefined;

    const revealTargets = new Set<HTMLElement>();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let observer: IntersectionObserver | undefined;

    const observeTarget = (target: HTMLElement) => {
      if (reducedMotion) {
        target.dataset.revealed = "true";
        return;
      }
      if (revealTargets.has(target)) return;
      revealTargets.add(target);
      observer?.observe(target);
    };

    const collectTargets = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches("[data-reveal]")) {
        observeTarget(root);
      }
      root
        .querySelectorAll<HTMLElement>("[data-reveal]")
        .forEach(observeTarget);
    };

    if (!reducedMotion && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries, currentObserver) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const target = entry.target as HTMLElement;
            target.dataset.revealed = "true";
            currentObserver.unobserve(target);
            revealTargets.delete(target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -36px 0px" },
      );
      content.dataset.revealReady = "true";
    } else {
      content.removeAttribute("data-reveal-ready");
    }

    collectTargets(content);

    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) collectTargets(node);
        });
      });
    });
    mutationObserver.observe(content, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer?.disconnect();
      content.removeAttribute("data-reveal-ready");
    };
  }, [location.pathname]);
  const results = useMemo(() => {
    if (!search.trim()) return [];
    const query = search.trim();
    return (courses ?? [])
      .filter((course) => course.title.includes(query))
      .slice(0, 5);
  }, [courses, search]);
  const pageTitle =
    location.pathname === "/packages"
      ? "الباقات المتاحة"
      : location.pathname.startsWith("/courses")
        ? "دوراتي"
        : location.pathname.startsWith("/admin")
          ? "إدارة الاشتراكات"
          : location.pathname.endsWith("/lesson") ||
              location.pathname.includes("/lesson/")
            ? "الدرس"
            : location.pathname.endsWith("/quiz")
              ? "الاختبارات"
              : location.pathname.endsWith("/profile")
                ? "حسابي"
                : location.pathname.endsWith("/orders")
                  ? "طلباتي واشتراكاتي"
                  : strings.dashboard.title;

  return (
    <div className={styles.shell}>
      <aside
        className={`${styles.sidebar}${menuOpen ? ` ${styles.sidebarOpen}` : ""}`}
      >
        <Pattern />
        <div className={styles.sidebarTop}>
          <Logo dark />
          <button
            aria-label="إغلاق القائمة"
            className={styles.closeMenu}
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label="قائمة لوحة الطالب" className={styles.navigation}>
          {dashboardLinks.map(({ icon, label, to }) => (
            <NavLink
              className={({ isActive }) =>
                `${styles.navLink}${isActive ? ` ${styles.navActive}` : ""}`
              }
              end={to === "/dashboard"}
              key={to}
              onClick={() => setMenuOpen(false)}
              to={to}
            >
              <Icon name={icon} />
              {label}
            </NavLink>
          ))}
          {isAdmin ? (
            <NavLink
              className={({ isActive }) =>
                `${styles.navLink}${isActive ? ` ${styles.navActive}` : ""}`
              }
              to="/admin"
            >
              <Icon name="gear" />
              لوحة الإدارة
            </NavLink>
          ) : null}
          {adminCheckError ? (
            <p className={styles.adminCheckError} role="alert">
              {adminCheckError}
            </p>
          ) : null}
        </nav>
        <section className={styles.profile}>
          <div className={styles.avatar} aria-hidden="true">
            {user?.name.slice(0, 1) ?? "ط"}
          </div>
          <div className={styles.profileText}>
            <strong>{user?.name ?? "الطالب"}</strong>
            <span>{user?.email ?? "حساب طالب"}</span>
          </div>
          <button
            aria-label={strings.actions.logout}
            className={styles.logout}
            onClick={signOut}
            title={strings.actions.logout}
            type="button"
          >
            <Icon name="close" />
          </button>
        </section>
      </aside>
      {menuOpen && (
        <button
          aria-label="إغلاق القائمة الجانبية"
          className={styles.sidebarScrim}
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            aria-label="فتح القائمة"
            className={styles.menuToggle}
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <Icon name="menu" />
          </button>
          <div className={styles.greeting}>
            <h1>{pageTitle}</h1>
            <span>مرحبًا، {user?.name ?? "بك"}</span>
          </div>
          <div className={styles.search}>
            <Icon name="search" />
            <input
              aria-label="ابحث في الدروس والدورات"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث عن درس أو دورة"
              value={search}
            />
            {search && (
              <div className={styles.searchResults} role="listbox">
                {loading ? (
                  <span>جارٍ البحث...</span>
                ) : error ? (
                  <button onClick={retry} type="button">
                    تعذّر البحث · إعادة المحاولة
                  </button>
                ) : results.length ? (
                  results.map((course) => (
                    <Link key={course.id} to="/courses" role="option">
                      {course.title}
                    </Link>
                  ))
                ) : (
                  <span>لا توجد نتائج</span>
                )}
              </div>
            )}
          </div>
          <Link
            aria-label="الواجبات القادمة"
            className={styles.notification}
            to="/dashboard#assignments"
          >
            <Icon name="bell" />
          </Link>
          <Link className={styles.settings} to="/dashboard/profile">
            <span aria-hidden="true" className={styles.topbarAvatar}>
              {user?.name.slice(0, 1) ?? "ط"}
            </span>
            <span className={styles.settingsText}>
              {strings.dashboard.settings}
            </span>
          </Link>
        </header>
        <main className={styles.content} ref={contentRef}>
          {developerPreview ? (
            <div className={styles.developerPreview} role="status">
              حساب مدير تجريبي محلي؛ لا يمكنه إرسال طلبات دفع أو تفعيل
              اشتراكات حقيقية.
            </div>
          ) : null}
          {progressError ? (
            <div className={styles.progressSyncError} role="alert">
              <span>{progressError}</span>
              <button onClick={retryProgress} type="button">
                إعادة المحاولة
              </button>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
