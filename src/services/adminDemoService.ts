import type { User } from "../types/domain";

const demoCredentialsKey = "alarrab-admin-demo-credentials";
const demoSessionKey = "alarrab-admin-demo-session";
const demoUserId = "local-admin-demo";

interface DemoCredentials {
  username: string;
  password: string;
}

function isLoopbackHost(): boolean {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

export function isAdminDemoAvailable(): boolean {
  return import.meta.env.DEV && isLoopbackHost();
}

function readCredentials(): DemoCredentials {
  const saved = window.localStorage.getItem(demoCredentialsKey);
  if (!saved) return { username: "admin", password: "1234" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch (reason) {
    throw new Error(
      `تعذّرت قراءة بيانات الدخول التجريبية: ${reason instanceof Error ? reason.message : "صيغة التخزين غير صحيحة."}`,
    );
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("username" in parsed) ||
    !("password" in parsed) ||
    typeof parsed.username !== "string" ||
    typeof parsed.password !== "string"
  ) {
    throw new Error("بيانات الدخول التجريبية المحفوظة غير صالحة.");
  }
  return { username: parsed.username, password: parsed.password };
}

export function getAdminDemoUsername(): string {
  return readCredentials().username;
}

function demoUser(): User {
  return {
    id: demoUserId,
    name: "مدير تجريبي",
    email: "admin@local-demo.invalid",
  };
}

export function isAdminDemoUser(user: User | null): boolean {
  return user?.id === demoUserId && isAdminDemoAvailable();
}

export function isAdminDemoCredentials(
  username: string,
  password: string,
): boolean {
  if (!isAdminDemoAvailable()) return false;
  const credentials = readCredentials();
  return (
    username.trim().toLowerCase() === credentials.username &&
    password === credentials.password
  );
}

export function getAdminDemoSession(): User | null {
  if (!isAdminDemoAvailable()) return null;
  const session =
    window.localStorage.getItem(demoSessionKey) ??
    window.sessionStorage.getItem(demoSessionKey);
  return session === "active" ? demoUser() : null;
}

export function signInAdminDemo(
  username: string,
  password: string,
  remember: boolean,
): User {
  if (!isAdminDemoAvailable()) {
    throw new Error("الدخول التجريبي متاح محليًا في وضع التطوير فقط.");
  }
  if (!isAdminDemoCredentials(username, password)) {
    throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة.");
  }
  const storage = remember ? window.localStorage : window.sessionStorage;
  const otherStorage = remember ? window.sessionStorage : window.localStorage;
  storage.setItem(demoSessionKey, "active");
  otherStorage.removeItem(demoSessionKey);
  return demoUser();
}

export function signOutAdminDemo(): void {
  window.localStorage.removeItem(demoSessionKey);
  window.sessionStorage.removeItem(demoSessionKey);
}

export function changeAdminDemoCredentials(
  username: string,
  currentPassword: string,
  newPassword: string,
): void {
  if (!isAdminDemoAvailable()) {
    throw new Error("تغيير بيانات التجربة متاح محليًا في وضع التطوير فقط.");
  }
  const credentials = readCredentials();
  if (currentPassword !== credentials.password) {
    throw new Error("كلمة المرور الحالية غير صحيحة.");
  }
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) throw new Error("أدخل اسم مستخدم.");
  if (newPassword.length < 4) {
    throw new Error("يجب أن تتكوّن كلمة المرور من 4 أحرف على الأقل.");
  }
  window.localStorage.setItem(
    demoCredentialsKey,
    JSON.stringify({ username: normalizedUsername, password: newPassword }),
  );
}
