import type { HTMLAttributes } from "react";
import styles from "./Card.module.css";

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "article" | "section" | "div";
  dark?: boolean;
  interactive?: boolean;
}

export function Card({
  as: Component = "article",
  dark = false,
  interactive = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <Component
      className={`${styles.card} ${dark ? styles.dark : ""} ${interactive ? styles.interactive : ""} ${className}`}
      data-reveal=""
      {...props}
    />
  );
}
