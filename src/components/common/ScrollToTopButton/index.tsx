"use client";

import React from "react";
import { useThrottledScroll } from "@/hooks/useThrottledScroll";
import FloatingButton from "../FloatingButton";
import styles from "./styles.module.scss";

const SCROLL_THRESHOLD = 400;

/**
 * Global Scroll-to-Top button with visibility logic.
 * Hidden on initial load, fades in after scrolling 400px.
 * Uses throttled scroll listener for performance.
 */
export default function ScrollToTopButton() {
  const showButton = useThrottledScroll(SCROLL_THRESHOLD);
  const handleScrollTop = React.useCallback(
    () => window.scrollTo({ top: 0, behavior: "smooth" }),
    []
  );

  return (
    <div
      className={`${styles.wrapper} ${showButton ? styles.visible : ""}`}
      aria-hidden={!showButton}
    >
      <FloatingButton variant="top" onClick={handleScrollTop} />
    </div>
  );
}
