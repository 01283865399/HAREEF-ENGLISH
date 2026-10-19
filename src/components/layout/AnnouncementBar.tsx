import { useState } from "react";
import { Icon } from "../ui/Icon";
import { strings } from "../../data/strings";
import { Link } from "react-router-dom";
import styles from "./AnnouncementBar.module.css";

const DISMISSED_KEY = "alarrab:announcement-dismissed";

export function AnnouncementBar() {
  const [visible, setVisible] = useState(
    () => window.localStorage.getItem(DISMISSED_KEY) !== "true",
  );

  if (!visible) return null;
  return (
    <aside className={styles.bar}>
      <p>
        {strings.announcement} ·{" "}
        <Link to="/register">{strings.home.announcementLink}</Link>
      </p>
      <button
        aria-label="إغلاق الإعلان"
        className={styles.close}
        onClick={() => {
          window.localStorage.setItem(DISMISSED_KEY, "true");
          setVisible(false);
        }}
        type="button"
      >
        <Icon name="close" />
      </button>
    </aside>
  );
}
