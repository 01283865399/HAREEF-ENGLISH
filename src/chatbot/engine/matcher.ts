import type { ChatFaqEntry } from "../data/types";
import { detectIntent, type ChatIntent } from "./intent";
import {
  normalizeChatText,
  normalizeForMatching,
  normalizeTokens,
} from "./normalize";
import { expandSynonyms, getSynonyms } from "./synonyms";

export const MATCH_WEIGHTS = Object.freeze({
  exactPhrase: 0.3,
  keywordOverlap: 0.26,
  tfidfCosine: 0.24,
  fuzzyText: 0.15,
  intent: 0.05,
});

export const MATCH_THRESHOLDS = Object.freeze({
  high: 0.55,
  medium: 0.3,
  minimum: 0.19,
});

const STOP_WORDS = new Set([
  "ازاي",
  "كيف",
  "هل",
  "ما",
  "ماذا",
  "من",
  "في",
  "على",
  "عن",
  "الي",
  "و",
  "او",
  "عايز",
  "اريد",
  "ممكن",
  "لو",
  "هو",
  "هي",
  "ده",
  "دي",
  "دا",
  "مع",
  "بعد",
  "قبل",
  "انا",
  "انت",
  "احنا",
  "ايه",
  "يعني",
  "اعمل",
  "اعرف",
  "عاوزه",
  "محتاج",
  "ماهو",
  "ماهي",
  "طب",
  "طيب",
  "بقى",
  "بس",
  "جدا",
  "سؤال",
  "سءال",
  "استفسار",
  "معني",
  "المقصود",
  "مهم",
  "توضح",
  "سمحت",
  "عندي",
  "لي",
  "طريقه",
  "عمل",
  "ارغب",
  "معرفه",
]);

const CONFUSABLE_LETTERS: Record<string, string> = {
  ض: "ظ",
  ظ: "ض",
  س: "ص",
  ص: "س",
  ت: "ط",
  ط: "ت",
  ذ: "ز",
  ز: "ذ",
  ه: "ة",
  ة: "ه",
  ي: "ى",
  ى: "ي",
  ا: "ء",
  أ: "ء",
  إ: "ء",
  آ: "ء",
};

interface IndexedFaq {
  faq: ChatFaqEntry;
  phrases: string[];
  normalizedDocument: string;
  tokens: Set<string>;
  tokenStems: Set<string>;
  intents: ChatIntent[];
  bigrams: Set<string>;
  trigrams: Set<string>;
  vector: Map<string, number>;
  magnitude: number;
}

interface MatcherIndex {
  documents: IndexedFaq[];
  frequency: Map<string, number>;
  tokenPostings: Map<string, Set<IndexedFaq>>;
  stemPostings: Map<string, Set<IndexedFaq>>;
  bigramPostings: Map<string, Set<IndexedFaq>>;
  trigramPostings: Map<string, Set<IndexedFaq>>;
}

export interface FaqMatchCandidate {
  faq: ChatFaqEntry;
  score: number;
  confidence: "high" | "medium" | "low";
  intent: ReturnType<typeof detectIntent>;
}

export interface FaqMatchResult {
  best: FaqMatchCandidate | null;
  candidates: FaqMatchCandidate[];
  confidence: "high" | "medium" | "low";
  intent: ReturnType<typeof detectIntent>;
}

export interface UnmatchedQuestion {
  question: string;
  timestamp: string;
}

const indexCache = new WeakMap<ChatFaqEntry[], MatcherIndex>();
const unmatchedStorageKey = "alarrab:chatbot:unmatched:v1";
const unmatchedMemory: UnmatchedQuestion[] = [];

function terms(value: string): string[] {
  return normalizeTokens(value).filter(
    (token) => token.length > 1 && !STOP_WORDS.has(token),
  );
}

function stem(value: string): string {
  return normalizeForMatching(value)[3] ?? normalizeChatText(value);
}

