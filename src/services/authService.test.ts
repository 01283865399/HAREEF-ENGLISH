import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, setRememberSession } = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    signUp: vi.fn(),
    updateUser: vi.fn(),
    getSession: vi.fn(),
    signOut: vi.fn(),
  },
  setRememberSession: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: () => ({ auth }),
  setRememberSession,
}));

import {
  getSession,
  login,
  loginWithGoogle,
  register,
  requestPasswordReset,
  setRecoveryPassword,
  updateProfile,
} from "./authService";

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "AlarrabAndroid", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "HareefDesktop", {
      configurable: true,
      value: undefined,
    });
  });

  it("signs in with Supabase and maps the authenticated user", async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "abdullah@example.com",
          user_metadata: { full_name: "عبدالله" },
        },
      },
      error: null,
    });

    const user = await login(" ABDULLAH@example.com ", "secret123", false);

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "abdullah@example.com",
      password: "secret123",
    });
    expect(setRememberSession).toHaveBeenCalledWith(false);
    expect(user.name).toBe("عبدالله");
    expect(user.email).toBe("abdullah@example.com");
  });

  it("reports Supabase login errors", async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "بيانات الدخول غير صحيحة" },
    });

    await expect(
      login("abdullah@example.com", "wrongpass", true),
    ).rejects.toThrow("بيانات الدخول غير صحيحة");
  });

  it("reports when Supabase requires email confirmation after registration", async () => {
    auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "abdullah@example.com",
          user_metadata: { full_name: "عبدالله" },
        },
        session: null,
      },
      error: null,
    });

    await expect(
      register("عبدالله", "abdullah@example.com", "secret123", true),
    ).rejects.toThrow(/تحقّق من بريدك الإلكتروني/);
  });

  it("restores the current Supabase session", async () => {
    auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "abdullah@example.com",
            user_metadata: { full_name: "عبدالله" },
          },
        },
      },
      error: null,
    });

    await expect(getSession()).resolves.toMatchObject({
      id: "user-1",
      name: "عبدالله",
      email: "abdullah@example.com",
    });
  });

  it("updates account metadata using Supabase Auth", async () => {
    auth.updateUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "abdullah@example.com",
          user_metadata: { full_name: "عبدالله الجديد" },
        },
      },
      error: null,
    });

    await expect(
      updateProfile(
        { id: "user-1", name: "عبدالله", email: "abdullah@example.com" },
        "عبدالله الجديد",
        "abdullah@example.com",
      ),
    ).resolves.toMatchObject({ name: "عبدالله الجديد" });
  });

  it("requests password reset using an app-local redirect", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });

    await requestPasswordReset("student@example.com");

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "student@example.com",
      expect.objectContaining({
        redirectTo: expect.stringMatching(/\/reset-password$/),
      }),
    );
  });

  it("uses the Android deep link for password recovery when running in the app", async () => {
    const authRedirectUrl = vi.fn((route: string) => `alarrab://auth${route}`);
    Object.defineProperty(window, "AlarrabAndroid", {
      configurable: true,
      value: { authRedirectUrl },
    });
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });

    await requestPasswordReset("student@example.com");

    expect(authRedirectUrl).toHaveBeenCalledWith(
      "/reset-password",
      "/dashboard",
    );
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "student@example.com",
      { redirectTo: "alarrab://auth/reset-password" },
    );
  });

  it("starts Google OAuth with a safe local callback destination", async () => {
    auth.signInWithOAuth.mockResolvedValue({ error: null });

    await loginWithGoogle(true, "//attacker.example");

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: expect.stringMatching(
          /\/auth\/callback\?next=%2Fdashboard$/,
        ),
      },
    });
    expect(setRememberSession).toHaveBeenCalledWith(true);
  });

  it("uses the Android deep link for Google OAuth when running in the app", async () => {
    const authRedirectUrl = vi.fn(
      (route: string, next: string) => `alarrab://auth${route}?next=${next}`,
    );
    Object.defineProperty(window, "AlarrabAndroid", {
      configurable: true,
      value: { authRedirectUrl },
    });
    auth.signInWithOAuth.mockResolvedValue({ error: null });

    await loginWithGoogle(true, "/courses");

    expect(authRedirectUrl).toHaveBeenCalledWith("/auth/callback", "/courses");
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "alarrab://auth/auth/callback?next=/courses" },
    });
  });

  it("uses the Windows app link for Google OAuth when running in the desktop app", async () => {
    const authRedirectUrl = vi.fn(
      (_route: string, next: string) =>
        `hareefenglish://auth/callback?next=${next}`,
    );
    Object.defineProperty(window, "HareefDesktop", {
      configurable: true,
      value: { authRedirectUrl },
    });
    auth.signInWithOAuth.mockResolvedValue({ error: null });

    await loginWithGoogle(true, "/courses");

    expect(authRedirectUrl).toHaveBeenCalledWith("/auth/callback", "/courses");
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "hareefenglish://auth/callback?next=/courses",
      },
    });
  });

  it("uses the Windows app link for password recovery", async () => {
    const authRedirectUrl = vi.fn((route: string) => {
      expect(route).toBe("/reset-password");
      return "hareefenglish://auth/reset-password";
    });
    Object.defineProperty(window, "HareefDesktop", {
      configurable: true,
      value: { authRedirectUrl },
    });
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });

    await requestPasswordReset("student@example.com");

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "student@example.com",
      { redirectTo: "hareefenglish://auth/reset-password" },
    );
  });

  it("rejects weak recovery passwords before contacting Supabase", async () => {
    await expect(setRecoveryPassword("short")).rejects.toThrow(
      /8 أحرف على الأقل/,
    );
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});
