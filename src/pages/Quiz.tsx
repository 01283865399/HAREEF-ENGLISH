import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { Icon } from "../components/ui/Icon";
import { ProgressBar } from "../components/ui/ProgressBar";
import { usePlatform } from "../features/auth/PlatformContext";
import { useAsyncData } from "../hooks/useAsyncData";
import { getLessonQuiz } from "../services/courseService";
import styles from "./Quiz.module.css";

const answerLetters = ["أ", "ب", "ج", "د"];

export function QuizPage() {
  const { data: quiz, loading, error, retry } = useAsyncData(getLessonQuiz);
  const { saveScore } = usePlatform();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!quiz || submitted) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [quiz, submitted]);

  if (loading)
    return <div className={styles.state}>جارٍ تحميل الاختبار...</div>;
  if (error)
    return (
      <div className={styles.state} role="alert">
        <p>{error}</p>
        <Button onClick={retry} type="button">
          إعادة المحاولة
        </Button>
      </div>
    );
  if (!quiz || !quiz.questions.length) {
    return <div className={styles.state}>لا توجد أسئلة متاحة حاليًا.</div>;
  }

  const quizId = quiz.id;
  const question = quiz.questions[currentIndex];
  if (!question) return null;
  const score = quiz.questions.reduce(
    (total, item, index) => total + (answers[index] === item.answer ? 1 : 0),
    0,
  );
  const answeredCount = Object.keys(answers).length;
  const minutes = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");

  function submitQuiz() {
    saveScore(quizId, score);
    setSubmitted(true);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>اختبر فهمك</span>
          <h2>اختبار الدرس</h2>
          <p>أجب عن الأسئلة ثم احفظ نتيجتك.</p>
        </div>
        <div className={styles.headerChips}>
          <Chip>
            <Icon name="file" /> {answeredCount} من {quiz.questions.length}
          </Chip>
          <Chip gold>
            <Icon name="clock" /> {minutes}:{seconds}
          </Chip>
        </div>
      </header>

      {submitted ? (
        <Card className={styles.resultCard}>
          <span className={styles.resultIcon}>
            <Icon name="check" />
          </span>
          <span className={styles.eyebrow}>اكتمل الاختبار</span>
          <h2>
            نتيجتك {score} من {quiz.questions.length}
          </h2>
          <p>تم حفظ أفضل نتيجة لك في لوحة الطالب.</p>
          <Button
            onClick={() => {
              setAnswers({});
              setCurrentIndex(0);
              setSecondsLeft(20 * 60);
              setSubmitted(false);
            }}
            type="button"
          >
            إعادة المحاولة
          </Button>
        </Card>
      ) : (
        <>
          <div className={styles.progressRow}>
            <span>
              السؤال {currentIndex + 1} من {quiz.questions.length}
            </span>
            <ProgressBar
              value={(answeredCount / quiz.questions.length) * 100}
            />
          </div>

          <Card className={styles.questionCard}>
            <div className={styles.questionHeading}>
              <span className={styles.questionNumber}>
                {String(currentIndex + 1).padStart(2, "0")}
              </span>
              <h3>{question.question}</h3>
            </div>
            <div aria-label="الاختيارات" className={styles.options}>
              {question.options.map((option, index) => (
                <button
                  aria-pressed={answers[currentIndex] === index}
                  className={`${styles.option}${answers[currentIndex] === index ? ` ${styles.selected}` : ""}`}
                  key={`${option}-${index}`}
                  onClick={() =>
                    setAnswers((current) => ({
                      ...current,
                      [currentIndex]: index,
                    }))
                  }
                  type="button"
                >
                  <span className={styles.optionLetter}>
                    {answerLetters[index] ?? index + 1}
                  </span>
                  <span>{option}</span>
                </button>
              ))}
            </div>
            <div className={styles.controls}>
              <Button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((index) => index - 1)}
                type="button"
                variant="outline"
              >
                <Icon name="arrow" /> السابق
              </Button>
              {currentIndex < quiz.questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentIndex((index) => index + 1)}
                  type="button"
                >
                  التالي <Icon name="arrow" />
                </Button>
              ) : (
                <Button
                  disabled={answeredCount !== quiz.questions.length}
                  onClick={submitQuiz}
                  type="button"
                >
                  إنهاء الاختبار
                </Button>
              )}
            </div>
          </Card>

          <Card className={styles.questionMap}>
            <h3>خريطة الأسئلة</h3>
            <div className={styles.questionNumbers}>
              {quiz.questions.map((item, index) => (
                <button
                  aria-current={currentIndex === index ? "step" : undefined}
                  aria-label={`السؤال ${index + 1}`}
                  className={[
                    styles.mapButton,
                    answers[index] !== undefined ? styles.answered : "",
                    currentIndex === index ? styles.current : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={`${item.question}-${index}`}
                  onClick={() => setCurrentIndex(index)}
                  type="button"
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </main>
  );
}