function makeNgrams(value: string, size: number): Set<string> {
  const chars = [...value.replace(/\s+/gu, "")];
  const result = new Set<string>();
  for (let index = 0; index <= chars.length - size; index += 1) {
    result.add(chars.slice(index, index + size).join(""));
  }
  return result;
}

function idf(
  term: string,
  count: number,
  frequency: Map<string, number>,
): number {
  return Math.log(1 + count / (1 + (frequency.get(term) ?? 0)));
}

function addPosting<T>(
  postings: Map<string, Set<T>>,
  term: string,
  document: T,
): void {
  if (!postings.has(term)) postings.set(term, new Set());
  postings.get(term)?.add(document);
}

function getIndex(entries: ChatFaqEntry[]): MatcherIndex {
  const cached = indexCache.get(entries);
  if (cached) return cached;

  const documents = entries.map((faq) => {
    const phrases = [
      ...new Set(
        [...faq.patterns, ...faq.keywords].flatMap(normalizeForMatching),
      ),
    ];
    const tokens = new Set<string>();
    const tokenStems = new Set<string>();
    for (const phrase of phrases) {
      for (const token of terms(phrase)) {
        tokens.add(token);
        tokenStems.add(stem(token));
      }
    }
    const normalizedDocument = normalizeChatText(phrases.join(" "));
    const intentText = `${faq.id.replace(/[-_]/gu, " ")} ${faq.patterns.join(" ")}`;
    return {
      faq,
      phrases,
      normalizedDocument,
      tokens,
      tokenStems,
      intents: detectIntent(intentText).intents,
      bigrams: makeNgrams(normalizedDocument, 2),
      trigrams: makeNgrams(normalizedDocument, 3),
      vector: new Map<string, number>(),
      magnitude: 0,
    };
  });

  const frequency = new Map<string, number>();
  const tokenPostings = new Map<string, Set<IndexedFaq>>();
  const stemPostings = new Map<string, Set<IndexedFaq>>();
  const bigramPostings = new Map<string, Set<IndexedFaq>>();
  const trigramPostings = new Map<string, Set<IndexedFaq>>();
  for (const document of documents) {
    for (const token of document.tokens) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
      addPosting(tokenPostings, token, document);
    }
    for (const tokenStem of document.tokenStems) {
      addPosting(stemPostings, tokenStem, document);
    }
    for (const gram of document.bigrams)
      addPosting(bigramPostings, gram, document);
    for (const gram of document.trigrams)
      addPosting(trigramPostings, gram, document);
  }

  for (const document of documents) {
    for (const token of document.tokens) {
      const weight = idf(token, documents.length, frequency);
      document.vector.set(token, weight);
      document.magnitude += weight * weight;
    }
    document.magnitude = Math.sqrt(document.magnitude);
  }

  const result: MatcherIndex = {
    documents,
    frequency,
    tokenPostings,
    stemPostings,
    bigramPostings,
    trigramPostings,
  };
  indexCache.set(entries, result);
  return result;
}

function damerauLevenshtein(left: string, right: string): number {
  if (Math.abs(left.length - right.length) > 2) return 3;
  const rows = left.length + 1;
  const columns = right.length + 1;
  const matrix = Array.from({ length: rows }, () =>
    new Array<number>(columns).fill(0),
  );
  for (let row = 0; row < rows; row += 1) matrix[row]![0] = row;
  for (let column = 0; column < columns; column += 1)
    matrix[0]![column] = column;

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const leftChar = left[row - 1] ?? "";
      const rightChar = right[column - 1] ?? "";
      const substitution =
        leftChar === rightChar
          ? 0
          : CONFUSABLE_LETTERS[leftChar] === rightChar
            ? 0.35
            : 1;
      matrix[row]![column] = Math.min(
        matrix[row - 1]![column]! + 1,
        matrix[row]![column - 1]! + 1,
        matrix[row - 1]![column - 1]! + substitution,
      );
      if (
        row > 1 &&
        column > 1 &&
        leftChar === right[column - 2] &&
        left[row - 2] === rightChar
      ) {
        matrix[row]![column] = Math.min(
          matrix[row]![column]!,
          matrix[row - 2]![column - 2]! + 1,
        );
      }
    }
  }
  return matrix[left.length]![right.length]!;
}

