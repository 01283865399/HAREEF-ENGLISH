import { ApiError } from "./http";

export interface AIHistoryMessage {
  role: "user" | "model";
  text: string;
}

interface RateRecord {
  startedAt: number;
  count: number;
}

const requestsByIp = new Map<string, RateRecord>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 15;
const MAX_RATE_LIMIT_KEYS = 1_000;
const MAX_MESSAGE_LENGTH = 500;
const FALLBACK_MODEL = "gemini-3.5-flash";

const SYSTEM_INSTRUCTION = `أنت مساعد تعليمي لطلاب منصة مستر محمود عبد الواحد. ساعد الطالب في English: Grammar, Vocabulary, Reading, Translation, Writing, Literature, and Final Revision، وفي استخدام المنصة والكورسات ونصائح المذاكرة. اشرح بالعامية المصرية، واستخدم المصطلحات والأمثلة التعليمية بالإنجليزية، ويمكنك إضافة المقابل العربي عند الحاجة. اشرح سبب الإجابة من غير افتراض معلومات غير مؤكدة. إذا كان السؤال خارج هذه الموضوعات فاعتذر بلطف ووجّه الطالب لسؤال عن English أو الدراسة أو المنصة.

معلومات مطوّر المنصة:
- الاسم: المهندس أحمد ديب، وهو مطوّر المنصة.
- طالب في كلية هندسة الذكاء الاصطناعي وعلوم الحاسوب.
- مطوّر Full Stack، بيبني منصات ومواقع تعليمية ومتاجر إلكترونية.
إذا سُئلت عن مطوّر المنصة أو أحمد ديب، أجب بهذه المعلومات فقط ولا تخترع تفاصيل أخرى عن عمره أو خبرته أو مؤهلاته.

لا تخترع معلومة عن المنصة أو الأسعار أو المواعيد أو الأسماء؛ إذا لم تكن المعلومة مؤكدة فقل ذلك بوضوح. لا تطلب بيانات شخصية أو كلمات مرور أو بيانات دفع.`;

const DEVELOPER_ANSWER =
  "المهندس أحمد ديب هو مطوّر المنصة. هو طالب في كلية هندسة الذكاء الاصطناعي وعلوم الحاسوب، ومطوّر Full Stack بيبني منصات ومواقع تعليمية ومتاجر إلكترونية.";

export function getDeveloperInfoReply(message: string): string | null {
  const normalized = message
    .normalize("NFKC")
    .replace(/[أإآ]/gu, "ا")
    .replace(/[ى]/gu, "ي")
    .replace(/[ة]/gu, "ه")
    .toLocaleLowerCase("ar");
  const mentionsDeveloper = /(مطور|مبرمج|مهندس|صانع|منشئ|مصمم|صاحب)/u.test(
    normalized,
  );
  const mentionsPlatform = /(منصه|موقع|تطبيق|مستر محمود)/u.test(normalized);
  const mentionsName = /(احمد|ديب)/u.test(normalized);
  const asksWhoCreatedPlatform =
    /(مين|من).{0,12}(عمل|انشا|صمم)/u.test(normalized) && mentionsPlatform;

  return mentionsName ||
    (mentionsDeveloper && mentionsPlatform) ||
    asksWhoCreatedPlatform
    ? DEVELOPER_ANSWER
    : null;
}

export function validateAIRequest(body: unknown): {
  message: string;
  history: AIHistoryMessage[];
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "invalid_request");
  }
  const input = body as { message?: unknown; history?: unknown };
  if (
    typeof input.message !== "string" ||
    !input.message.trim() ||
    input.message.length >= MAX_MESSAGE_LENGTH
  ) {
    throw new ApiError(400, "invalid_message");
  }

  const history = Array.isArray(input.history)
    ? input.history
        .filter(
          (item): item is { role: "user" | "model"; text: string } =>
            !!item &&
            typeof item === "object" &&
            ((item as { role?: unknown }).role === "user" ||
              (item as { role?: unknown }).role === "model") &&
            typeof (item as { text?: unknown }).text === "string",
        )
        .slice(-6)
        .map(({ role, text }) => ({ role, text: text.slice(0, 500) }))
    : [];

  return { message: input.message.trim(), history };
}

function isRateLimited(ip: string, now = Date.now()): boolean {
  for (const [knownIp, record] of requestsByIp) {
    if (now - record.startedAt >= WINDOW_MS) requestsByIp.delete(knownIp);
  }
  if (requestsByIp.size >= MAX_RATE_LIMIT_KEYS && !requestsByIp.has(ip)) {
    return true;
  }
  const record = requestsByIp.get(ip);
  if (!record || now - record.startedAt >= WINDOW_MS) {
    requestsByIp.set(ip, { startedAt: now, count: 1 });
    return false;
  }
  if (record.count >= MAX_REQUESTS_PER_WINDOW) return true;
  record.count += 1;
  return false;
}

export function assertAIRateLimit(ip: string): void {
  if (isRateLimited(ip)) throw new ApiError(429, "rate_limit");
}

export function clearAIRateLimits(): void {
  requestsByIp.clear();
}

export async function generateAIReply(
  message: string,
  history: AIHistoryMessage[],
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ApiError(503, "ai_unavailable");

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const contents = [
    ...history.map(({ role, text }) => ({ role, parts: [{ text }] })),
    { role: "user", parts: [{ text: message }] },
  ];
  const requestModel = (requestedModel: string) =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(requestedModel)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents,
          generationConfig: { maxOutputTokens: 700, temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(12_000),
      },
    );
  let response: Response;
  try {
    response = await requestModel(model);
  } catch (error) {
    console.error("[Gemini] Network request failed", error);
    if (model === FALLBACK_MODEL) throw new ApiError(502, "ai_failed");
    console.warn("[Gemini] Retrying with the backup model");
    try {
      response = await requestModel(FALLBACK_MODEL);
    } catch (fallbackError) {
      console.error("[Gemini] Backup model request failed", fallbackError);
      throw new ApiError(502, "ai_failed");
    }
  }

  if (
    (response.status === 404 || response.status === 503) &&
    model !== FALLBACK_MODEL
  ) {
    console.warn(
      "[Gemini] Primary model unavailable; retrying with the backup model",
      response.status,
    );
    try {
      response = await requestModel(FALLBACK_MODEL);
    } catch (error) {
      console.error("[Gemini] Backup model request failed", error);
      throw new ApiError(502, "ai_failed");
    }
  }

  if (response.status === 429) throw new ApiError(429, "rate_limit");
  if (!response.ok) {
    console.error(
      "[Gemini] Provider returned non-success status",
      response.status,
    );
    throw new ApiError(502, "ai_failed");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(502, "ai_failed");
  }
  if (!payload || typeof payload !== "object") {
    throw new ApiError(502, "ai_failed");
  }
  const candidate = (
    payload as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
    }
  ).candidates?.[0];
  const reply = candidate?.content?.parts
    ?.map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
  if (!reply) throw new ApiError(502, "ai_failed");
  return reply;
}
