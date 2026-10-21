import { getSupabaseClient } from "../lib/supabase";

interface BackendError {
  error?: unknown;
}

export class BackendApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null,
  ) {
    super(message);
  }
}

const errorMessages: Record<string, string> = {
  authentication_required: "سجّل الدخول للمتابعة.",
  invalid_session: "انتهت جلسة الدخول. سجّل الدخول مرة أخرى.",
  admin_required: "الحساب لا يملك صلاحية الإدارة.",
  pending_order_exists: "لديك طلب دفع قيد المراجعة لهذا الكورس بالفعل.",
  invalid_receipt_type: "ارفع صورة بصيغة JPG أو PNG أو WebP.",
  invalid_receipt_size: "يجب ألا يتجاوز حجم صورة الإيصال 10 ميجابايت.",
  invalid_json: "بيانات الطلب غير صالحة.",
  invalid_order: "راجع بيانات طلب الاشتراك وحاول مرة أخرى.",
  receipt_not_found: "تعذّر العثور على صورة الإيصال المرفوعة.",
  free_course_order_not_allowed: "هذا الكورس مجاني ولا يحتاج إلى طلب دفع.",
  course_is_paid: "هذا الكورس غير مجاني.",
  order_create_failed: "تعذّر تسجيل طلب الاشتراك.",
  order_create_failed_receipt_cleanup_failed:
    "تعذّر تسجيل الطلب وتنظيف صورة الإيصال؛ تواصل مع الدعم.",
  order_not_pending: "لم يعد هذا الطلب معلقًا، حدّث القائمة.",
};

function backendBase(): string | null {
  const configured = import.meta.env.VITE_API_BASE?.trim();
  if (!configured) return null;
  return configured.replace(/\/+$/u, "");
}

export function isBackendApiConfigured(): boolean {
  return backendBase() !== null;
}

export async function backendRequest<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const base = backendBase();
  if (!base) throw new Error("عنوان Backend API غير مضبوط.");

  const headers = new Headers(init.headers);
  if (authenticated) {
    const {
      data: { session },
      error,
    } = await getSupabaseClient().auth.getSession();
    if (error) throw new Error(`تعذّر التحقق من جلسة الدخول: ${error.message}`);
    if (!session?.access_token) {
      throw new Error(errorMessages.authentication_required);
    }
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${base}/api/v1${path}`, {
    ...init,
    headers,
  });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("استجاب Backend API برد غير صالح.");
  }
  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body
        ? (body as BackendError).error
        : null;
    const message =
      typeof code === "string"
        ? (errorMessages[code] ?? `تعذّر تنفيذ الطلب (${code}).`)
        : `تعذّر تنفيذ الطلب (${response.status}).`;
    throw new BackendApiError(
      message,
      response.status,
      typeof code === "string" ? code : null,
    );
  }
  return body as T;
}
