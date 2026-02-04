import React from "react";
import { useThrottledResize } from "@/hooks/useThrottledResize";
import styles from "./styles.module.scss";

export type FloatingButtonVariant = "consult" | "top" | "top-mobile";

export interface FloatingButtonProps {
  variant?: FloatingButtonVariant;
  className?: string;
  onClick?: () => void;
  label?: string;
}




// 위로 가기 아이콘
const TopIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_1125_28198)">
      <path
        d="M12 20.25V3.75"
        stroke="#2d2d2d"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.25 10.5L12 3.75L18.75 10.5"
        stroke="#2d2d2d"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_1125_28198">
        <rect width="24" height="24" fill="#2d2d2d" />
      </clipPath>
    </defs>
  </svg>
);

const FloatingButton: React.FC<FloatingButtonProps> = React.memo(({
  variant = "consult",
  className = "",
  onClick,
  label = "상담 신청하기",
}) => {
  const { isMobile } = useThrottledResize();
  // Consult button with label and icon
  if (variant === "consult") {
    if (isMobile) {
      return(
      <button
        className={` ${styles.floatingButtonConsultMobile}`}
        onClick={onClick}
        aria-label={label}
      >
        <span className={styles.floatingButtonLabel}>상담신청</span>
        
          <img src="/images/logo/logo_small_green.png" alt="" />
      </button>);
    } else {
      return (
        <button
          className={` ${styles.floatingButtonConsult} ${className}`}
          onClick={onClick}
          aria-label={label}
        >
          <span className={styles.floatingButtonLabel}>{label}</span>
          <span
            className={`${styles.floatingButtonIcon} ${styles.floatingButtonIconWrite}`}
          >
            <img src="/images/logo/logo_small.svg" alt="" />
          </span>
        </button>
      );
    }
  }

  // Top button (web and mobile versions)
  const topButtonClass =
    variant === "top-mobile"
      ? `${styles.floatingButton} ${styles.floatingButtonTop} ${styles.floatingButtonTopMobile}`
      : `${styles.floatingButton} ${styles.floatingButtonTop}`;

  return (
    <button
      className={`${topButtonClass} ${className}`}
      onClick={onClick}
      aria-label="맨 위로"
    >
      <TopIcon />
    </button>
  );
});

export default FloatingButton;
