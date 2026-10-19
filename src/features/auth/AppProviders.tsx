import type { ReactNode } from "react";
import { AuthProvider } from "./AuthContext";
import { PlatformProvider } from "./PlatformContext";
import { ThemeProvider } from "../theme/ThemeContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PlatformProvider>{children}</PlatformProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
