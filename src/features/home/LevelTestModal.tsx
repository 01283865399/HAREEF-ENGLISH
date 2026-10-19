import { useState } from "react";
import { strings } from "../../data/strings";
import { usePlatform } from "../auth/PlatformContext";
import { getLevelTest } from "../../services/courseService";
import { placementLevelLabel } from "../../data/coursePresentation";
import { recommendTrack } from "../../services/progressService";
import { useAsyncData } from "../../hooks/useAsyncData";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { ProgressBar } from "../../components/ui/ProgressBar";
import styles from "./LevelTestModal.module.css";

interface LevelTestModalProps {
  open: boolean;
  onClose: () => void;
}

export function LevelTestModal({ open, onClose }: LevelTestModalProps) {
  const { data: quiz, loading, error, retry } = useAsyncData(getLevelTest);
  const { saveLevelTest } = usePlatform();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [complete, setComplete] = useState(false);
  const questions = quiz?.questions ?? [];
  const question = questions[step];
  const score = questions.reduce(
    (sum, current, index) => sum + (answers[index] === current.answer ? 1 : 0),
    0,
  );
  const track = recommendTrack(score);

  return (
    <Modal
      labelledBy="level-test-title"
      onClose={() => {
        onClose();
        setStep(0);
        setAnswers([]);
        setComplete(false);
      }}
      open={open}
      title={strings.home.levelTest}
    >
      <div className={styles.content}>
        {loading ? (
          <div
            aria-label={strings.actions.loading}
            className={styles.skeleton}
          />
        ) : error ? (
          <div role="alert">
            <p>{error}</p>
            <Button onClick={retry} type="button" variant="secondary">
              {strings.actions.retry}
            </Button>
          </div>
        ) : complete ? (
          <div className={styles.result} aria-live="polite">
            <span className={styles.score}>
              {score} / {questions.length}
            </span>
            <p>
              المستوى المقترح: <strong>{placementLevelLabel(track)}</strong>
            </p>
            <Button
              onClick={() => {
                saveLevelTest(score, track);
                onClose();
              }}
              type="button"
            >
              حفظ النتيجة
            </Button>
          </div>
        ) : question ? (
          <>
            <div className={styles.progress}>
              <span>
                السؤال {step + 1} من {questions.length}
              </span>
              <ProgressBar value={((step + 1) / questions.length) * 100} />
            </div>
            <h3>{question.question}</h3>
            <fieldset className={styles.options}>
              <legend className="srOnly">اختر إجابة واحدة</legend>
              {question.options.map((option, index) => (
                <label
                  className={answers[step] === index ? styles.selected : ""}
                  key={`${option}-${index}`}
                >
                  <input
                    checked={answers[step] === index}
                    name={`level-question-${step}`}
                    onChange={() =>
                      setAnswers((current) => {
                        const next = [...current];
                        next[step] = index;
                        return next;
                      })
                    }
                    type="radio"
                    value={index}
                  />
                  {option}
                </label>
              ))}
            </fieldset>
            <div className={styles.controls}>
              <Button
                disabled={step === 0}
                onClick={() => setStep((value) => value - 1)}
                type="button"
                variant="secondary"
              >
                السابق
              </Button>
              <Button
                disabled={answers[step] === undefined}
                onClick={() => {
                  if (step === questions.length - 1) setComplete(true);
                  else setStep((value) => value + 1);
                }}
                type="button"
              >
                {step === questions.length - 1 ? "عرض النتيجة" : "التالي"}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
