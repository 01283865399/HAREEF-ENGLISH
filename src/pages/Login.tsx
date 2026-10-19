import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { useAuth } from "../features/auth/AuthContext";
import { isAdminDemoAvailable } from "../services/adminDemoService";
import { loginWithGoogle } from "../services/authService";
import { isSupabaseConfigured } from "../lib/supabase";
import styles from "./Auth.module.css";

export function LoginPage() {
  const siteUrl = window.location.origin;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(siteUrl)}`;
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, error } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await signIn(identifier, password, remember);
      const state = location.state as {
        from?: string | { pathname?: string };
      } | null;
      const destination =
        typeof state?.from === "string"
          ? state.from
          : (state?.from?.pathname ??
            (identifier.trim().toLowerCase() === "admin"
              ? "/admin"
              : "/dashboard"));
      navigate(destination);
    } catch {
      // handled by context
    } finally {
      setLoading(false);
    }
  }

  async function signInGoogle() {
    setGoogleLoading(true);
    setGoogleError(null);
    const state = location.state as {
      from?: string | { pathname?: string };
    } | null;
    const destination =
      typeof state?.from === "string"
        ? state.from
        : (state?.from?.pathname ?? "/dashboard");
    try {
      await loginWithGoogle(remember, destination);
    } catch (reason) {
      setGoogleError(
        reason instanceof Error
          ? reason.message
          : "تعذّر تسجيل الدخول بحساب Google.",
      );
      setGoogleLoading(false);
    }
  }

  return (
    <div className={styles.formWrap}>
      <h1>أهلًا بعودتك</h1>
      <p className={styles.intro}>سجّل دخولك لتكمل من حيث توقفت.</p>
      <nav aria-label="نوع الحساب" className={styles.segmented}>
        <Link aria-current="page" className={styles.segmentActive} to="/login">
          تسجيل الدخول
        </Link>
        <Link className={styles.segment} to="/register">
          حساب جديد
        </Link>
      </nav>
      <form onSubmit={submit}>
        <label>
          {isAdminDemoAvailable()
            ? "اسم المستخدم أو البريد الإلكتروني"
            : "البريد الإلكتروني أو اسم مستخدم الإدارة"}
          <span className={styles.inputWithIcon}>
            <Icon name="mail" />
            <input
              autoComplete="username"
              dir="ltr"
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={
                isAdminDemoAvailable() ? "admin" : "name@example.com"
              }
              type="text"
              value={identifier}
            />
          </span>
        </label>
        {isAdminDemoAvailable() ? (
          <p className={styles.intro}>
            دخول تجريبي محلي: اسم المستخدم <bdi>admin</bdi> وكلمة المرور{" "}
            <bdi>1234</bdi>. يمكنك تغييرهما من لوحة الإدارة.
          </p>
        ) : null}
        <label>
          كلمة المرور
          <div className={styles.passwordField}>
            <Icon name="lock" />
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              onClick={() => setShowPassword((value) => !value)}
              type="button"
              aria-label="إظهار كلمة المرور"
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} />
            </button>
          </div>
        </label>
        <div className={styles.options}>
          <label className={styles.check}>
            <input
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              type="checkbox"
            />{" "}
            تذكّرني
          </label>
          {isSupabaseConfigured() ? (
            <Link className={styles.forgotLink} to="/forgot-password">
              نسيت كلمة المرور؟
            </Link>
          ) : null}
        </div>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <Button
          disabled={loading || !identifier || !password}
          loading={loading}
          type="submit"
        >
          تسجيل الدخول
        </Button>
        {isSupabaseConfigured() ? (
          <>
            <div className={styles.separator}>
              <span>أو</span>
            </div>
            {googleError ? (
              <p className={styles.error} role="alert">
                {googleError}
              </p>
            ) : null}
            <button
              className={styles.googleButton}
              disabled={googleLoading || loading}
              onClick={() => void signInGoogle()}
              type="button"
            >
              <GoogleMark />
              {googleLoading
                ? "جارٍ التحويل إلى Google..."
                : "المتابعة باستخدام Google"}
            </button>
          </>
        ) : null}
      </form>
      <p className={styles.switcher}>
        ليس لديك حساب؟ <Link to="/register">حساب جديد</Link>
      </p>
      <aside className={styles.qrCard} aria-label="افتح المنصة على هاتفك">
        <a
          className={styles.qrLink}
          href={siteUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="فتح منصة مستر محمود"
        >
          <img
            className={styles.qrCode}
            src={qrCodeUrl}
            alt="رمز QR لفتح منصة مستر محمود"
            width="150"
            height="150"
            loading="lazy"
            decoding="async"
          />
        </a>
        <div className={styles.qrCopy}>
          <strong>افتح المنصة على هاتفك</strong>
          <span>امسح الكود لفتح المنصة على هاتفك</span>
          <small dir="ltr">{siteUrl.replace(/^https?:\/\//u, "")}</small>
        </div>
      </aside>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className={styles.googleMark} viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.62 5.91c4.45-4.1 7.15-10.15 7.15-17.56z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.93 7.56 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.9-5.79l-7.62-5.91c-2.12 1.42-4.84 2.26-8.28 2.26-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
