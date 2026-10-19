import { useEffect } from "react";
import { Icon } from "./Icon";
import styles from "./Toast.module.css";

interface ToastProps {
  message: string;
  onDismiss: () => void;
  open: boolean;
  timeoutMs?: number;
  tone?: "success" | "error" | "info";
}

export function Toast({
  message,
  onDismiss,
  open,
  timeoutMs = 5000,
  tone = "info",
}: ToastProps) {
  useEffect(() => {
    if (!open || timeoutMs <= 0) return undefined;
    const timeout = window.setTimeout(onDismiss, timeoutMs);
    return () => window.clearTimeout(timeout);
  }, [onDismiss, open, timeoutMs]);

  if (!open) return null;

  return (
    <div
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`${styles.toast} ${styles[tone]}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <span>{message}</span>
      <button aria-label="إغلاق الإشعار" onClick={onDismiss} type="button">
        <Icon name="close" />
      </button>
    </div>
  );
}
