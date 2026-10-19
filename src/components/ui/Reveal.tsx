import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import styles from "./Reveal.module.css";

interface RevealProps extends HTMLAttributes<HTMLElement> {
  as?: "article" | "div" | "section";
}

export function Reveal({
  as: Component = "div",
  children,
  className = "",
  ...props
}: RevealProps) {
  const elementRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Component
      className={`${styles.reveal}${visible ? ` ${styles.visible}` : ""} ${className}`}
      ref={(element: HTMLElement | null) => {
        elementRef.current = element;
      }}
      {...props}
    >
      {children}
    </Component>
  );
}
