const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("HareefDesktop", {
  authRedirectUrl(route, nextPath) {
    const allowedRoutes = new Set(["/auth/callback", "/reset-password"]);
    if (!allowedRoutes.has(route)) {
      throw new Error("Unsupported authentication callback route.");
    }
    const url = new URL(
      route === "/auth/callback"
        ? "hareefenglish://auth/callback"
        : "hareefenglish://auth/reset-password",
    );
    if (route === "/auth/callback") {
      const next = new URL(nextPath || "/dashboard", "https://hareef.invalid");
      url.searchParams.set(
        "next",
        next.origin === "https://hareef.invalid"
          ? next.pathname + next.search
          : "/dashboard",
      );
    }
    return url.toString();
  },
});
