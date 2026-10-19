import type { HTMLAttributes } from "react";
import styles from "./Chip.module.css";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  active?: boolean;
  dark?: boolean;
  gold?: boolean;
}

export function Chip({
  active = false,
  dark = false,
  gold = false,
  className = "",
  ...props
}: ChipProps) {
  return (
    <span
      className={`${styles.chip} ${active ? styles.active : ""} ${dark ? styles.dark : ""} ${gold ? styles.gold : ""} ${className}`}
      {...props}
    />
  );
}