function hasApproximateTokenMatch(
  queryToken: string,
  document: IndexedFaq,
): boolean {
  const maximumDistance = queryToken.length <= 5 ? 1 : 2;
  for (const candidate of document.tokens) {
    if (
      Math.max(queryToken.length, candidate.length) >= 4 &&
      Math.abs(queryToken.length - candidate.length) <= maximumDistance &&
      damerauLevenshtein(queryToken, candidate) <= maximumDistance
    ) {
      return true;
    }
  }
  return false;
}

function ngramSimilarity(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const gram of left) if (right.has(gram)) intersection += 1;
  return (2 * intersection) / (left.size + right.size);
}

function fuzzyTextSimilarity(
  normalized: string,
  variants: string[],
  bigramQuery: Set<string>,
  trigramQuery: Set<string>,
  document: IndexedFaq,
): number {
  const direct =
    normalized.length > 3 &&
    document.phrases.some((phrase) =>
      variants.some(
        (variant) =>
          variant.length > 3 &&
          (phrase === variant || phrase.includes(variant)),
      ),
    )
      ? 1
      : 0;
  const bigrams = ngramSimilarity(bigramQuery, document.bigrams);
  const trigrams = ngramSimilarity(trigramQuery, document.trigrams);
  return Math.max(direct, bigrams * 0.45 + trigrams * 0.55);
}

function queryTerms(query: string): Map<string, number> {
  const normalized = normalizeChatText(query);
  const expanded = new Map<string, number>();
  for (const phrase of expandSynonyms(normalized)) {
    const weight = phrase === normalized ? 1 : 0.4;
    for (const token of terms(phrase)) {
      expanded.set(token, Math.max(expanded.get(token) ?? 0, weight));
    }
  }
  for (const token of [...expanded.keys()]) {
    const tokenStem = stem(token);
    if (tokenStem !== token) {
      expanded.set(tokenStem, Math.max(expanded.get(tokenStem) ?? 0, 0.7));
    }
  }
  return expanded;
}

function collectCandidates(
  question: string,
  query: Map<string, number>,
  index: MatcherIndex,
  variants: string[],
): IndexedFaq[] {
  const candidates = new Set<IndexedFaq>();
  const sourceTokens = terms(question);
  const expandedVocabulary = new Set(query.keys());
  for (const token of query.keys()) {
    expandedVocabulary.add(stem(token));
    for (const synonym of getSynonyms(token)) expandedVocabulary.add(synonym);
  }

  for (const token of expandedVocabulary) {
    for (const document of index.tokenPostings.get(token) ?? []) {
      candidates.add(document);
    }
    for (const document of index.stemPostings.get(stem(token)) ?? []) {
      candidates.add(document);
    }
  }
  const grams = new Set<string>();
  for (const token of sourceTokens) {
    for (const gram of makeNgrams(token, 3)) grams.add(gram);
  }
  const gramCounts = new Map<IndexedFaq, number>();
  for (const gram of grams) {
    for (const document of index.trigramPostings.get(gram) ?? []) {
      gramCounts.set(document, (gramCounts.get(document) ?? 0) + 1);
    }
  }
  const minimumGramHits = Math.min(2, grams.size <= 4 ? 1 : 2);
  for (const [document, count] of gramCounts) {
    if (
      count >= minimumGramHits &&
      sourceTokens.some((token) =>
        hasApproximateTokenMatch(stem(token), document),
      )
    ) {
      candidates.add(document);
    }
  }
  if (candidates.size === 0 && sourceTokens.length === 0) {
    const compact = normalizeChatText(question);
    for (const gram of makeNgrams(compact, 2)) {
      for (const document of index.bigramPostings.get(gram) ?? []) {
        candidates.add(document);
      }
    }
  }
  if (candidates.size <= 40) return [...candidates];
  const queryTokens = [...new Set(sourceTokens)];
  const queryStems = queryTokens.map(stem);
  return [...candidates]
    .map((document) => {
      let overlap = 0;
      for (
        let tokenIndex = 0;
        tokenIndex < queryTokens.length;
        tokenIndex += 1
      ) {
        const token = queryTokens[tokenIndex] ?? "";
        const tokenStem = queryStems[tokenIndex] ?? token;
        if (document.tokens.has(token) || document.tokenStems.has(tokenStem)) {
          overlap += 1;
        }
      }
      return {
        document,
        overlap,
        phrase: phraseScore(variants, document),
      };
    })
    .sort(
      (left, right) =>
        right.overlap - left.overlap || right.phrase - left.phrase,
    )
    .slice(0, 40)
    .map(({ document }) => document);
}

