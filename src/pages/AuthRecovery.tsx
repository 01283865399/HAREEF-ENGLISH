import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { useAuth } from "../features/auth/AuthContext";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase";
import {
  requestPasswordReset,
  setRecoveryPassword,
} from "../services/authService";
import styles from "./Auth.module.css";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "تعذّر إرسال رابط إعادة التعيين.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.formWrap}>
      <h1>استعادة كلمة المرور</h1>
      <p className={styles.intro}>
        أدخل بريد حسابك وسنرسل لك رابطًا آمنًا لإعادة تعيين كلمة المرور.
      </p>
      {sent ? (
        <p className={styles.success} role="status">
          إذا كان البريد مسجلًا، ستصلك رسالة تحتوي على رابط إعادة التعيين. تحقق
          أيضًا من مجلد الرسائل غير المرغوب فيها.
        </p>
      ) : (
        <form onSubmit={submit}>
          <label>
            البريد الإلكتروني
            <span className={styles.inputWithIcon}>
              <Icon name="mail" />
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </span>
          </label>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <Button disabled={loading || !email} loading={loading} type="submit">
            إرسال رابط إعادة التعيين
          </Button>
        </form>
      )}
      <p className={styles.switcher}>
        <Link to="/login">العودة إلى تسجيل الدخول</Link>
      </p>
    </div>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured()) {
      setError("إعادة تعيين كلمة المرور تحتاج إلى إعداد اتصال Supabase.");
      setChecking(false);
      return () => {
        active = false;
      };
    }
    getSupabaseClient()
      .auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setError(
            `تعذّر التحقق من رابط إعادة التعيين: ${sessionError.message}`,
          );
          return;
        }
        setHasRecoverySession(Boolean(data.session));
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "تعذّر التحقق من رابط إعادة التعيين.",
          );
        }
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    setLoading(true);
    try {
      await setRecoveryPassword(password);
      navigate("/dashboard", { replace: true });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "تعذّرت إعادة تعيين كلمة المرور.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <p className={styles.intro} role="status">
        جارٍ التحقق من رابط الاستعادة...
      </p>
    );
  }

  return (
    <div className={styles.formWrap}>
      <h1>تعيين كلمة مرور جديدة</h1>
      {hasRecoverySession ? (
        <>
          <p className={styles.intro}>اختر كلمة مرور جديدة لحسابك.</p>
          <form onSubmit={submit}>
            <label>
              كلمة المرور الجديدة
              <span className={styles.inputWithIcon}>
                <Icon name="lock" />
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </span>
            </label>
            <label>
              تأكيد كلمة المرور
              <span className={styles.inputWithIcon}>
                <Icon name="lock" />
                <input
                  autoComplete="new-password"
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                  type="password"
                  value={confirmation}
                />
              </span>
            </label>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            <Button
              disabled={loading || password.length < 8 || !confirmation}
              loading={loading}
              type="submit"
            >
              حفظ كلمة المرور الجديدة
            </Button>
          </form>
        </>
      ) : (
        <>
          <p className={styles.error} role="alert">
            {error ??
              "رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا."}
          </p>
          <p className={styles.switcher}>
            <Link to="/forgot-password">إرسال رابط جديد</Link>
          </p>
        </>
      )}
    </div>
  );
}

export function AuthCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (user) {
      const requestedPath = new URLSearchParams(location.search).get("next");
      const destination =
        requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
          ? requestedPath
          : "/dashboard";
      navigate(destination, { replace: true });
      return;
    }
    setError("تعذّر إكمال تسجيل الدخول. جرّب مرة أخرى.");
  }, [loading, location.search, navigate, user]);

  return (
    <div className={styles.formWrap}>
      <h1>تسجيل الدخول</h1>
      {error ? (
        <>
          <p className={styles.error} role="alert">
            {error}
          </p>
          <p className={styles.switcher}>
            <Link to="/login">العودة إلى تسجيل الدخول</Link>
          </p>
        </>
      ) : (
        <p className={styles.intro} role="status">
          جارٍ إكمال تسجيل الدخول...
        </p>
      )}
    </div>
  );
}
