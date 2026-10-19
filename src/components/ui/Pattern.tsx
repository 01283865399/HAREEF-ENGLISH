import { useId } from "react";
import styles from "./Pattern.module.css";

export function Pattern() {
  const patternId = useId().replaceAll(":", "");
  return (
    <svg className={styles.pattern} aria-hidden="true" viewBox="0 0 64 64">
      <defs>
        <pattern
          id={patternId}
          width="64"
          height="64"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M32 6l6 13 13-6-6 13 13 6-13 6 6 13-13-6-6 13-6-13-13 6 6-13-13-6 13-6-6-13 13 6z"
            fill="none"
            stroke="var(--accent-1)"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
