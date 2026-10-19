import Lenis from "lenis";
import { useEffect, useState, type ReactNode } from "react";
import { LenisContext } from "./LenisContext";

export function LenisProvider({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setLenis(null);
      return undefined;
    }

    const instance = new Lenis({
      autoRaf: false,
      anchors: { offset: -24, duration: 1 },
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      respectReducedMotion: true,
    });
    let frameId = 0;
    let active = true;

    const raf = (time: number) => {
      if (!active) return;
      instance.raf(time);
      frameId = window.requestAnimationFrame(raf);
    };

    setLenis(instance);
    frameId = window.requestAnimationFrame(raf);

    return () => {
      active = false;
      window.cancelAnimationFrame(frameId);
      instance.destroy();
    };
  }, [reducedMotion]);

  return (
    <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>
  );
}
