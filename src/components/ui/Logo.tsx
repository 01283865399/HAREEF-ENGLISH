import { Link } from "react-router-dom";
import styles from "./Logo.module.css";

interface LogoProps {
  compact?: boolean;
  dark?: boolean;
  responsive?: boolean;
  onClick?: () => void;
}

export function Logo({
  compact = false,
  responsive = false,
  onClick,
}: LogoProps) {
  return (
    <Link
      aria-label="حريف إنجليش - الرئيسية"
      className={`${styles.logo}${responsive ? ` ${styles.responsive}` : ""}${compact ? ` ${styles.compact}` : ""}`}
      to="/"
      onClick={onClick}
    >
      <img alt="" className={styles.icon} src="/logo-icon.png?v=3" />
      <span className={styles.wordmark}>
        <span className={styles.arabicName}>حريف إنجليش</span>
        <span className={styles.englishName}>HAREEF ENGLISH</span>
      </span>
    </Link>
  );
}
