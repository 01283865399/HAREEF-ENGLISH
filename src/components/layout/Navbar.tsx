import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { strings } from "../../data/strings";
import { useAuth } from "../../features/auth/AuthContext";
import { useLenis } from "../../features/scroll/LenisContext";
import { useTheme } from "../../features/theme/useTheme";
import { Icon } from "../ui/Icon";
import { Logo } from "../ui/Logo";
import styles from "./Navbar.module.css";

const links = [
  { label: strings.nav.home, to: "/" },
  { label: strings.nav.platform, to: "/#why" },
  { label: strings.nav.courses, to: "/courses" },
  { label: strings.nav.library, to: "/#courses" },
  { label: strings.nav.plans, to: "/#packages" },
  { label: strings.nav.about, to: "/#contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const lenis = useLenis();
  const [hidden, setHidden] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!open) return undefined;
    const drawer = drawerRef.current;
    const button = menuButtonRef.current;
    const focusable = drawer?.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled])",
    );
    focusable?.[0]?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0] ?? null;
      const last = focusable[focusable.length - 1] ?? null;
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      button?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!location.hash || location.pathname !== "/") return;
    const target = document.getElementById(location.hash.slice(1));
    if (!target) return;
    if (lenis) {
      lenis.scrollTo(target, { offset: -24, duration: 1 });
    } else {
      target.scrollIntoView({ block: "start" });
    }
  }, [lenis, location.hash, location.pathname]);

  useEffect(() => {
    let previousY = window.scrollY;
    const handleScroll = () => {
      const currentY = window.scrollY;
      setHidden(currentY > 80 && currentY > previousY);
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(
        scrollableHeight > 0 ? (currentY / scrollableHeight) * 100 : 0,
      );
      previousY = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const menu = (
    <>
      <nav aria-label="التنقل الرئيسي" className={styles.links}>
        {links.map(({ label, to }) => (
          <NavLink
            className={`${styles.link}${
              (to === "/"
                ? location.pathname === "/" && !location.hash
                : to.includes("#")
                  ? location.pathname === "/" &&
                    location.hash === to.slice(to.indexOf("#"))
                  : location.pathname === to ||
                    (to === "/courses" && location.pathname.startsWith("/courses/"))
              )
                ? ` ${styles.active}`
                : ""
            }`}
            end={to === "/"}
            key={to}
            to={to}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.actions}>
        <button
          aria-label={theme === "dark" ? "التبديل للوضع الفاتح" : "التبديل للوضع الداكن"}
          className={styles.themeButton}
          onClick={(event) => toggleTheme(event.currentTarget)}
          type="button"
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>
        {user ? (
          <Link className={styles.cta} to="/dashboard">
            {strings.nav.dashboard}
          </Link>
        ) : (
          <>
            <Link className={styles.secondaryCta} to="/login">
              {strings.nav.login}
            </Link>
            <Link className={styles.cta} to="/register">
              {strings.home.startFree}
            </Link>
          </>
        )}
      </div>
    </>
  );

  return (
    <header className={`${styles.header}${hidden ? ` ${styles.hidden}` : ""}`}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <Logo responsive />
        </div>
        <div className={styles.desktop}>{menu}</div>
        <button
          aria-expanded={open}
          aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
          className={styles.menuButton}
          onClick={() => setOpen((value) => !value)}
          ref={menuButtonRef}
          type="button"
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>
      <span
        aria-hidden="true"
        className={styles.scrollProgress}
        style={{ width: `${scrollProgress}%` }}
      />
      {open && (
        <div className={styles.scrim} onClick={() => setOpen(false)}>
          <section
            aria-label="قائمة التنقل"
            className={styles.drawer}
            onClick={(event) => event.stopPropagation()}
            ref={drawerRef}
          >
            <div className={styles.drawerBrand}>
              <Logo responsive />
            </div>
            {menu}
          </section>
        </div>
      )}
    </header>
  );
}
