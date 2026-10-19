import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
  value: number;
  label?: string;
  className?: string;
}

export function ProgressBar({
  value,
  label,
  className = "",
}: ProgressBarProps) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`${styles.track} ${className}`}
      role="progressbar"
      aria-label={label ?? "التقدّم"}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={normalized}
    >
      <span style={{ width: `${normalized}%` }} />
    </div>
  );
}
