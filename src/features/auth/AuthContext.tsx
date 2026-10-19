/* eslint-disable react-refresh/only-export-components */
import {
  useEffect,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { getSupabaseClient, isSupabaseConfigured } from "../../lib/supabase";
import {
  getAdminDemoSession,
  signInAdminDemo,
  signOutAdminDemo,
  isAdminDemoUser,
  isAdminDemoCredentials,
} from "../../services/adminDemoService";
import {
  getSession,
  login,
  logout,
  mapSupabaseUser,
  register,
  updateProfile as updateProfileRequest,
} from "../../services/authService";
import type { User } from "../../types/domain";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: "started" }
  | { type: "authenticated"; user: User }
  | { type: "failed"; message: string }
  | { type: "signed-out" };

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string, remember: boolean) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string,
    remember: boolean,
  ) => Promise<void>;
  updateProfile: (name: string, email: string) => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "started":
      return { ...state, loading: true, error: null };
    case "authenticated":
      return { user: action.user, loading: false, error: null };
    case "failed":
      return { ...state, loading: false, error: action.message };
    case "signed-out":
      return { user: null, loading: false, error: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const demoUser = getAdminDemoSession();
    if (demoUser) {
      dispatch({ type: "authenticated", user: demoUser });
      return () => {
        active = false;
      };
    }
    if (!isSupabaseConfigured()) {
      dispatch({ type: "signed-out" });
      return () => {
        active = false;
      };
    }

    try {
      const {
        data: { subscription },
      } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        const user = mapSupabaseUser(session?.user ?? null);
        dispatch(
          user ? { type: "authenticated", user } : { type: "signed-out" },
        );
      });
      unsubscribe = () => subscription.unsubscribe();

      void getSession()
        .then((user) => {
          if (active)
            dispatch(
              user ? { type: "authenticated", user } : { type: "signed-out" },
            );
        })
        .catch((error: unknown) => {
          if (!active) return;
          dispatch({
            type: "failed",
            message:
              error instanceof Error
                ? error.message
                : "تعذّر التحقق من الجلسة.",
          });
        });
    } catch (error) {
      dispatch({
        type: "failed",
        message:
          error instanceof Error ? error.message : "تعذّر الاتصال بـ Supabase.",
      });
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, remember: boolean) => {
      dispatch({ type: "started" });
      try {
        if (isAdminDemoCredentials(email, password)) {
          dispatch({
            type: "authenticated",
            user: signInAdminDemo(email, password, remember),
          });
          return;
        }
        dispatch({
          type: "authenticated",
          user: await login(email, password, remember),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "تعذّر تسجيل الدخول.";
        dispatch({ type: "failed", message });
        throw error;
      }
    },
    [],
  );

  const signUp = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      remember: boolean,
    ) => {
      dispatch({ type: "started" });
      try {
        dispatch({
          type: "authenticated",
          user: await register(name, email, password, remember),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "تعذّر إنشاء الحساب.";
        dispatch({ type: "failed", message });
        throw error;
      }
    },
    [],
  );

  const updateProfile = useCallback(
    async (name: string, email: string) => {
      dispatch({ type: "started" });
      try {
        if (!state.user) throw new Error("يجب تسجيل الدخول لتعديل الحساب.");
        const user = await updateProfileRequest(state.user, name, email);
        dispatch({
          type: "authenticated",
          user,
        });
        return user;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "تعذّر تحديث الحساب.";
        dispatch({ type: "failed", message });
        throw error;
      }
    },
    [state.user],
  );

  const signOut = useCallback(async () => {
    dispatch({ type: "started" });
    try {
      if (isAdminDemoUser(state.user)) signOutAdminDemo();
      else await logout();
      dispatch({ type: "signed-out" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذّر تسجيل الخروج.";
      dispatch({ type: "failed", message });
      throw error;
    }
  }, [state.user]);

  const value = useMemo(
    () => ({ ...state, signIn, signUp, updateProfile, signOut }),
    [signIn, signOut, signUp, updateProfile, state],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
