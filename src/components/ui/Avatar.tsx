import styles from "./Avatar.module.css";

interface AvatarProps {
  size?: number;
  label?: string;
  className?: string;
}

export function Avatar({
  size = 44,
  label = "صورة المستخدم",
  className = "",
}: AvatarProps) {
  return (
    <span
      className={`${styles.avatar} ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    />
  );
}
