import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../features/auth/AuthContext";
import {
  getPaymentMethodLabel,
  getStudentProfile,
  submitCourseOrder,
  type PaymentMethod,
} from "../services/orderService";
import type { Course } from "../types/domain";
import styles from "./CourseDetails.module.css";

const paymentMethods: PaymentMethod[] = [
  "Fawry",
  "Orange Cash",
  "Vodafone Cash",
  "Etisalat Cash",
  "InstaPay",
];

const paymentRecipients: Record<PaymentMethod, string | undefined> = {
  "Vodafone Cash": import.meta.env.VITE_VODAFONE_CASH_NUMBER,
  "Etisalat Cash": import.meta.env.VITE_ETISALAT_CASH_NUMBER,
  InstaPay: import.meta.env.VITE_INSTAPAY_ADDRESS,
  Fawry: import.meta.env.VITE_FAWRY_PAYMENT_CODE?.trim() || "5078086710757365",
  "Orange Cash":
    import.meta.env.VITE_ORANGE_CASH_NUMBER?.trim() || "01283865399",
};
const availablePaymentMethods = paymentMethods.filter((paymentMethod) =>
  paymentRecipients[paymentMethod]?.trim(),
);

interface CoursePaymentFormProps {
  course: Course;
  onSubmitted: (orderId: string, whatsappUrl: string | null) => void;
  demoAccount?: boolean;
}

export function CoursePaymentForm({
  course,
  onSubmitted,
  demoAccount = false,
}: CoursePaymentFormProps) {
  const { user } = useAuth();
  const [method, setMethod] = useState<PaymentMethod>(
    availablePaymentMethods[0] ?? "Fawry",
  );
  const [senderWalletNumber, setSenderWalletNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (demoAccount) return undefined;
    let active = true;
    getStudentProfile()
      .then((profile) => {
        if (active) setPhone((current) => current || profile.phone);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "تعذّر تحميل رقم الهاتف المحفوظ.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [demoAccount]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demoAccount) {
      setError(
        "حساب المعاينة ليس حساب طالب مسجلًا في Supabase. سجّل الدخول بحساب طالب لإرسال طلب دفع حقيقي.",
      );
      return;
    }
    if (!user || !receipt) return;
    if (!paymentRecipients[method]?.trim()) {
      setError(
        "بيانات التحويل لهذه الوسيلة غير متاحة حاليًا. تواصل مع الإدارة.",
      );
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const orderId = await submitCourseOrder({
        userId: user.id,
        courseId: course.id,
        phone,
        paymentMethod: method,
        senderWalletNumber,
        receipt,
      });
      const message = [
        "طلب تفعيل اشتراك جديد - منصة مستر محمود للغة الإنجليزية",
        `رقم الطلب: ${orderId}`,
        `اسم الطالب: ${user.name}`,
        `البريد الإلكتروني: ${user.email}`,
        `رقم الهاتف: ${phone.trim()}`,
        `الكورس: ${course.title}`,
        `وسيلة الدفع: ${getPaymentMethodLabel(method)}`,
        `${
          method === "Fawry" ? "رقم الهاتف أو مرجع فوري" : "رقم المحفظة المرسلة"
        }: ${senderWalletNumber.trim()}`,
        "الإيصال مرفوع بأمان ويمكن مراجعته من لوحة الإدارة.",
        "يرجى مراجعة التحويل ثم تفعيل الاشتراك من لوحة الإدارة.",
      ].join("\n");
      const adminNumber =
        import.meta.env.VITE_ADMIN_WHATSAPP_NUMBER?.replace(/\D/g, "") ?? "";
      onSubmitted(
        orderId,
        adminNumber.length >= 10 && adminNumber.length <= 15
          ? `https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`
          : null,
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تعذّر إرسال طلب الاشتراك.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className={styles.paymentCard}>
      <h3>إرسال إثبات الدفع</h3>
      <p>اختر وسيلة الدفع وأرفق صورة واضحة للإيصال لمراجعة طلبك.</p>
      <p>يظل الاشتراك قيد المراجعة، ويُفتح الكورس بعد اعتماد الأدمن للإيصال.</p>
      {demoAccount ? (
        <p role="status">
          حساب المعاينة يمكنه عرض بيانات الدفع فقط؛ لإرسال طلب حقيقي استخدم حساب
          طالب مسجلًا.
        </p>
      ) : null}
      <p className={styles.paymentAmount}>المبلغ المطلوب: {course.price}</p>
      {paymentRecipients[method]?.trim() ? (
        <p className={styles.paymentDestination}>
          {method === "Fawry"
            ? "ادفع عبر فوري باستخدام كود الدفع:"
            : method === "Orange Cash"
              ? "حوّل المبلغ إلى محفظة أورنج كاش:"
              : `حوّل المبلغ إلى ${getPaymentMethodLabel(method)}:`}{" "}
          <strong dir="ltr">{paymentRecipients[method]}</strong>
        </p>
      ) : (
        <p className={styles.paymentError} role="alert">
          بيانات التحويل لهذه الوسيلة لم تُضف بعد. ستظهر هنا بعد إعدادها من
          الإدارة.
        </p>
      )}
      <form className={styles.paymentForm} onSubmit={submit}>
        <label>
          وسيلة الدفع
          <select
            onChange={(event) => {
              const selected = paymentMethods.find(
                (paymentMethod) => paymentMethod === event.target.value,
              );
              if (selected) setMethod(selected);
            }}
            value={method}
          >
            {paymentMethods.map((paymentMethod) => (
              <option
                disabled={!paymentRecipients[paymentMethod]?.trim()}
                key={paymentMethod}
                value={paymentMethod}
              >
                {getPaymentMethodLabel(paymentMethod)}
              </option>
            ))}
          </select>
        </label>
        <label>
          رقم هاتفك للتواصل
          <input
            autoComplete="tel"
            onChange={(event) => setPhone(event.target.value)}
            required
            type="tel"
            value={phone}
          />
        </label>
        <label>
          {method === "Fawry"
            ? "رقم الهاتف أو مرجع عملية فوري"
            : "رقم المحفظة التي أرسلت منها"}
          <input
            autoComplete={method === "Fawry" ? "off" : "tel"}
            inputMode={method === "Fawry" ? "text" : "tel"}
            onChange={(event) => setSenderWalletNumber(event.target.value)}
            required
            type={method === "Fawry" ? "text" : "tel"}
            value={senderWalletNumber}
          />
        </label>
        <label>
          صورة إيصال الدفع (JPG أو PNG أو WebP، حتى 10MB)
          <input
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
            required
            type="file"
          />
        </label>
        {error ? (
          <p className={styles.paymentError} role="alert">
            {error}
          </p>
        ) : null}
        <Button
          disabled={
            demoAccount ||
            !paymentRecipients[method]?.trim() ||
            !receipt ||
            !phone.trim() ||
            !senderWalletNumber.trim()
          }
          loading={submitting}
          type="submit"
        >
          {demoAccount
            ? "سجّل الدخول بحساب طالب لإرسال طلب حقيقي"
            : "إرسال الطلب إلى الإدارة"}
        </Button>
      </form>
    </Card>
  );
}
