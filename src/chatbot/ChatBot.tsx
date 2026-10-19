import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { askAI, type AIHistoryMessage } from "./engine/aiClient";
import { lockPageScroll } from "./chatScrollLock";
import { Icon } from "../components/ui/Icon";
import { useOptionalAuth } from "../features/auth/AuthContext";
import {
  createAIConversation,
  deleteAIConversation,
  listAIConversations,
  loadAIMessages,
  renameAIConversation,
  saveAIMessage,
  type AIConversation,
} from "../services/aiConversationService";
import styles from "./ChatBot.module.css";

interface ChatMessage {
  id: number;
  role: "assistant" | "student";
  text: string;
  link?: { label: string; href: string };
  source?: "ai";
}

const storageKey = "alarrab:local-chat:messages:v1";
const welcomeMessage =
  "أهلًا بيك! أنا ديب بوت AI، مساعدك في تعلّم English واستخدام المنصة. هشرحلك بالعربي، ومحتوى الدروس والأمثلة هيكون بالإنجليزي.";
function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  if (
    typeof message.id !== "number" ||
    (message.role !== "assistant" && message.role !== "student") ||
    typeof message.text !== "string" ||
    (message.role === "assistant" &&
      message.source !== "ai" &&
      message.text !== welcomeMessage) ||
    (message.source !== undefined && message.source !== "ai")
  ) {
    return false;
  }
  return (
    message.link === undefined ||
    (typeof message.link === "object" &&
      message.link !== null &&
      typeof (message.link as Record<string, unknown>).label === "string" &&
      typeof (message.link as Record<string, unknown>).href === "string" &&
      ((message.link as Record<string, unknown>).href as string).startsWith(
        "/",
      ) &&
      !((message.link as Record<string, unknown>).href as string).startsWith(
        "//",
      ))
  );
}

function readConversation(): { messages: ChatMessage[]; warning: string } {
  const welcome = [{ id: 0, role: "assistant" as const, text: welcomeMessage }];
  try {
    const serialized = window.localStorage.getItem(storageKey);
    if (!serialized) return { messages: welcome, warning: "" };
    const saved: unknown = JSON.parse(serialized);
    if (
      !Array.isArray(saved) ||
      saved.length === 0 ||
      saved.length > 100 ||
      !saved.every(isChatMessage)
    ) {
      return {
        messages: welcome,
        warning: "تعذر استعادة المحادثة المحفوظة؛ ابدأ محادثة جديدة.",
      };
    }
    return { messages: saved, warning: "" };
  } catch {
    return {
      messages: welcome,
      warning: "تعذر قراءة المحادثة المحفوظة من هذا المتصفح.",
    };
  }
}

