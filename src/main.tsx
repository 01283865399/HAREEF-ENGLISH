import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./features/auth/AppProviders";
import { LenisProvider } from "./features/scroll/LenisProvider";
import { router } from "./router";

const preloader = document.getElementById("page-preloader");
if (preloader) {
  let showPreloader = true;
  try {
    showPreloader =
      window.sessionStorage.getItem("alarrab:preloader-shown") !== "true";
    if (showPreloader) {
      window.sessionStorage.setItem("alarrab:preloader-shown", "true");
    }
  } catch (error) {
    console.warn("Unable to persist the preloader session state.", error);
  }

  if (!showPreloader) {
    preloader.remove();
  } else {
    const startedAt = performance.now();
    const hidePreloader = () => {
      const remaining = Math.max(0, 800 - (performance.now() - startedAt));
      window.setTimeout(
        () => preloader.classList.add("preloaderHidden"),
        remaining,
      );
    };

    if (document.readyState === "complete") {
      hidePreloader();
    } else {
      window.addEventListener("load", hidePreloader, { once: true });
    }
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <LenisProvider>
        <RouterProvider router={router} />
      </LenisProvider>
    </AppProviders>
  </React.StrictMode>,
);
