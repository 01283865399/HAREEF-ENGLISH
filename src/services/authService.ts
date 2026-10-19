import type { User } from "../types/domain";
import { getSupabaseClient, setRememberSession } from "../lib/supabase";
import { signOutAdminDemo } from "./adminDemoService";

declare global {
  interface Window {
    AlarrabAndroid?: {
      authRedirectUrl(
        route: "/auth/callback" | "/reset-password",
        nextPath: string,
      ): string;
      setDarkMode(isDark: boolean): void;
    };
  }
}

function getAuthRedirectUrl(
  route: "/auth/callback" | "/reset-password",
  nextPath = "/dashboard",
): string {
  if (window.AlarrabAndroid) {
    return window.AlarrabAndroid.authRedirectUrl(route, nextPath);
  }
  const redirectTo = new URL(route, window.location.origin);
  if (route === "/auth/callback") {
    redirectTo.searchParams.set("next", nextPath);
  }
  return redirectTo.toString();
}

export function mapSupabaseUser(
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  } | null,
): User | null {
  if (!user) return null;
  const metadataName = user.user_metadata?.full_name;
  return {
    id: user.id,
    name:
      typeof metadataName === "string" && metadataName.trim()
        ? metadataName
        : (user.email?.split("@")[0] ?? "الطالب"),
    email: user.email ?? "",
  };
}

export async function login(
  identifier: string,
  password: string,
  remember: boolean,
): Promise<User> {
  setRememberSession(remember);
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const email =
    normalizedIdentifier === "admin"
      ? import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase()
      : normalizedIdentifier;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      normalizedIdentifier === "admin"
        ? "اسم مستخدم الإدارة غير مربوط. أضف VITE_ADMIN_EMAIL إلى إعدادات الموقع."
        : "أدخل بريدًا إلكترونيًا صحيحًا.",
    );
  }
  signOutAdminDemo();
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(error.message);

  const user = mapSupabaseUser(data.user);
  if (!user)
    throw new Error("لم يُرجع Supabase بيانات المستخدم بعد تسجيل الدخول.");
  return user;
}

export async function loginWithGoogle(
  remember: boolean,
  destination: string,
): Promise<void> {
  setRememberSession(remember);
  signOutAdminDemo();
  const nextPath =
    destination.startsWith("/") && !destination.startsWith("//")
      ? destination
      : "/dashboard";
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: getAuthRedirectUrl("/auth/callback", nextPath) },
  });
  if (error)
    throw new Error(`تعذّر بدء تسجيل الدخول بحساب Google: ${error.message}`);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("أدخل بريدًا إلكترونيًا صحيحًا.");
  }
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(
    normalizedEmail,
    { redirectTo: getAuthRedirectUrl("/reset-password") },
  );
  if (error)
    throw new Error(`تعذّر إرسال رابط إعادة التعيين: ${error.message}`);
}

export async function setRecoveryPassword(newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error("يجب أن تتكوّن كلمة المرور من 8 أحرف على الأقل.");
  }
  const { error } = await getSupabaseClient().auth.updateUser({
    password: newPassword,
  });
  if (error) throw new Error(`تعذّر إعادة تعيين كلمة المرور: ${error.message}`);
}

export async function changePassword(
  user: User,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error("يجب أن تتكوّن كلمة المرور الجديدة من 8 أحرف على الأقل.");
  }
  const client = getSupabaseClient();
  const { error: reauthError } = await client.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError)
    throw new Error(`تعذّر تأكيد كلمة المرور الحالية: ${reauthError.message}`);
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw new Error(`تعذّر تغيير كلمة المرور: ${error.message}`);
}

export async function register(
  name: string,
  email: string,
  password: string,
  remember: boolean,
): Promise<User> {
  setRememberSession(remember);
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { full_name: name.trim() } },
  });
  if (error) throw new Error(error.message);

  const user = mapSupabaseUser(data.user);
  if (!user) throw new Error("لم يُرجع Supabase بيانات المستخدم بعد التسجيل.");
  if (!data.session) {
    throw new Error(
      "تم إنشاء الحساب. تحقّق من بريدك الإلكتروني لتفعيل الحساب قبل تسجيل الدخول.",
    );
  }
  return user;
}

export async function updateProfile(
  user: User,
  name: string,
  email: string,
): Promise<User> {
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedName || !normalizedEmail) {
    throw new Error("أدخل الاسم والبريد الإلكتروني.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("أدخل بريدًا إلكترونيًا صحيحًا.");
  }

  const { data, error } = await getSupabaseClient().auth.updateUser({
    email: normalizedEmail,
    data: { full_name: normalizedName },
  });
  if (error) throw new Error(error.message);
  if (data.user?.id !== user.id) {
    throw new Error("تعذّر التحقق من الحساب المحدّث.");
  }

  const updatedUser = mapSupabaseUser(data.user);
  if (!updatedUser) throw new Error("تعذّر تحميل بيانات الحساب بعد التحديث.");
  return updatedUser;
}

export async function getSession(): Promise<User | null> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw new Error(error.message);
  return mapSupabaseUser(data.session?.user ?? null);
}

export async function logout(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw new Error(error.message);
}
