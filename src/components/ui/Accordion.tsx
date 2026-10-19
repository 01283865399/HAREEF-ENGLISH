import { useState } from "react";
import type { FaqItem } from "../../types/domain";
import styles from "./Accordion.module.css";

interface AccordionProps {
  items: FaqItem[];
}

export function Accordion({ items }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className={styles.list}>
      {items.map((item, index) => {
        const open = openIndex === index;
        const panelId = `faq-panel-${index}`;
        return (
          <article className={styles.item} key={`${item.question}-${index}`}>
            <h3>
              <button
                className={styles.question}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
                type="button"
              >
                <span>{item.question}</span>
                <span
                  className={`${styles.plus} ${open ? styles.minus : ""}`}
                  aria-hidden="true"
                >
                  +
                </span>
              </button>
            </h3>
            {open ? (
              <div className={styles.answer} id={panelId} role="region">
                {item.answer}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
