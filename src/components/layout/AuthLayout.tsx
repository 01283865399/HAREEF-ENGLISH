import { Link, Outlet } from "react-router-dom";
import { Icon } from "../ui/Icon";
import { Logo } from "../ui/Logo";
import { Pattern } from "../ui/Pattern";
import styles from "./AuthLayout.module.css";

export function AuthLayout() {
  return (
    <main className={styles.layout}>
      <section className={styles.formSide}>
        <div className={styles.brand}>
          <Logo />
        </div>
        <div className={styles.formContent}>
          <Outlet />
        </div>
        <Link className={styles.back} to="/">
          ارجع للرئيسية
        </Link>
      </section>
      <aside className={styles.quoteSide}>
        <Pattern />
        <div className={styles.quoteContent}>
          <span className={styles.quoteChip}>مستر محمود عبد الواحد</span>
          <h2>
            English هتفهمه,
            <br />
            خطوة بخطوة.
          </h2>
          <p>ابدأ دلوقتي واتقن اللغة الإنجليزية مع مستر محمود.</p>
          <div className={styles.topics}>
            <span>
              <Icon name="book" /> Grammar
            </span>
            <span>
              <Icon name="steps" /> Reading
            </span>
            <span>
              <Icon name="file" /> Writing
            </span>
          </div>
        </div>
      </aside>
    </main>
  );
}
