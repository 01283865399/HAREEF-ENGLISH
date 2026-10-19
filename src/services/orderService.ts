import { getSupabaseClient } from "../lib/supabase";
import { generateUuidV4 } from "../lib/uuid";
import { getAdminDemoSession } from "./adminDemoService";

export type PaymentMethod =
  "Vodafone Cash" | "Etisalat Cash" | "InstaPay" | "Fawry" | "Orange Cash";
export type OrderStatus = "pending" | "approved" | "rejected";

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case "Fawry":
      return "فوري";
    case "Orange Cash":
      return "أورنج كاش";
    case "Vodafone Cash":
      return "فودافون كاش";
    case "Etisalat Cash":
      return "اتصالات كاش";
    case "InstaPay":
      return "إنستاباي";
  }
}

export interface StudentProfile {
  full_name: string;
  email: string;
  phone: string;
  role: "student" | "admin";
}

export interface AdminOrder {
  id: string;
  user_id: string;
  course_id: string;
  amount: number;
  payment_method: PaymentMethod;
  sender_wallet_number: string;
  receipt_image_path: string;
  status: OrderStatus;
  created_at: string;
  profiles: Pick<StudentProfile, "full_name" | "email" | "phone">;
  courses: { title: string };
}

export interface StudentOrder {
  id: string;
  course_id: string;
  amount: number;
  payment_method: PaymentMethod;
  sender_wallet_number: string;
  status: OrderStatus;
  created_at: string;
  courses: { title: string };
}

export async function getStudentProfile(): Promise<StudentProfile> {
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .select("full_name, email, phone, role")
    .single();
  if (error) throw new Error(`تعذّر تحميل بيانات الحساب: ${error.message}`);
  return data;
}

export async function getMyCourseOrderStatus(
  courseId: string,
): Promise<OrderStatus | null> {
  const { data, error } = await getSupabaseClient()
    .from("orders")
    .select("status")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`تعذّر التحقق من حالة الطلب: ${error.message}`);
  return data?.status ?? null;
}

export async function getMyOrders(): Promise<StudentOrder[]> {
  if (getAdminDemoSession()) return [];
  const { data, error } = await getSupabaseClient()
    .from("orders")
    .select(
      "id, course_id, amount, payment_method, sender_wallet_number, status, created_at, courses!orders_course_id_fkey(title)",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`تعذّر تحميل طلبات اشتراكك: ${error.message}`);
  return (data ?? []).map((order) => {
    if (!order.courses) {
      throw new Error("بيانات الكورس غير متاحة لهذا الطلب.");
    }
    return { ...order, courses: order.courses };
  });
}

export async function submitCourseOrder(input: {
  userId: string;
  courseId: string;
  phone: string;
  paymentMethod: PaymentMethod;
  senderWalletNumber: string;
  receipt: File;
}): Promise<string> {
  const client = getSupabaseClient();
  const phone = input.phone.trim();
  const senderWalletNumber = input.senderWalletNumber.trim();
  if (!phone || !senderWalletNumber) {
    throw new Error("أدخل رقم هاتفك ورقم المحفظة التي أرسلت منها.");
  }
  if (!/^image\/(jpeg|png|webp)$/.test(input.receipt.type)) {
    throw new Error("ارفع صورة بصيغة JPG أو PNG أو WebP.");
  }
  if (input.receipt.size > 10 * 1024 * 1024) {
    throw new Error("يجب ألا يتجاوز حجم صورة الإيصال 10 ميجابايت.");
  }

  const { error: profileError } = await client
    .from("profiles")
    .update({ phone })
    .eq("id", input.userId)
    .select("id")
    .single();
  if (profileError) {
    throw new Error(
      `تعذّر حفظ رقم الهاتف في الملف الشخصي: ${profileError.message}`,
    );
  }

  const { data: course, error: courseError } = await client
    .from("courses")
    .select("is_free")
    .eq("id", input.courseId)
    .single();
  if (courseError)
    throw new Error(`تعذّر تحميل سعر الكورس: ${courseError.message}`);
  if (course.is_free)
    throw new Error("هذا الكورس مجاني ولا يحتاج إلى طلب دفع.");

  const extension = input.receipt.type.split("/")[1] ?? "jpg";
  const receiptPath = `${input.userId}/${generateUuidV4()}.${extension}`;
  const { error: uploadError } = await client.storage
    .from("payment-receipts")
    .upload(receiptPath, input.receipt, {
      contentType: input.receipt.type,
      upsert: false,
    });
  if (uploadError) {
    throw new Error(`تعذّر رفع إيصال الدفع: ${uploadError.message}`);
  }

  const { data, error: orderError } = await client
    .from("orders")
    .insert({
      user_id: input.userId,
      course_id: input.courseId,
      payment_method: input.paymentMethod,
      sender_wallet_number: senderWalletNumber,
      receipt_image_path: receiptPath,
    })
    .select("id")
    .single();

  if (orderError) {
    const { error: cleanupError } = await client.storage
      .from("payment-receipts")
      .remove([receiptPath]);
    if (cleanupError) {
      throw new Error(
        `تعذّر إنشاء الطلب (${orderError.message}) كما تعذّر حذف الإيصال المرفوع (${cleanupError.message}).`,
      );
    }
    if (
      orderError.code === "23505" &&
      orderError.message.includes("orders_one_pending_per_course")
    ) {
      throw new Error("لديك طلب دفع قيد المراجعة لهذا الكورس بالفعل.");
    }
    throw new Error(`تعذّر تسجيل طلب الاشتراك: ${orderError.message}`);
  }
  if (!data?.id) throw new Error("تم الإرسال دون إرجاع رقم الطلب.");
  return data.id;
}

