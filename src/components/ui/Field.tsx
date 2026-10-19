import type { InputHTMLAttributes } from "react";
import styles from "./Field.module.css";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  trailing?: React.ReactNode;
}

export function Field({
  label,
  error,
  trailing,
  id,
  className = "",
  ...props
}: FieldProps) {
  const inputId = id ?? props.name ?? label;
  return (
    <div className={styles.field}>
      <label htmlFor={inputId}>{label}</label>
      <div className={styles.control}>
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={className}
          {...props}
        />
        {trailing}
      </div>
      {error ? (
        <span className={styles.error} id={`${inputId}-error`} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
