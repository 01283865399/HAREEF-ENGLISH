import { Link } from "react-router-dom";
import { CONTACT_PHONES, teacherInfo } from "../../data/teacherInfo";
import { Logo } from "../ui/Logo";
import { Icon } from "../ui/Icon";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.columns}`}>
        <div className={styles.brandColumn}>
          <Logo dark />
          <p>{teacherInfo.teachingDescription}</p>
          <div className={styles.socials} aria-label="حسابات التواصل الاجتماعي">
            {(["youtube", "facebook", "telegram", "whatsapp"] as const).map((name) => (
              <Link aria-label={name} key={name} to="/about-developer"><Icon name={name} /></Link>
            ))}
          </div>
        </div>
        <div className={styles.column}>
          <strong>المراحل</strong>
          <Link to="/packages">الثانوية العامة</Link>
          <Link to="/packages">البكالوريا</Link>
          <Link to="/packages">الثانوية الأزهرية</Link>
        </div>
        <div className={styles.column}>
          <strong>أماكن المجموعات الأوفلاين للمرحلة الثانوية</strong>
          {teacherInfo.locations.map((location) => (
            <p key={location.name}>
              <b>{location.name} — {location.area}</b>
              <span>{location.details}</span>
            </p>
          ))}
        </div>
        <div className={styles.column}>
          <strong>للحجز والاستفسار</strong>
          {CONTACT_PHONES.length ? (
            CONTACT_PHONES.map((phone) => (
              <a href={`tel:${phone}`} key={phone}>{phone}</a>
            ))
          ) : (
            <p>أرقام التواصل هتظهر بعد تأكيد الرقم المعتمد.</p>
          )}
          <Link to="/download-app">تطبيق Android</Link>
          <Link to="/download-windows">تطبيق Windows</Link>
        </div>
      </div>
      <p className={styles.copyright}>© 2026 مستر محمود عبد الواحد. كل الحقوق محفوظة.</p>
    </footer>
  );
}
