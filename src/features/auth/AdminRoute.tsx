import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getAdminRole } from "../../services/orderService";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  isAdminDemoAvailable,
  isAdminDemoUser,
} from "../../services/adminDemoService";
import { useAuth } from "./AuthContext";

export function AdminRoute() {
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAllowed(false);
      return;
    }
    if (isAdminDemoUser(user)) {
      setError(null);
      setAllowed(true);
      return;
    }
    if (isAdminDemoAvailable() && !isSupabaseConfigured()) {
      setAllowed(false);
      return;
    }
    let active = true;
    setAllowed(null);
    setError(null);
    getAdminRole()
      .then((isAdmin) => {
        if (active) setAllowed(isAdmin);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "تعذّر التحقق من صلاحية الإدارة.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  if (isAdminDemoUser(user)) return <Outlet />;
  if (authLoading) {
    return (
      <div role="status" aria-live="polite">
        جارٍ التحقق من تسجيل الدخول...
      </div>
    );
  }
  if (!user) return <Navigate replace to="/login" />;
  if (error) return <div role="alert">{error}</div>;
  if (allowed === null) {
    return (
      <div role="status" aria-live="polite">
        جارٍ التحقق من صلاحية الإدارة...
      </div>
    );
  }
  return allowed ? <Outlet /> : <Navigate replace to="/dashboard" />;
}