function keywordScore(
  query: Map<string, number>,
  document: IndexedFaq,
): number {
  let totalWeight = 0;
  let matchedWeight = 0;
  for (const [queryToken, queryWeight] of query) {
    if (STOP_WORDS.has(queryToken)) continue;
    const weight =
      queryWeight * Math.min(1.5, Math.max(0.6, queryToken.length / 5));
    totalWeight += weight;
    let best =
      document.tokens.has(queryToken) ||
      document.tokenStems.has(stem(queryToken))
        ? 1
        : 0;
    if (!best) {
      const synonyms = getSynonyms(queryToken);
      if (synonyms.some((token) => document.tokens.has(token))) best = 0.93;
    }
    if (!best) {
      for (const token of document.tokens) {
        if (
          Math.max(queryToken.length, token.length) >= 4 &&
          Math.abs(queryToken.length - token.length) <= 2 &&
          damerauLevenshtein(queryToken, token) <=
            (queryToken.length <= 4 ? 1 : 2)
        ) {
          best = 0.72;
          break;
        }
      }
    }
    matchedWeight += weight * best;
  }
  return totalWeight ? matchedWeight / totalWeight : 0;
}

function cosineSimilarity(
  query: Map<string, number>,
  document: IndexedFaq,
  index: MatcherIndex,
): number {
  let dot = 0;
  let queryMagnitude = 0;
  for (const [token, weight] of query) {
    const queryWeight =
      weight * idf(token, index.documents.length, index.frequency);
    queryMagnitude += queryWeight * queryWeight;
    dot += queryWeight * (document.vector.get(token) ?? 0);
  }
  if (!queryMagnitude || !document.magnitude) return 0;
  return dot / (Math.sqrt(queryMagnitude) * document.magnitude);
}

function phraseScore(variants: string[], document: IndexedFaq): number {
  for (const variant of variants) {
    if (variant.length < 3) continue;
    if (
      document.phrases.some(
        (phrase) => phrase === variant || phrase.includes(variant),
      )
    ) {
      return 1;
    }
  }
  return 0;
}

function confidenceFor(score: number): "high" | "medium" | "low" {
  if (score >= MATCH_THRESHOLDS.high) return "high";
  if (score >= MATCH_THRESHOLDS.medium) return "medium";
  return "low";
}

function hasEntityEvidence(
  tokens: string[],
  stems: string[],
  document: IndexedFaq,
): boolean {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] ?? "";
    const tokenStem = stems[index] ?? token;
    if (STOP_WORDS.has(token) || STOP_WORDS.has(tokenStem)) continue;
    if (
      document.tokens.has(token) ||
      document.tokenStems.has(tokenStem) ||
      getSynonyms(token).some((synonym) => document.tokens.has(synonym))
    ) {
      return true;
    }
    if (hasApproximateTokenMatch(tokenStem, document)) return true;
  }
  return false;
}

