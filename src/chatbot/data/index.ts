import { account } from "./account";
import { englishGeneral } from "./englishGeneral";
import { courses } from "./courses";
import { grammar } from "./grammar";
import { greetings } from "./greetings";
import { literature } from "./literature";
import { morphology } from "./morphology";
import { platform } from "./platform";
import { pricing } from "./pricing";
import { rhetoric } from "./rhetoric";
import { study } from "./study";
import { studyTips } from "./studyTips";
import { support } from "./support";
import { technical } from "./technical";
import { writing } from "./writing";
import type { ChatFaqEntry } from "./types";

export const faqCategories = {
  greetings,
  platform,
  courses,
  account,
  pricing,
  study,
  grammar,
  morphology,
  rhetoric,
  literature,
  writing,
  studyTips,
  technical,
  support,
  englishGeneral,
} as const;

export const localFaqs: ChatFaqEntry[] = Object.values(faqCategories).flat();
export const faqCount = localFaqs.length;
export type { ChatFaqEntry };
export { fallbackResponses, fallbackSuggestions } from "./fallback";
