import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Course } from "../types/domain";

const { getStudentProfile, submitCourseOrder, user } = vi.hoisted(() => ({
  getStudentProfile: vi.fn(),
  submitCourseOrder: vi.fn(),
  user: { id: "student-1", name: "طالب تجريبي", email: "student@example.com" },
}));

vi.mock("../features/auth/AuthContext", () => ({
  useAuth: () => ({ user }),
}));

vi.mock("../services/orderService", () => ({
  getPaymentMethodLabel: (method: string) =>
    method === "Fawry"
      ? "فوري"
      : method === "Orange Cash"
        ? "أورنج كاش"
        : method,
  getStudentProfile,
  submitCourseOrder,
}));

describe("CoursePaymentForm Fawry payment", () => {
  beforeEach(async () => {
    cleanup();
    vi.resetModules();
    vi.stubEnv("VITE_FAWRY_PAYMENT_CODE", "5078086710757365");
    vi.stubEnv("VITE_ORANGE_CASH_NUMBER", "01283865399");
    vi.stubEnv("VITE_VODAFONE_CASH_NUMBER", "");
    vi.stubEnv("VITE_ETISALAT_CASH_NUMBER", "");
    vi.stubEnv("VITE_INSTAPAY_ADDRESS", "");
    vi.stubEnv("VITE_ADMIN_WHATSAPP_NUMBER", "201000000000");
    getStudentProfile.mockResolvedValue({
      full_name: "طالب تجريبي",
      email: "student@example.com",
      phone: "",
      role: "student",
    });
    submitCourseOrder.mockResolvedValue("order-123");
  });

  it("submits a Fawry receipt as a pending-review request", async () => {
    const { CoursePaymentForm } = await import("./CoursePaymentForm");
    const onSubmitted = vi.fn();
    render(
      <CoursePaymentForm
        course={
          {
            id: "course-sarf",
            category: "صرف",
            title: "صرف الأفعال",
            level: "متوسط",
            lessons: "10 دروس",
            duration: "3 أسابيع",
            price: "١٧٩ ج.م",
            image: "course.png",
          } satisfies Course
        }
        onSubmitted={onSubmitted}
      />,
    );

    expect(
      screen.getByText(
        "يظل الاشتراك قيد المراجعة، ويُفتح الكورس بعد اعتماد الأدمن للإيصال.",
      ),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("وسيلة الدفع"), {
      target: { value: "Fawry" },
    });
    expect(
      screen.getByText("5078086710757365", { selector: "strong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("ادفع عبر فوري باستخدام كود الدفع:"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("رقم الهاتف أو مرجع عملية فوري"), {
      target: { value: "FAWRY-REF-5678" },
    });
    fireEvent.change(screen.getByLabelText("رقم هاتفك للتواصل"), {
      target: { value: "01012345678" },
    });
    fireEvent.change(
      screen.getByLabelText("صورة إيصال الدفع (JPG أو PNG أو WebP، حتى 10MB)"),
      {
        target: {
          files: [new File(["receipt"], "receipt.png", { type: "image/png" })],
        },
      },
    );
    fireEvent.submit(
      screen
        .getByRole("button", { name: "إرسال الطلب إلى الإدارة" })
        .closest("form")!,
    );

    await waitFor(() => {
      expect(submitCourseOrder).toHaveBeenCalledWith({
        userId: "student-1",
        courseId: "course-sarf",
        phone: "01012345678",
        paymentMethod: "Fawry",
        senderWalletNumber: "FAWRY-REF-5678",
        receipt: expect.objectContaining({
          name: "receipt.png",
          type: "image/png",
        }),
      });
    });
    expect(onSubmitted).toHaveBeenCalledWith(
      "order-123",
      expect.stringContaining("wa.me/201000000000"),
    );
    const submittedUrl = onSubmitted.mock.calls[0]?.[1];
    if (typeof submittedUrl !== "string") {
      throw new Error("Expected a WhatsApp link after payment submission.");
    }
    const submittedMessage =
      new URL(submittedUrl).searchParams.get("text") ?? "";
    expect(submittedMessage).toContain(
      "رقم الهاتف أو مرجع فوري: FAWRY-REF-5678",
    );
    expect(submittedMessage).toContain("يرجى مراجعة التحويل ثم تفعيل الاشتراك");
  });

  it("defaults to an available payment method and does not require WhatsApp", async () => {
    vi.stubEnv("VITE_ADMIN_WHATSAPP_NUMBER", "");
    const { CoursePaymentForm } = await import("./CoursePaymentForm");
    const onSubmitted = vi.fn();
    render(
      <CoursePaymentForm
        course={
          {
            id: "course-sarf",
            category: "صرف",
            title: "صرف الأفعال",
            level: "متوسط",
            lessons: "٤ دروس",
            duration: "٤ أسابيع",
            price: "١٧٩ ج.م",
            image: "course.png",
          } satisfies Course
        }
        onSubmitted={onSubmitted}
      />,
    );

    expect(screen.getByLabelText("وسيلة الدفع")).toHaveValue("Fawry");
    expect(
      screen.getByRole("option", { name: "Vodafone Cash" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "إرسال الطلب إلى الإدارة" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("رقم هاتفك للتواصل"), {
      target: { value: "01012345678" },
    });
    fireEvent.change(screen.getByLabelText("رقم الهاتف أو مرجع عملية فوري"), {
      target: { value: "FAWRY-REF-5678" },
    });
    fireEvent.change(
      screen.getByLabelText("صورة إيصال الدفع (JPG أو PNG أو WebP، حتى 10MB)"),
      {
        target: {
          files: [new File(["receipt"], "receipt.png", { type: "image/png" })],
        },
      },
    );
    fireEvent.submit(
      screen
        .getByRole("button", { name: "إرسال الطلب إلى الإدارة" })
        .closest("form")!,
    );

    await waitFor(() => {
      expect(submitCourseOrder).toHaveBeenCalled();
    });
    expect(onSubmitted).toHaveBeenCalledWith("order-123", null);
  });

  it("submits Orange Cash receipts to the configured receiving wallet", async () => {
    const { CoursePaymentForm } = await import("./CoursePaymentForm");
    const onSubmitted = vi.fn();
    render(
      <CoursePaymentForm
        course={
          {
            id: "course-sarf",
            category: "صرف",
            title: "صرف الأفعال",
            level: "متوسط",
            lessons: "10 دروس",
            duration: "3 أسابيع",
            price: "١٧٩ ج.م",
            image: "course.png",
          } satisfies Course
        }
        onSubmitted={onSubmitted}
      />,
    );

    fireEvent.change(screen.getByLabelText("وسيلة الدفع"), {
      target: { value: "Orange Cash" },
    });
    expect(
      screen.getByText("01283865399", { selector: "strong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("حوّل المبلغ إلى محفظة أورنج كاش:"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("رقم هاتفك للتواصل"), {
      target: { value: "01012345678" },
    });
    fireEvent.change(screen.getByLabelText("رقم المحفظة التي أرسلت منها"), {
      target: { value: "01200000000" },
    });
    fireEvent.change(
      screen.getByLabelText("صورة إيصال الدفع (JPG أو PNG أو WebP، حتى 10MB)"),
      {
        target: {
          files: [new File(["receipt"], "receipt.png", { type: "image/png" })],
        },
      },
    );
    fireEvent.submit(
      screen
        .getByRole("button", { name: "إرسال الطلب إلى الإدارة" })
        .closest("form")!,
    );

    await waitFor(() => {
      expect(submitCourseOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: "Orange Cash",
          senderWalletNumber: "01200000000",
        }),
      );
    });
    expect(onSubmitted).toHaveBeenCalled();
  });

  it("shows submission failures instead of appearing to do nothing", async () => {
    submitCourseOrder.mockRejectedValueOnce(
      new Error("لديك طلب دفع قيد المراجعة لهذا الكورس بالفعل."),
    );
    const { CoursePaymentForm } = await import("./CoursePaymentForm");
    render(
      <CoursePaymentForm
        course={
          {
            id: "course-sarf",
            category: "صرف",
            title: "صرف الأفعال",
            level: "متوسط",
            lessons: "٤ دروس",
            duration: "٤ أسابيع",
            price: "١٧٩ ج.م",
            image: "course.png",
          } satisfies Course
        }
        onSubmitted={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("رقم هاتفك للتواصل"), {
      target: { value: "01012345678" },
    });
    fireEvent.change(screen.getByLabelText("رقم الهاتف أو مرجع عملية فوري"), {
      target: { value: "FAWRY-REF-5678" },
    });
    fireEvent.change(
      screen.getByLabelText("صورة إيصال الدفع (JPG أو PNG أو WebP، حتى 10MB)"),
      {
        target: {
          files: [new File(["receipt"], "receipt.png", { type: "image/png" })],
        },
      },
    );
    fireEvent.submit(
      screen
        .getByRole("button", { name: "إرسال الطلب إلى الإدارة" })
        .closest("form")!,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "لديك طلب دفع قيد المراجعة لهذا الكورس بالفعل.",
    );
  });

  it("shows the real payment destinations but blocks orders for the local demo account", async () => {
    const { CoursePaymentForm } = await import("./CoursePaymentForm");
    render(
      <CoursePaymentForm
        course={
          {
            id: "course-sarf",
            category: "صرف",
            title: "صرف الأفعال",
            level: "متوسط",
            lessons: "10 دروس",
            duration: "3 أسابيع",
            price: "١٧٩ ج.م",
            image: "course.png",
          } satisfies Course
        }
        onSubmitted={vi.fn()}
        demoAccount
      />,
    );

    expect(screen.getByText("5078086710757365")).toBeInTheDocument();
    expect(
      screen.getByText(
        "حساب المعاينة يمكنه عرض بيانات الدفع فقط؛ لإرسال طلب حقيقي استخدم حساب طالب مسجلًا.",
      ),
    ).toBeInTheDocument();
    expect(getStudentProfile).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", {
        name: "سجّل الدخول بحساب طالب لإرسال طلب حقيقي",
      }),
    ).toBeDisabled();
    expect(submitCourseOrder).not.toHaveBeenCalled();
  });
});