function scoreDocument(
  normalized: string,
  variants: string[],
  bigramQuery: Set<string>,
  trigramQuery: Set<string>,
  query: Map<string, number>,
  originalTokens: string[],
  originalStems: string[],
  intent: ReturnType<typeof detectIntent>,
  document: IndexedFaq,
  index: MatcherIndex,
): number {
  const exact = phraseScore(variants, document);
  const keywords = keywordScore(query, document);
  const entityMatches = originalTokens.filter((token, tokenIndex) => {
    const tokenStem = originalStems[tokenIndex] ?? token;
    return document.tokens.has(token) || document.tokenStems.has(tokenStem);
  }).length;
  const entityScore = originalTokens.length
    ? entityMatches / originalTokens.length
    : 0;
  const semantic = cosineSimilarity(query, document, index);
  const fuzzy = fuzzyTextSimilarity(
    normalized,
    variants,
    bigramQuery,
    trigramQuery,
    document,
  );
  const intentScore = document.intents.some((candidate) =>
    intent.intents.includes(candidate),
  )
    ? 1
    : 0;
  const score =
    MATCH_WEIGHTS.exactPhrase * exact +
    MATCH_WEIGHTS.keywordOverlap * keywords +
    MATCH_WEIGHTS.tfidfCosine * semantic +
    MATCH_WEIGHTS.fuzzyText * fuzzy +
    MATCH_WEIGHTS.intent * intentScore +
    0.12 * entityScore;
  return Math.min(1, Math.max(0, score));
}

function contextualMatch(
  question: string,
  entries: ChatFaqEntry[],
  contextId?: string,
): ChatFaqEntry | null {
  if (!contextId) return null;
  const compact = normalizeChatText(question).replace(/\s/gu, "");
  if (
    !/^(?:مثال|وضح|اكمل|كمان|تمام|اه|نعم|ازاي|كيف|لماذا|ليه|اكتر|اكثر|وليه|وايهكمان|كمل)$/u.test(
      compact,
    )
  ) {
    return null;
  }
  return entries.find((entry) => entry.id === contextId) ?? null;
}

export function matchFaqDetailed(
  question: string,
  entries: ChatFaqEntry[],
  contextEntryId?: string,
  minimumScore = MATCH_THRESHOLDS.minimum,
): FaqMatchResult {
  const normalized = normalizeChatText(question);
  const intent = detectIntent(question);
  if (!normalized) {
    return { best: null, candidates: [], confidence: "low", intent };
  }
  const contextual = contextualMatch(normalized, entries, contextEntryId);
  if (contextual) {
    const best: FaqMatchCandidate = {
      faq: contextual,
      score: 1,
      confidence: "high",
      intent,
    };
    return { best, candidates: [best], confidence: "high", intent };
  }

  const index = getIndex(entries);
  const query = queryTerms(question);
  const variants = normalizeForMatching(question);
  const originalTokens = terms(question);
  const originalStems = originalTokens.map(stem);
  const bigramQuery = makeNgrams(normalized, 2);
  const trigramQuery = makeNgrams(normalized, 3);
  const selected = collectCandidates(question, query, index, variants);
  const ranked = selected
    .map((document) => ({
      document,
      faq: document.faq,
      score: scoreDocument(
        normalized,
        variants,
        bigramQuery,
        trigramQuery,
        query,
        originalTokens,
        originalStems,
        intent,
        document,
        index,
      ),
      intent,
    }))
    .sort((left, right) => right.score - left.score);
  const suggestions = ranked.slice(0, 3).map((candidate) => ({
    faq: candidate.faq,
    score: candidate.score,
    confidence: confidenceFor(candidate.score),
    intent: candidate.intent,
  }));
  const bestDocument = ranked.find((candidate) => {
    const hasEvidence =
      originalTokens.length === 0
        ? phraseScore(variants, candidate.document) > 0
        : hasEntityEvidence(originalTokens, originalStems, candidate.document);
    return candidate.score >= minimumScore && hasEvidence;
  });
  const best = bestDocument
    ? {
        faq: bestDocument.faq,
        score: bestDocument.score,
        confidence: confidenceFor(bestDocument.score),
        intent: bestDocument.intent,
      }
    : null;
  if (!best) recordUnmatchedQuestion(question);
  return {
    best,
    candidates: suggestions,
    confidence: best?.confidence ?? "low",
    intent,
  };
}

