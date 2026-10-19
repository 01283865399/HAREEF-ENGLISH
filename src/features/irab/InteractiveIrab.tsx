import { useState } from "react";
import { strings } from "../../data/strings";
import { getIrabSentences } from "../../services/courseService";
import { useAsyncData } from "../../hooks/useAsyncData";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Pattern } from "../../components/ui/Pattern";
import styles from "./InteractiveIrab.module.css";

export function InteractiveIrab() {
  const { data, loading, error, retry } = useAsyncData(getIrabSentences);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState<number | null>(null);
  const sentences = data ?? [];
  const sentence = sentences[sentenceIndex] ?? null;
  const selectedWord =
    typeof wordIndex === "number" && sentence
      ? (sentence.words[wordIndex] ?? null)
      : null;

  return (
    <article className={styles.card}>
      <Pattern />
      <div className={styles.content}>
        <span className={styles.chip}>{strings.home.interactiveIrab}</span>
        {loading ? (
          <div
            aria-label="جارٍ تحميل أمثلة الإعراب"
            className={styles.loading}
          />
        ) : error ? (
          <div className={styles.state} role="alert">
            <p>{error}</p>
            <Button compact onClick={retry} type="button" variant="secondary">
              {strings.actions.retry}
            </Button>
          </div>
        ) : sentence ? (
          <>
            <div aria-label={sentence.text} className={styles.sentence}>
              {sentence.words.map((word, index) => (
                <button
                  aria-pressed={wordIndex === index}
                  className={`${styles.word}${wordIndex === index ? ` ${styles.selected}` : ""}`}
                  key={`${sentenceIndex}-${word.text}-${index}`}
                  onClick={() => setWordIndex(index)}
                  type="button"
                >
                  {word.text}
                </button>
              ))}
            </div>
            <div aria-live="polite" className={styles.roles}>
              {sentence.words.map((word, index) => (
                <span key={`${word.text}-${index}`}>{word.role}</span>
              ))}
            </div>
            <div className={styles.hint}>
              {selectedWord
                ? `${selectedWord.role}: ${selectedWord.reason}`
                : strings.home.irabHint}
            </div>
            {sentences.length > 1 && (
              <div className={styles.controls}>
                <Button
                  aria-label="الجملة السابقة"
                  compact
                  onClick={() => {
                    setSentenceIndex(
                      (index) =>
                        (index + sentences.length - 1) % sentences.length,
                    );
                    setWordIndex(null);
                  }}
                  type="button"
                  variant="quiet"
                >
                  <Icon name="arrow" />
                </Button>
                <span>
                  {sentenceIndex + 1} / {sentences.length}
                </span>
                <Button
                  aria-label="الجملة التالية"
                  compact
                  onClick={() => {
                    setSentenceIndex((index) => (index + 1) % sentences.length);
                    setWordIndex(null);
                  }}
                  type="button"
                  variant="quiet"
                >
                  <Icon name="arrow" />
                </Button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </article>
  );
}
