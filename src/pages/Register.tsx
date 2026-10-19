import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { useAuth } from "../features/auth/AuthContext";
import styles from "./Auth.module.css";

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp, error } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await signUp(name, email, password, remember);
      navigate("/dashboard");
    } catch {
      // handled by context
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.formWrap}>
      <h1>إنشاء حساب جديد</h1>
      <p className={styles.intro}>ابدأ رحلتك في تعلّم English دلوقتي.</p>
      <nav aria-label="نوع الحساب" className={styles.segmented}>
        <Link className={styles.segment} to="/login">
          تسجيل الدخول
        </Link>
        <Link aria-current="page" className={styles.segmentActive} to="/register">
          حساب جديد
        </Link>
      </nav>
      <form onSubmit={submit}>
        <label>
          الاسم الكامل
          <span className={styles.inputWithIcon}>
            <Icon name="user" />
            <input
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
              type="text"
              value={name}
            />
          </span>
        </label>
        <label>
          البريد الإلكتروني
          <span className={styles.inputWithIcon}>
            <Icon name="mail" />
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </span>
        </label>
        <label>
          كلمة المرور
          <div className={styles.passwordField}>
            <Icon name="lock" />
            <input
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              aria-label="إظهار كلمة المرور"
              onClick={() => setShowPassword((value) => !value)}
              type="button"
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
        </div>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <Button
          disabled={loading || !name || !email || !password}
          loading={loading}
          type="submit"
        >
          إنشاء الحساب
        </Button>
      </form>
      <p className={styles.switcher}>
        لديك حساب؟ <Link to="/login">تسجيل الدخول</Link>
      </p>
    </div>
  );
}