export function matchFaq(
  question: string,
  entries: ChatFaqEntry[],
  contextEntryId?: string,
  threshold = MATCH_THRESHOLDS.minimum,
): ChatFaqEntry | null {
  return (
    matchFaqDetailed(question, entries, contextEntryId, threshold).best?.faq ??
    null
  );
}

export function matchMultipleFaqs(
  question: string,
  entries: ChatFaqEntry[],
  contextEntryId?: string,
  limit = 3,
): FaqMatchResult[] {
  const parts = question
    .split(/(?:[؟?]+|؛|،\s*(?=كيف|ما|هل|أين|متى|ليه|ازاي)|\s+وكمان\s+)/u)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, limit);
  const questions = parts.length > 1 ? parts : [question];
  const results: FaqMatchResult[] = [];
  const seenIds = new Set<string>();
  for (const part of questions) {
    const result = matchFaqDetailed(part, entries, contextEntryId);
    if (result.best && !seenIds.has(result.best.faq.id)) {
      results.push(result);
      seenIds.add(result.best.faq.id);
    }
  }
  return results;
}

function redactQuestion(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, "[بريد]")
    .replace(/https?:\/\/\S+/giu, "[رابط]")
    .replace(/(?:\+?20|0)?1[0125]\d{8}/gu, "[هاتف]")
    .replace(/\b\d{6,}\b/gu, "[رقم]")
    .replace(/(?:اسمي|انا اسمي)\s+[\p{L}]{2,}(?:\s+[\p{L}]{2,})?/giu, "[اسم]")
    .slice(0, 300)
    .trim();
}

export function recordUnmatchedQuestion(question: string): void {
  const item = {
    question: redactQuestion(question),
    timestamp: new Date().toISOString(),
  };
  if (!item.question) return;
  unmatchedMemory.push(item);
  if (unmatchedMemory.length > 200) {
    unmatchedMemory.splice(0, unmatchedMemory.length - 200);
  }
  if (typeof localStorage === "undefined") return;
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(unmatchedStorageKey) ?? "[]",
    );
    const history = Array.isArray(saved) ? saved : [];
    localStorage.setItem(
      unmatchedStorageKey,
      JSON.stringify([...history, item].slice(-200)),
    );
  } catch (error) {
    console.warn("Unable to persist unmatched chatbot questions.", error);
  }
}

export function exportUnmatchedQuestions(): string {
  let stored: unknown = unmatchedMemory;
  if (typeof localStorage !== "undefined") {
    try {
      stored = JSON.parse(localStorage.getItem(unmatchedStorageKey) ?? "[]");
    } catch (error) {
      console.warn("Unable to read unmatched chatbot questions.", error);
    }
  }
  return JSON.stringify(
    Array.isArray(stored) ? stored.slice(-200) : [],
    null,
    2,
  );
}

export function downloadUnmatchedQuestions(): void {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("Question export is only available in a browser.");
  }
  const url = URL.createObjectURL(
    new Blob([exportUnmatchedQuestions()], {
      type: "application/json;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "chatbot-unmatched-questions.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function measureMatcher(
  question: string,
  entries: ChatFaqEntry[],
  iterations = 1,
): { averageMs: number; result: FaqMatchResult } {
  const startedAt = performance.now();
  let result = matchFaqDetailed(question, entries);
  for (let iteration = 1; iteration < iterations; iteration += 1) {
    result = matchFaqDetailed(question, entries);
  }
  return {
    averageMs: (performance.now() - startedAt) / Math.max(1, iterations),
    result,
  };
}