export async function canAccessCourse(courseId: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient().rpc("can_access_course", {
    p_course_id: courseId,
  });
  if (error) throw new Error(`تعذّر التحقق من صلاحية الكورس: ${error.message}`);
  return data === true;
}

export async function getSignedCourseVideoUrl(
  storagePath: string,
): Promise<string> {
  const { data, error } = await getSupabaseClient()
    .storage.from("course-videos")
    .createSignedUrl(storagePath, 60 * 60);
  if (error) throw new Error(`تعذّر تجهيز رابط الفيديو: ${error.message}`);
  return data.signedUrl;
}

export async function getAdminOrders(
  status: OrderStatus,
): Promise<AdminOrder[]> {
  if (getAdminDemoSession()) return [];
  const { data, error } = await getSupabaseClient()
    .from("orders")
    .select(
      "id, user_id, course_id, amount, payment_method, sender_wallet_number, receipt_image_path, status, created_at, profiles!orders_user_id_fkey(full_name, email, phone), courses!orders_course_id_fkey(title)",
    )
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`تعذّر تحميل الطلبات: ${error.message}`);
  return (data ?? []).map((order) => {
    if (!order.profiles || !order.courses) {
      throw new Error("بيانات الطالب أو الكورس غير متاحة لهذا الطلب.");
    }
    return {
      ...order,
      profiles: order.profiles,
      courses: order.courses,
    };
  });
}

export async function getReceiptUrl(path: string): Promise<string> {
  const { data, error } = await getSupabaseClient()
    .storage.from("payment-receipts")
    .createSignedUrl(path, 5 * 60);
  if (error) throw new Error(`تعذّر فتح إيصال الدفع: ${error.message}`);
  return data.signedUrl;
}

export async function setOrderStatus(
  orderId: string,
  status: "approved" | "rejected",
): Promise<string | null> {
  const client = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError)
    throw new Error(`تعذّر التحقق من حساب المدير: ${userError.message}`);
  if (!user) throw new Error("سجّل الدخول قبل مراجعة طلب الاشتراك.");

  const { data, error } = await client
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`تعذّر تحديث الطلب: ${error.message}`);
  if (!data) throw new Error("لم يعد هذا الطلب معلقًا، حدّث القائمة.");
  const { error: logError } = await client.from("admin_activity_log").insert({
    actor_id: user.id,
    action: status === "approved" ? "اعتماد طلب اشتراك" : "رفض طلب اشتراك",
    details: orderId,
  });
  if (logError)
    return `تم تحديث حالة الطلب، لكن تعذّر تسجيل الإجراء الإداري: ${logError.message}`;
  return null;
}

export async function getAdminRole(): Promise<boolean> {
  const { data, error } = await getSupabaseClient().rpc("is_admin");
  if (error)
    throw new Error(`تعذّر التحقق من صلاحية الإدارة: ${error.message}`);
  return data === true;
}
