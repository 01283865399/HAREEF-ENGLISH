import { useRef, type KeyboardEvent, type ReactNode } from "react";
import styles from "./Tabs.module.css";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function Tabs({ items, activeId, onChange }: TabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  if (!items.length) return null;
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step =
      event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowRight" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (activeIndex + step + items.length) % items.length;
    const nextItem = items[next];
    if (!nextItem) return;
    onChange(nextItem.id);
    refs.current[next]?.focus();
  };
  const activeItem = items.find((item) => item.id === activeId);

  return (
    <section>
      <div className={styles.list} role="tablist" aria-label="محتوى الصفحة">
        {items.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            id={`tab-${item.id}`}
            className={`${styles.tab} ${activeId === item.id ? styles.active : ""}`}
            type="button"
            role="tab"
            aria-selected={activeId === item.id}
            aria-controls={`panel-${item.id}`}
            tabIndex={activeId === item.id ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={onKeyDown}
          >
            {item.label}
          </button>
        ))}
      </div>
      {activeItem ? (
        <div
          id={`panel-${activeItem.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeItem.id}`}
          tabIndex={0}
        >
          {activeItem.content}
        </div>
      ) : null}
    </section>
  );
}
