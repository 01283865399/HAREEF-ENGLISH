import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearResponderHistory } from "./engine/responder";
import { ChatBot } from "./ChatBot";
import { LocalGuideBot } from "./LocalGuideBot";

const storageKey = "mr-mahmoud:guide:messages:v1";

function renderLocalGuide() {
  return render(
    <MemoryRouter>
      <LocalGuideBot />
    </MemoryRouter>,
  );
}

function renderChatbot() {
  return render(
    <MemoryRouter>
      <ChatBot />
    </MemoryRouter>,
  );
}

function ask(question: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "اكتب سؤالك" }), {
    target: { value: question },
  });
  fireEvent.click(screen.getByRole("button", { name: "إرسال السؤال" }));
}

async function finishTyping() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(650);
    await import("./data");
  });
}

beforeEach(() => {
  window.localStorage.clear();
  clearResponderHistory();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("LocalChatbot", () => {
  it("answers locally and links to the course catalog", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderLocalGuide();
    fireEvent.click(screen.getByRole("button", { name: "فتح مرشد المنصة" }));
    ask("كيف أشترك في كورس؟");

    expect(screen.getByText("كيف أشترك في كورس؟")).toBeInTheDocument();
    await finishTyping();

    expect(screen.getByText(/افتح تفاصيل الكورس/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "شوف الكورسات" })).toHaveAttribute(
      "href",
      "/courses",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["مين مطور المنصة؟", "مين عمل الموقع؟", "مين مبرمج مستر محمود؟"])(
    "identifies the platform developer for %s",
    async (question) => {
      renderLocalGuide();
      fireEvent.click(screen.getByRole("button", { name: "فتح مرشد المنصة" }));
      ask(question);
      await finishTyping();

      expect(
        screen.getByText(
          "المهندس أحمد ديب هو مطوّر المنصة. طالب في كلية هندسة الذكاء الاصطناعي وعلوم الحاسوب، ومطوّر Full Stack بيبني منصات ومواقع تعليمية ومتاجر إلكترونية.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "تعرّف على المطوّر" }),
      ).toHaveAttribute("href", "/about-developer");
    },
  );

  it("shows an AI label, preserves reply line breaks, and warns against sharing personal data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ reply: "إجابة ذكية\nسطر ثانٍ" }),
      }),
    );
    renderChatbot();
    fireEvent.click(screen.getByRole("button", { name: "فتح ديب بوت AI" }));
    ask("فسر لي مسألة غير موجودة في قاعدة المعلومات");
    await finishTyping();

    expect(screen.getByText("إجابة ذكية")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          element.textContent === "إجابة ذكية\nسطر ثانٍ",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/لا تكتب بيانات شخصية أو سرية/),
    ).toBeInTheDocument();
  });

  it("keeps short clarifications in the previous topic context", async () => {
    renderLocalGuide();
    fireEvent.click(screen.getByRole("button", { name: "فتح مرشد المنصة" }));
    ask("أستخدم present continuous إمتى؟");
    await finishTyping();
    expect(screen.getByText(/التركيب am\/is\/are/)).toBeInTheDocument();

    ask("مثال؟");
    await finishTyping();
    expect(screen.getByText(/They are studying now/)).toBeInTheDocument();
  });

  it("persists messages and clears saved history on request", async () => {
    renderLocalGuide();
    fireEvent.click(screen.getByRole("button", { name: "فتح مرشد المنصة" }));
    ask("السلام عليكم");
    await finishTyping();

    expect(window.localStorage.getItem(storageKey)).toContain("السلام عليكم");
    cleanup();
    renderLocalGuide();
    fireEvent.click(screen.getByRole("button", { name: "فتح مرشد المنصة" }));
    expect(screen.getByText("السلام عليكم")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "مسح محادثة مرشد المنصة" }),
    );
    expect(screen.getByText(/أنا مساعدك في English/)).toBeInTheDocument();
    expect(window.localStorage.getItem(storageKey)).not.toContain(
      "السلام عليكم",
    );
  });

  it("shows quick questions, clears pending answers, and closes with Escape", async () => {
    renderLocalGuide();
    fireEvent.click(screen.getByRole("button", { name: "فتح مرشد المنصة" }));
    expect(
      screen.getByRole("button", { name: "كيف أشترك في كورس؟" }),
    ).toBeInTheDocument();

    ask("السؤال غير المعروف");
    fireEvent.click(
      screen.getByRole("button", { name: "مسح محادثة مرشد المنصة" }),
    );
    await finishTyping();
    expect(
      screen.queryByText(/مش متأكد إني فهمت سؤالك/),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "مرشد المنصة" }),
    ).not.toBeInTheDocument();
  });
});
