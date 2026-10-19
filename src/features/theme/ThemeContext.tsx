import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ThemeContext, type Theme } from "./ThemeContextValue";
const THEME_STORAGE_KEY = "alarrab:theme";

function getSavedTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch (error) {
    console.warn("Unable to read the saved theme preference.", error);
    return "light";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getSavedTheme);
  const transitionTimeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.AlarrabAndroid?.setDarkMode(theme === "dark");

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn("Unable to save the theme preference.", error);
    }
  }, [theme]);

  const toggleTheme = (origin?: HTMLElement) => {
    const nextTheme = theme === "light" ? "dark" : "light";
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.clearTimeout(transitionTimeout.current);
    document.querySelector(".themeRipple")?.remove();

    if (!origin || reduceMotion) {
      setTheme(nextTheme);
      return;
    }

    const bounds = origin.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const maxX = Math.max(centerX, window.innerWidth - centerX);
    const maxY = Math.max(centerY, window.innerHeight - centerY);
    const ripple = document.createElement("div");
    ripple.className = "themeRipple";
    ripple.setAttribute("aria-hidden", "true");
    ripple.style.left = `${centerX - 10}px`;
    ripple.style.top = `${centerY - 10}px`;
    ripple.style.setProperty(
      "--ripple-scale",
      String(Math.ceil(Math.hypot(maxX, maxY) / 10)),
    );
    ripple.style.background =
      getComputedStyle(document.documentElement).getPropertyValue(
        nextTheme === "dark" ? "--theme-dark-bg" : "--theme-light-bg",
      );
    document.body.appendChild(ripple);

    transitionTimeout.current = window.setTimeout(() => {
      setTheme(nextTheme);
    }, 120);
    window.setTimeout(() => {
      ripple.remove();
    }, 720);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
