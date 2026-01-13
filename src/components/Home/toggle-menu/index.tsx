import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "./toggle.module.scss";
import classNames from "classnames";
import { MENU_ITEMS, MenuItemConfig } from "@/components/Menu/constants";

interface ToggleMenuProps {
  open: boolean;
  onClose: () => void;
  isLoggedIn?: boolean;
  // 확장: 헤더(Menu) 컴포넌트에서 전달하는 메뉴/상태/핸들러
  menuItems?: MenuItemConfig[];
  selectedItemId?: string;
  selectedSubItemIndex?: number | null;
  onMainItemClick?: (id: string) => void;
  onSubItemClick?: (subItem: string, index: number) => void;
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  onMyPageClick?: () => void;
  onConsultationClick?: () => void;
}

export default function ToggleMenu({
  open,
  onClose,
  isLoggedIn = false,
  menuItems,
  selectedItemId,
  selectedSubItemIndex,
  onMainItemClick,
  onSubItemClick,
  onLoginClick,
  onSignupClick,
  onMyPageClick,
  onConsultationClick,
}: ToggleMenuProps) {
  // 독립 사용(홈 전용 등)을 위한 로컬 상태
  const [localActiveId, setLocalActiveId] = useState<string | null>("about");
  const [localSelectedSubIndex, setLocalSelectedSubIndex] = useState<number | null>(null);
  const router = useRouter();

  const effectiveMenuItems: MenuItemConfig[] =
    menuItems ??
    MENU_ITEMS.concat([
      // 신고 대리 단독 링크 (구 UI 유지용)
      { id: "agency", title: "신고 대리", subItems: [] },
    ]);

  const activeId = selectedItemId ?? localActiveId;
  const effectiveSelectedSubIndex = selectedSubItemIndex ?? localSelectedSubIndex;

  const handleMainItemClick = (item: MenuItemConfig) => {
    if (onMainItemClick) {
      onMainItemClick(item.id);
    } else {
      // 서브 메뉴가 있는 경우만 토글
      if (item.subItems.length > 0) {
        setLocalActiveId((prev) => (prev === item.id ? null : item.id));
      }
    }
  };

  const handleSubItemClick = (item: MenuItemConfig, subItem: string, index: number) => {
    // Menu 컴포넌트에서 핸들러를 내려준 경우 (기존 프로젝트 로직 재사용)
    if (onSubItemClick) {
      onSubItemClick(subItem, index);
      return;
    }

    // 홈 전용 등 독립 사용 시: 기존 Menu 서브메뉴 라우팅 로직을 동일하게 적용
    setLocalSelectedSubIndex(index);
    onClose();

    const rootId = item.id ?? activeId;

    if (!rootId) return;

    if (rootId === "services") {
      // Use subItemIds if available (from API data)
      const servicesItem = effectiveMenuItems.find(mi => mi.id === "services");
      if (servicesItem && servicesItem.subItemIds && servicesItem.subItemIds.length > index) {
        const categoryId = servicesItem.subItemIds[index];
        router.push(`/business-areas/hierarchical?tab=${categoryId}`);
      } else {
        // Fallback for standalone use without API data
        router.push("/business-areas/hierarchical");
      }
    } else if (rootId === "about") {
      const tabMap: { [key: string]: string } = {
        소개: "intro",
        연혁: "history",
        "수상/인증": "awards",
        "본점/지점 안내": "branches",
        "주요 고객": "customers",
        CI가이드: "ci",
      };
      const tab = tabMap[subItem];
      if (tab) {
        router.push(`/history?tab=${tab}`);
      }
    } else if (rootId === "insight") {
      if (subItem === "칼럼") {
        router.push("/insights?tab=column");
      }
    }
  };

  return (
    <div className={classNames(styles.drawer, { [styles.open]: open })}>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Panel */}
      <aside className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <img src="/images/logo/logo_main.png" alt="세무법인 함께" />
          </div>
          <div className={styles.authSection}>
            {isLoggedIn ? (
              <button
                type="button"
                className={styles.myPageLink}
                onClick={() => {
                  if (onMyPageClick) {
                    onMyPageClick();
                  } else {
                    onClose();
                    router.push("/my");
                  }
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>My Page</span>
              </button>
            ) : (
              <div className={styles.authLinks}>
                <button
                  type="button"
                  onClick={() => {
                    if (onLoginClick) {
                      onLoginClick();
                    } else {
                      onClose();
                      router.push("/login");
                    }
                  }}
                >
                  로그인
                </button>
                <span className={styles.divider}>|</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onSignupClick) {
                      onSignupClick();
                    } else {
                      onClose();
                      router.push("/signup");
                    }
                  }}
                >
                  회원가입
                </button>
              </div>
            )}
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="닫기"
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </header>

        {/* Auth Links */}

        {/* Menu Navigation */}
        <nav className={styles.menu}>
          {effectiveMenuItems.map((item) => (
            <div key={item.id} className={styles.menuGroup}>
              {/* Menu Item Header */}
              <div
                className={classNames(styles.menuItem, {
                  [styles.active]: activeId === item.id,
                })}
                onClick={() => {
                  // "신고 대리" 항목은 클릭 시 바로 이동
                  if (item.id === "agency" && item.subItems.length === 0) {
                    if (onConsultationClick) {
                      onConsultationClick();
                    } else if (onMainItemClick) {
                      onMainItemClick(item.id);
                    } else {
                      onClose();
                      router.push("/consultation/apply");
                    }
                  } else {
                    handleMainItemClick(item);
                  }
                }}
              >
                <span className={styles.menuTitle}>{item.title}</span>
                {item.subItems.length > 0 ? (
                  <span className={styles.toggleIcon}>
                    {activeId === item.id ? "−" : "+"}
                  </span>
                ) : (
                  <button
                    type="button"
                    className={styles.arrowIcon}
                    onClick={(e) => {
                      e.stopPropagation();
                      // "신고 대리" 등 단일 링크 처리
                      if (item.id === "agency") {
                        if (onConsultationClick) {
                        onConsultationClick();
                        } else if (onMainItemClick) {
                          onMainItemClick(item.id);
                        } else {
                        onClose();
                        router.push("/consultation/apply");
                        }
                      }
                    }}
                  >
                    {">"}
                  </button>
                )}
              </div>

              {/* Submenu */}
              {item.subItems.length > 0 && activeId === item.id && (
                <ul className={styles.subMenu}>
                  {item.subItems.map((child, index) => (
                    <li
                      key={child}
                      className={classNames(styles.subMenuItem, {
                        [styles.active]:
                          activeId === item.id &&
                          effectiveSelectedSubIndex !== null &&
                          effectiveSelectedSubIndex === index,
                      })}
                      onClick={() => handleSubItemClick(item, child, index)}
                    >
                      {child}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>

        {/* Desktop Logo Watermark */}
        <div className={styles.logoWatermark}>
          <img src="/images/home/Vector.svg" alt="" />
        </div>
      </aside>
    </div>
  );
}