export function ChatBot() {
  const auth = useOptionalAuth();
  const userId = auth?.user?.id;
  const [initialConversation] = useState(() => readConversation());
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialConversation.messages,
  );
  const [storageWarning, setStorageWarning] = useState(
    initialConversation.warning,
  );
  const [isTyping, setIsTyping] = useState(false);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const nextMessageId = useRef(
    Math.max(0, ...initialConversation.messages.map((message) => message.id)) +
      1,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | undefined>(undefined);
  const requestSequence = useRef(0);
  const requestInFlight = useRef(false);

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setConversationId(null);
      return;
    }
    let active = true;
    setHistoryLoading(true);
    void listAIConversations(userId)
      .then(async (items) => {
        if (!active) return;
        if (items.length === 0) {
          const created = await createAIConversation(userId, "محادثة جديدة");
          if (!active) return;
          setConversations([created]);
          setConversationId(created.id);
          return;
        }
        setConversations(items);
        setConversationId(items[0]?.id ?? null);
      })
      .catch((error: unknown) =>
        console.error("Unable to load AI conversation history.", error),
      )
      .finally(() => active && setHistoryLoading(false));
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !conversationId) return;
    let active = true;
    void loadAIMessages(userId, conversationId)
      .then((stored) => {
        if (!active || stored.length === 0) return;
        setMessages(
          stored.map((message, index) => ({
            id: index,
            role: message.role,
            text: message.text,
            ...(message.source ? { source: message.source } : {}),
          })),
        );
      })
      .catch((error: unknown) =>
        console.error("Unable to load selected AI conversation.", error),
      );
    return () => {
      active = false;
    };
  }, [conversationId, userId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages));
      setStorageWarning((current) =>
        current === "تعذر حفظ المحادثة في هذا المتصفح." ? "" : current,
      );
    } catch {
      setStorageWarning("تعذر حفظ المحادثة في هذا المتصفح.");
    }
  }, [messages]);

  useEffect(
    () => () => {
      requestSequence.current += 1;
      if (typingTimer.current !== undefined) {
        window.clearTimeout(typingTimer.current);
      }
    },
    [],
  );

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

  useEffect(() => {
    if (!open) return undefined;
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
    if (!text || requestInFlight.current) return;

    requestInFlight.current = true;
    const studentMessage: ChatMessage = {
      id: nextMessageId.current++,
      role: "student",
      text,
    };
    if (userId && conversationId) {
      void saveAIMessage(userId, conversationId, {
        role: "student",
        text,
        source: null,
      }).catch((error: unknown) =>
        console.error("Unable to save AI question.", error),
      );
      if (messages.length <= 1) {
        const title = text.replace(/\s+/gu, " ").slice(0, 42);
        void renameAIConversation(userId, conversationId, title).catch(
          (error: unknown) =>
            console.error("Unable to name AI conversation.", error),
        );
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, title }
              : conversation,
          ),
        );
      }
    }
    const requestId = ++requestSequence.current;
    setMessages((current) => [...current, studentMessage]);
    setQuestion("");
    setIsTyping(true);

    typingTimer.current = window.setTimeout(() => {
      typingTimer.current = undefined;
      void (async () => {
        try {
          if (requestSequence.current !== requestId) return;
          const history: AIHistoryMessage[] = messages
            .filter(
              (message) =>
                message.role === "student" || message.source === "ai",
            )
            .slice(-6)
            .map((message) => ({
              role: message.role === "student" ? "user" : "model",
              text: message.text,
            }));
          const result = await askAI(text, history);
          if (requestSequence.current !== requestId) return;
          const assistantMessage: ChatMessage =
            "reply" in result
              ? {
                  id: nextMessageId.current++,
                  role: "assistant",
                  text: result.reply,
                  source: "ai",
                }
              : {
                  id: nextMessageId.current++,
                  role: "assistant",
                  text:
                    result.error === "rate_limit"
                      ? "الخدمة الذكية مشغولة حاليًا. حاول مرة أخرى بعد قليل."
                      : "تعذر الوصول إلى خدمة الذكاء الاصطناعي. تحقق من الاتصال وحاول مرة أخرى.",
                };
          setMessages((current) => [...current, assistantMessage]);
          if (userId && conversationId && "reply" in result) {
            void saveAIMessage(userId, conversationId, {
              role: "assistant",
              text: result.reply,
              source: "ai",
            }).catch((error: unknown) =>
              console.error("Unable to save AI reply.", error),
            );
          }
        } catch (error: unknown) {
          if (requestSequence.current !== requestId) return;
          console.error("Unable to complete external AI chatbot request.", error);
          setMessages((current) => [
            ...current,
            {
              id: nextMessageId.current++,
              role: "assistant",
              text: "تعذر الوصول إلى خدمة الذكاء الاصطناعي. تحقق من الاتصال وحاول مرة أخرى.",
            },
          ]);
        } finally {
          if (requestSequence.current === requestId) {
            requestInFlight.current = false;
            setIsTyping(false);
          }
        }
      })();
    }, 650);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendQuestion(question);
  }

  async function startNewConversation() {
    if (!userId) return;
    try {
      const created = await createAIConversation(userId, "محادثة جديدة");
      setConversations((current) => [created, ...current]);
      setConversationId(created.id);
      setMessages([{ id: 0, role: "assistant", text: welcomeMessage }]);
    } catch (error) {
      console.error("Unable to create AI conversation.", error);
    }
  }

  async function removeConversation(id: string) {
    if (!userId) return;
    try {
      await deleteAIConversation(userId, id);
      const remaining = conversations.filter((item) => item.id !== id);
      setConversations(remaining);
      if (conversationId === id) {
        setConversationId(remaining[0]?.id ?? null);
        setMessages([{ id: 0, role: "assistant", text: welcomeMessage }]);
      }
    } catch (error) {
      console.error("Unable to delete AI conversation.", error);
    }
  }

  function clearConversation() {
    requestSequence.current += 1;
    requestInFlight.current = false;
    if (typingTimer.current !== undefined) {
      window.clearTimeout(typingTimer.current);
      typingTimer.current = undefined;
    }

    setIsTyping(false);
    setQuestion("");
    try {
      window.localStorage.removeItem(storageKey);
      setStorageWarning("");
    } catch {
      setStorageWarning("تعذر مسح المحادثة المحفوظة من هذا المتصفح.");
    }
    setMessages([
      { id: nextMessageId.current++, role: "assistant", text: welcomeMessage },
    ]);
    inputRef.current?.focus();
  }

  const lastMessage = messages.at(-1);

  return (
    <div className={styles.widget} dir="rtl">
      {open && (
        <section
          aria-label="ديب بوت AI"
          aria-modal="false"
          className={styles.panel}
          role="dialog"
        >
          <header className={styles.header}>
            <span className={styles.avatar}>
              <Icon name="chat" />
            </span>
            <div className={styles.headerCopy}>
              <h2>ديب بوت AI</h2>
              <span>
                <i aria-hidden="true" />
                متاح الآن · مساعد الذكاء الاصطناعي
              </span>
            </div>
            <button
              aria-label="مسح المحادثة"
              className={styles.headerButton}
              onClick={clearConversation}
              title="مسح المحادثة"
              type="button"
            >
              <Icon name="trash" />
            </button>
            <button
              aria-label="إغلاق المحادثة"
              className={styles.headerButton}
              onClick={() => setOpen(false)}
              title="إغلاق"
              type="button"
            >
              <Icon name="close" />
            </button>
          </header>
          {userId && (
            <div className={styles.conversationBar}>
              <button type="button" onClick={startNewConversation}>
                <Icon name="plus" /> محادثة جديدة
              </button>
              {historyLoading ? (
                <span>جاري تحميل المحادثات...</span>
              ) : (
                <select
                  aria-label="اختر محادثة"
                  value={conversationId ?? ""}
                  onChange={(event) => setConversationId(event.target.value)}
                >
                  {conversations.map((conversation) => (
                    <option key={conversation.id} value={conversation.id}>
                      {conversation.title}
                    </option>
                  ))}
                </select>
              )}
              {conversationId && (
                <button
                  aria-label="حذف المحادثة الحالية"
                  type="button"
                  onClick={() => void removeConversation(conversationId)}
                >
                  <Icon name="trash" />
                </button>
              )}
            </div>
          )}

          <div
            aria-label="رسائل المحادثة"
            aria-live="polite"
            className={styles.messages}
            ref={logRef}
            role="log"
          >
            {messages.map((message) => (
              <article
                className={`${styles.message} ${
                  message.role === "student"
                    ? styles.studentMessage
                    : styles.assistantMessage
                }`}
                key={message.id}
              >
                {message.source === "ai" && (
                  <span className={styles.aiBadge}>
                    <Icon name="spark" />
                    إجابة ذكية
                  </span>
                )}
                <p>{message.text}</p>
                {message.link && (
                  <Link className={styles.answerLink} to={message.link.href}>
                    {message.link.label}
                    <Icon name="arrow" />
                  </Link>
                )}
              </article>
            ))}
            {isTyping && (
              <div
                aria-label="ديب بوت AI يكتب الآن"
                className={styles.typingIndicator}
                role="status"
              >
                <span />
                <span />
                <span />
                <span className={styles.srOnly}>يكتب الآن...</span>
              </div>
            )}
            {!isTyping && lastMessage?.role === "assistant" && (
              <div aria-label="أسئلة مقترحة" className={styles.suggestions}>
                <span>
                  اكتب سؤالك مباشرة إلى ديب بوت AI
                </span>
              </div>
            )}
          </div>

          <form className={styles.composer} onSubmit={handleSubmit}>
            <label className={styles.srOnly} htmlFor="local-chat-question">
              اكتب سؤالك
            </label>
            <input
              autoComplete="off"
              id="local-chat-question"
              maxLength={300}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="اكتب سؤالك هنا..."
              ref={inputRef}
              value={question}
            />
            <button
              aria-label="إرسال السؤال"
              className={styles.sendButton}
              disabled={!question.trim() || isTyping}
              type="submit"
            >
              <Icon name="send" />
            </button>
          </form>
          {storageWarning && (
            <p
              aria-live="polite"
              className={styles.storageWarning}
              role="status"
            >
              {storageWarning}
            </p>
          )}
          <p className={styles.localNote}>
            الإجابات الذكية آلية وقد تحتاج مراجعة؛ لا تكتب بيانات شخصية أو سرية.
          </p>
        </section>
      )}

      <button
        aria-expanded={open}
        aria-label={open ? "إغلاق ديب بوت AI" : "فتح ديب بوت AI"}
        className={styles.launcher}
        onClick={() => setOpen((current) => !current)}
        title="ديب بوت AI"
        type="button"
      >
        {open ? (
          <Icon name="close" />
        ) : (
          <Icon name="chat" />
        )}
        <span className={styles.launcherLabel}>
          {open ? "إغلاق" : "ديب بوت AI"}
        </span>
      </button>
    </div>
  );
}
