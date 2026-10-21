import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/ui/Icon";
import { createAnswer } from "./engine/responder";
import { matchFaqDetailed } from "./engine/matcher";
import { lockPageScroll } from "./chatScrollLock";
import styles from "./LocalGuideBot.module.css";

interface GuideMessage {
  id: number;
  role: "guide" | "student";
  text: string;
  link?: { label: string; href: string };
  suggestions?: string[];
}

interface Position {
  x: number;
  y: number;
}

const positionKey = "mr-mahmoud:guide:position:v1";
const messagesKey = "mr-mahmoud:guide:messages:v1";
const welcome =
  "أهلًا بيك! أنا مساعدك في English وفي استخدام المنصة. أساعدك في الكورسات والحساب، وأشرحلك القواعد. اختار سؤال أو اكتب اللي محتاجه.";
const quickQuestions = [
  "كيف أشترك في كورس؟",
  "مين مطور المنصة؟",
  "اشرحلي present simple",
];
const developerAnswer =
  "المهندس أحمد ديب هو مطوّر المنصة. طالب في كلية هندسة الذكاء الاصطناعي وعلوم الحاسوب، ومطوّر Full Stack بيبني منصات ومواقع تعليمية ومتاجر إلكترونية.";
const developerLink = {
  label: "تعرّف على المطوّر",
  href: "/about-developer",
};

function isDeveloperQuestion(value: string): boolean {
  const normalized = value
    .replace(/[أإآ]/gu, "ا")
    .replace(/[ى]/gu, "ي")
    .replace(/[ة]/gu, "ه")
    .toLocaleLowerCase("ar");
  const developerTitle = /(مطور|مبرمج|صانع|منشئ|مصمم|صاحب)/u.test(normalized);
  const platformCreation =
    /(عمل|انشا|انشئ)/u.test(normalized) &&
    /(منصه|موقع|تطبيق|مستر محمود|من عمل|مين عمل)/u.test(normalized);
  return developerTitle || platformCreation;
}

function readPosition(): Position {
  try {
    const value = JSON.parse(
      localStorage.getItem(positionKey) ?? "null",
    ) as Partial<Position> | null;
    if (typeof value?.x === "number" && typeof value.y === "number") {
      return { x: value.x, y: value.y };
    }
  } catch {
    // Use the default position when storage is unavailable.
  }
  return { x: 0, y: 0 };
}

function readMessages(): GuideMessage[] {
  try {
    const saved = JSON.parse(localStorage.getItem(messagesKey) ?? "null");
    if (
      Array.isArray(saved) &&
      saved.length > 0 &&
      saved.every(
        (message) =>
          message &&
          (message.role === "guide" || message.role === "student") &&
          typeof message.text === "string",
      )
    ) {
      return saved;
    }
  } catch {
    // Start with a fresh guide conversation when storage is unavailable.
  }
  return [{ id: 0, role: "guide", text: welcome }];
}

