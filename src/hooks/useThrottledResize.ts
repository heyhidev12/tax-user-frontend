import { useEffect, useState } from "react";

const RESIZE_THROTTLE_MS = 150;

/**
 * Throttled resize handler to prevent excessive state updates and re-renders.
 * Returns isMobile (width <= 768) and windowWidth.
 * 
 * Important: Always initializes with default values to prevent hydration mismatch,
 * then updates to actual values after mount.
 */
export function useThrottledResize() {
  // Always start with consistent default values to prevent hydration mismatch
  const [state, setState] = useState({ isMobile: false, windowWidth: 1024 });

  useEffect(() => {
    let rafId: number | null = null;
    let lastRun = 0;

    const check = () => {
      const w = window.innerWidth;
      setState({ isMobile: w <= 768, windowWidth: w });
    };

    check(); // Initial check on mount (client-only) - updates to real values

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
