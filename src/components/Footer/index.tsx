import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useFooter } from "@/context/FooterContext";
import styles from "./styles.module.scss";

const Footer: React.FC = () => {
  const router = useRouter();
  const { familySites, familySitesLoading, familySitesError } = useFooter();

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Check if family sites are available
  const hasFamilySites = familySites.length > 0 && !familySitesError;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!hasFamilySites) return;

      switch (event.key) {
        case "Enter":
        case " ":
          event.preventDefault();
          if (!isDropdownOpen) {
            setIsDropdownOpen(true);
            setFocusedIndex(0);
          } else if (focusedIndex >= 0 && focusedIndex < familySites.length) {
            // Select the focused item
            const site = familySites[focusedIndex];
            window.open(site.url, "_blank", "noopener,noreferrer");
            setIsDropdownOpen(false);
            setFocusedIndex(-1);
            buttonRef.current?.focus();
          }
          break;

        case "ArrowDown":
          event.preventDefault();
          if (!isDropdownOpen) {
            setIsDropdownOpen(true);
            setFocusedIndex(0);
          } else {
            setFocusedIndex((prev) =>
              prev < familySites.length - 1 ? prev + 1 : prev
            );
          }
          break;

        case "ArrowUp":
          event.preventDefault();
          if (isDropdownOpen) {
            setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          }
          break;

        case "Escape":
          event.preventDefault();
          setIsDropdownOpen(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
          break;

        case "Tab":
          setIsDropdownOpen(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [isDropdownOpen, focusedIndex, familySites, hasFamilySites]
  );

  // Scroll focused item into view
  useEffect(() => {
    if (isDropdownOpen && focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("li");
      if (items[focusedIndex]) {
        items[focusedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex, isDropdownOpen]);

  const handleDropdownToggle = () => {
    if (!hasFamilySites) return;
    setIsDropdownOpen(!isDropdownOpen);
    setFocusedIndex(-1);
  };

  const handleSiteClick = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    setIsDropdownOpen(false);
    setFocusedIndex(-1);
  };

  const handlePolicyClick = (type: "TERMS" | "PRIVACY") => {
    router.push(`/policy?type=${type}`);
  };

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footer__top}>
          <div className={styles.footer__logo}>
            <img src="/images/logo/logo.svg" alt="" />
          </div>
          <div className={styles.footer__links}>
            <div className={styles.footer__link}>
              <a onClick={() => handlePolicyClick("TERMS")}>서비스이용약관</a>
              <a onClick={() => handlePolicyClick("PRIVACY")}>
                개인정보처리방침
              </a>
            </div>

            {/* Family Sites Dropdown */}
            <div
              className={styles.familySiteDropdown}
              ref={dropdownRef}
              onKeyDown={handleKeyDown}
            >
              <button
                ref={buttonRef}
                className={`${styles["family-btn"]} ${
                  !hasFamilySites ? styles["family-btn--disabled"] : ""
                }`}
                onClick={handleDropdownToggle}
                disabled={!hasFamilySites || familySitesLoading}
                aria-expanded={isDropdownOpen}
                aria-haspopup="listbox"
                aria-label="패밀리 사이트 선택"
              >
                {familySitesLoading ? (
                  "로딩 중..."
                ) : (
                  <>
                    패밀리 사이트{" "}
                    <span
                      className={`${styles.dropdownArrow} ${
                        isDropdownOpen ? styles.dropdownArrowOpen : ""
                      }`}
                    >
                      →
                    </span>
                  </>
                )}
              </button>

              {isDropdownOpen && hasFamilySites && (
                <ul
                  ref={listRef}
                  className={styles.familySiteList}
                  role="listbox"
                  aria-label="패밀리 사이트 목록"
                >
                  {familySites.map((site, index) => (
                    <li
                      key={site.id}
                      role="option"
                      aria-selected={focusedIndex === index}
                      className={`${styles.familySiteItem} ${
                        focusedIndex === index ? styles.familySiteItemFocused : ""
                      }`}
                      onClick={() => handleSiteClick(site.url)}
                    >
                      {site.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className={styles.footer__bottom}>
          <p className={styles.copyright}>
            2025 TAX ACCOUNTING TOGETHER all rights reserved.
          </p>
          <nav className={styles.footer__menu}>
            <a onClick={() => router.push("/business-areas/hierarchical")}>
              업무분야
            </a>
            <a onClick={() => router.push("/experts")}>전문가 소개</a>
            <a onClick={() => router.push("/education")}>교육/세미나</a>
            <a onClick={() => router.push("/history?tab=intro")}>함께소개</a>
            <a onClick={() => router.push("/insights")}>인사이트</a>
            <a onClick={() => router.push("/consultation/apply")}>상담 신청</a>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