export function LocalGuideBot() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<GuideMessage[]>(readMessages);
  const [position, setPosition] = useState(readPosition);
  const [isTyping, setIsTyping] = useState(false);
  const nextId = useRef(1);
  const dragging = useRef(false);
  const moved = useRef(false);
  const start = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const answerTimer = useRef<number | undefined>(undefined);
  const requestSequence = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(positionKey, JSON.stringify(position));
    } catch {
      // Position persistence is optional.
    }
  }, [position]);

  useEffect(() => {
    try {
      localStorage.setItem(messagesKey, JSON.stringify(messages));
    } catch {
      // Conversation persistence is optional.
    }
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo?.({
      top: logRef.current.scrollHeight,
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
        ? "auto"
        : "smooth",
    });
  }, [messages, open, isTyping]);

  useEffect(
    () => () => {
      requestSequence.current += 1;
      if (answerTimer.current !== undefined) {
        window.clearTimeout(answerTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const unlockPageScroll = lockPageScroll();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      unlockPageScroll();
    };
  }, [open]);

  function sendQuestion(value: string) {
    const text = value.trim();
    if (!text || isTyping) return;
    setQuestion("");
    setIsTyping(true);
    const requestId = ++requestSequence.current;
    setMessages((current) => [
      ...current,
      { id: nextId.current++, role: "student", text },
    ]);
    answerTimer.current = window.setTimeout(async () => {
      answerTimer.current = undefined;
      try {
        const { localFaqs } = await import("./data");
        if (requestSequence.current !== requestId) return;
        const match = matchFaqDetailed(text, localFaqs);
        const answer = isDeveloperQuestion(text)
          ? {
              answer: developerAnswer,
              link: developerLink,
              followUps: ["إزاي أتواصل مع المطوّر؟", "إزاي أستخدم المنصة؟"],
            }
          : createAnswer(match.best?.faq ?? null);
        if (requestSequence.current !== requestId) return;
        setMessages((current) => [
          ...current,
          {
            id: nextId.current++,
            role: "guide",
            text: answer.answer,
            ...(answer.link ? { link: answer.link } : {}),
            suggestions: answer.followUps.slice(0, 3),
          },
        ]);
      } catch (error) {
        console.error("Unable to answer platform guide question.", error);
        if (requestSequence.current === requestId) {
          setMessages((current) => [
            ...current,
            {
              id: nextId.current++,
              role: "guide",
              text: "حصلت مشكلة وأنا بجهّز الإجابة. جرّب السؤال تاني من فضلك.",
              suggestions: quickQuestions,
            },
          ]);
        }
      } finally {
        if (requestSequence.current === requestId) setIsTyping(false);
      }
    }, 350);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendQuestion(question);
  }

  function pointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    moved.current = false;
    dragging.current = true;
    start.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: position.x,
      y: position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return;
    const dx = event.clientX - start.current.pointerX;
    const dy = event.clientY - start.current.pointerY;
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
    moved.current = true;
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({
      x: Math.min(
        window.innerWidth - rect.left - rect.width,
        Math.max(-rect.left, start.current.x + dx),
      ),
      y: Math.min(
        window.innerHeight - rect.top - rect.height,
        Math.max(-rect.top, start.current.y + dy),
      ),
    });
  }

  function pointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const latestMessage = messages.at(-1);
  const suggestions =
    latestMessage?.role === "guide" && latestMessage.suggestions?.length
      ? latestMessage.suggestions
      : quickQuestions;

  return (
    <div className={styles.widget} dir="rtl">
      {open && (
        <section
          className={styles.panel}
          role="dialog"
          aria-label="مرشد المنصة"
        >
          <header className={styles.header}>
            <span className={styles.avatar}>
              <Icon name="book" />
            </span>
            <div>
              <h2>مرشد المنصة</h2>
              <small className={styles.status}>
                <i aria-hidden="true" />
                مساعد فوري للموقع
              </small>
            </div>
            <button
              aria-label="مسح محادثة مرشد المنصة"
              className={styles.close}
              title="ابدأ محادثة جديدة"
              onClick={() => {
                requestSequence.current += 1;
                if (answerTimer.current !== undefined) {
                  window.clearTimeout(answerTimer.current);
                  answerTimer.current = undefined;
                }
                setIsTyping(false);
                setMessages([{ id: 0, role: "guide", text: welcome }]);
              }}
              type="button"
            >
              <Icon name="trash" />
            </button>
            <button
              aria-label="إغلاق مرشد المنصة"
              className={styles.close}
              onClick={() => setOpen(false)}
              type="button"
            >
              <Icon name="close" />
            </button>
          </header>
          <div
            className={styles.messages}
            ref={logRef}
            role="log"
            aria-label="رسائل مرشد المنصة"
          >
            {messages.map((message) => (
              <article
                className={
                  message.role === "student"
                    ? styles.studentMessage
                    : styles.guideMessage
                }
                key={message.id}
              >
                <p>{message.text}</p>
                {message.link && (
                  <Link to={message.link.href}>
                    {message.link.label}
                    <Icon name="arrow" />
                  </Link>
                )}
              </article>
            ))}
            {isTyping && (
              <div
                aria-label="مرشد المنصة بيكتب"
                className={styles.typing}
                role="status"
              >
                <span />
                <span />
                <span />
              </div>
            )}
            {!isTyping && (
              <div className={styles.suggestions}>
                <span>جرّب أن تسأل</span>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendQuestion(suggestion)}
                    type="button"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <form className={styles.composer} onSubmit={submit}>
            <input
              aria-label="اكتب سؤالك"
              disabled={isTyping}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="اكتب سؤالك هنا..."
              ref={inputRef}
              value={question}
            />
            <button
              aria-label="إرسال السؤال"
              disabled={!question.trim() || isTyping}
              type="submit"
            >
              <Icon name="send" />
            </button>
          </form>
        </section>
      )}
      <div className={styles.launcherWrap}>
        {!open && <span className={styles.launcherHint}>محتاج مساعدة؟</span>}
        <button
          aria-expanded={open}
          aria-label={open ? "إغلاق مرشد المنصة" : "فتح مرشد المنصة"}
          className={styles.launcher}
          onClick={() => {
            if (!moved.current) setOpen((current) => !current);
            moved.current = false;
          }}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          type="button"
        >
          {open ? <Icon name="close" /> : <Icon name="book" />}
          <span className={styles.launcherLabel}>
            {open ? "إغلاق" : "مرشد المنصة"}
          </span>
        </button>
      </div>
    </div>
  );
}
