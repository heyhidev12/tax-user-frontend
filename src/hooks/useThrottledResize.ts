import { useEffect, useState } from "react";

const RESIZE_THROTTLE_MS = 150;

/**
 * Throttled resize handler to prevent excessive state updates and re-renders.
 * Returns isMobile (width <= 768) and windowWidth.
 */
export function useThrottledResize() {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return { isMobile: false, windowWidth: 1024 };
    const w = window.innerWidth;
    return { isMobile: w <= 768, windowWidth: w };
  });

  useEffect(() => {
    let rafId: number | null = null;
    let lastRun = 0;

    const check = () => {
      const w = window.innerWidth;
      setState({ isMobile: w <= 768, windowWidth: w });
    };

    check(); // Initial check on mount (client-only)

    const handler = () => {
      const now = Date.now();
      if (now - lastRun >= RESIZE_THROTTLE_MS) {
        lastRun = now;
        check();
      } else if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          lastRun = Date.now();
          check();
        });
      }
    };

    window.addEventListener("resize", handler, { passive: true });
    return () => {
      window.removeEventListener("resize", handler);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return state;
}
