import { Link } from "react-router-dom";
import { developerContact } from "../../shared/developerContact.js";
import { Icon } from "../components/ui/Icon";
import developerPhoto from "../assets/images/ahmed-deeb1.jpg";
import styles from "./AboutDeveloper.module.css";

export function AboutDeveloperPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.profileColumn}>
          <div className={styles.photoFrame}>
            <img src={developerPhoto} alt="أحمد محمود منصور ديب" />
          </div>
          <span className={styles.profileBadge}>
            <Icon name="check" /> مطوّر المنصة
          </span>
        </div>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>عن مطوّر المنصة</span>
          <h1>أحمد محمود منصور ديب</h1>
          <p className={styles.lead}>
            طالب في كلية هندسة الذكاء الاصطناعي وعلوم الحاسوب.
          </p>
          <p>مطوّر Full Stack، بيبني منصات ومواقع تعليمية ومتاجر إلكترونية.</p>
          <div className={styles.highlights}>
            <div>
              <Icon name="cap" />
              <span>طالب هندسة الذكاء الاصطناعي وعلوم الحاسوب</span>
            </div>
            <div>
              <Icon name="code" />
              <span>تطوير منصات وتجارب رقمية عملية</span>
            </div>
          </div>
          <div className={styles.actions}>
            <a
              className={styles.primaryAction}
              href={developerContact.whatsappUrl}
              rel="noreferrer"
              target="_blank"
            >
              <Icon name="whatsapp" /> تواصل عبر واتساب
            </a>
            <a
              className={styles.secondaryAction}
              href={developerContact.telegramUrl}
              rel="noreferrer"
              target="_blank"
            >
              <Icon name="telegram" /> تواصل عبر تليجرام
            </a>
          </div>
          <p className={styles.phone}>
            رقم التواصل: <strong>{developerContact.phone}</strong>
          </p>
        </div>
      </section>
      <Link className={styles.backLink} to="/">
        <Icon name="arrow" /> العودة إلى الرئيسية
      </Link>
    </main>
  );
}
