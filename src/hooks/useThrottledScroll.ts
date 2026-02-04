import { useEffect, useState } from "react";

const SCROLL_THROTTLE_MS = 100;

/**
 * Throttled scroll handler to prevent excessive state updates.
 * Returns whether scroll position is past the threshold (default 400px).
 */
export function useThrottledScroll(threshold = 400) {
  const [isPastThreshold, setIsPastThreshold] = useState(false);

  useEffect(() => {
    let rafId: number | null = null;
    let lastRun = 0;

    const check = () => {
      setIsPastThreshold(window.scrollY >= threshold);
    };

    const handler = () => {
      const now = Date.now();
      if (now - lastRun >= SCROLL_THROTTLE_MS) {
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

    check(); // Initial check
    window.addEventListener("scroll", handler, { passive: true });
    return () => {
      window.removeEventListener("scroll", handler);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [threshold]);

  return isPastThreshold;
}
