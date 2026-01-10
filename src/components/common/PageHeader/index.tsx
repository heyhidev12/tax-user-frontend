import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { TOP_LEVEL_PAGES } from "./constants";
// 스타일은 _app.tsx에서 글로벌로 import됨

export type PageHeaderSize = "web" | "mobile";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface TabItem {
  id: string;
  label: string;
}

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectConfig {
  value: string | number;
  options: SelectOption[];
  onChange: (value: string | number) => void;
}

export interface SelectsConfig {
  level1?: SelectConfig;
  level2?: SelectConfig;
  level3?: SelectConfig;
  level4?: SelectConfig;
}

export interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  selects?: SelectsConfig;
  tabs?: TabItem[];
  activeTabId?: string;
  onTabChange?: (id: string) => void;
  size?: PageHeaderSize;
  className?: string;
}

// 홈 아이콘
const HomeIcon: React.FC<{ size?: "web" | "mobile" }> = ({ size = "web" }) => {
  const iconSize = size === "web" ? 20 : 16;
  return (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 17 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.600098 17.6292V7.62922L8.1001 0.811035L15.6001 7.62922V17.6292H0.600098Z"
        stroke="#1d1d1d"
        strokeWidth="1.2"
      />
      <rect
        x="5.6001"
        y="10.811"
        width="5"
        height="6.66667"
        rx="0.833333"
        stroke="#1d1d1d"
        strokeWidth="1.2"
      />
    </svg>
  );
};

// 화살표 아이콘
const ArrowIcon: React.FC = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M7.25 15.25L12.75 10.25L7.25 5.25"
      stroke="#BEBEC7"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

// Select Dropdown Component
interface SelectDropdownProps {
  config: SelectConfig;
  className?: string;
}

const SelectDropdown: React.FC<SelectDropdownProps> = ({
  config,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = config.options.find(
    (opt) => opt.value === config.value
  );
  const hasMultipleOptions = config.options.length > 1;

  const handleSelect = (option: SelectOption) => {
    config.onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div
      className={`page-header__select ${className} ${
        !hasMultipleOptions ? "page-header__select--single" : ""
      }`}
      ref={selectRef}
    >
      {hasMultipleOptions ? (
        <>
          <button
            type="button"
            className="page-header__select-trigger"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="page-header__select-value">
              {selectedOption?.label || ""}
            </span>
            <svg
              className={`page-header__select-arrow ${
                isOpen ? "page-header__select-arrow--open" : ""
              }`}
              width="20"
              height="20"
              viewBox="0 0 12 12"
              fill="none"
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#555"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {isOpen && (
            <div className="page-header__select-dropdown">
              {config.options.map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  className={`page-header__select-option ${
                    config.value === option.value
                      ? "page-header__select-option--selected"
                      : ""
                  }`}
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                  <svg
                    className={"page-header__option-arrow"}
                    width="20"
                    height="20"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M3 4.5L6 7.5L9 4.5"
                      stroke="#555"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        // Single option - display as static text (looks like select but no dropdown)
        <span className="page-header__select-trigger page-header__select-trigger--static">
          <span className="page-header__select-value">
            {selectedOption?.label || ""}
          </span>
        </span>
      )}
    </div>
  );
};

// 활성 탭 표시 점
const ActiveDot: React.FC = () => <span className="page-header__tab-dot" />;

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs = [],
  selects,
  tabs = [],
  activeTabId,
  onTabChange,
  size = "web",
  className = "",
}) => {
  const router = useRouter();

  // Auto-generate selects from breadcrumbs
  const autoGeneratedSelects = useMemo(() => {
    // Determine current page path for level1
    const getCurrentPagePath = () => {
      const pathname = router.pathname;
      if (pathname.startsWith("/business-areas"))
        return "/business-areas/hierarchical";
      if (pathname.startsWith("/experts")) return "/experts";
      if (pathname.startsWith("/education")) return "/education";
      if (pathname.startsWith("/history") || pathname.startsWith("/about"))
        return "/history?tab=intro";
      if (pathname.startsWith("/insights")) return "/insights";
      if (pathname.startsWith("/consultation")) return "/consultation/apply";
      if (pathname.startsWith("/my")) return "/my";
      return "/business-areas/hierarchical";
    };

    const currentPagePath = getCurrentPagePath();

    // Always generate level1 select from top-level pages
    const level1Select: SelectConfig = {
      value: currentPagePath,
      options: TOP_LEVEL_PAGES.map((page) => ({
        label: page.label,
        value: page.value,
      })),
      onChange: (value: string | number) => {
        router.push(String(value));
      },
    };

    // Start with provided selects (if any), but always use auto-generated level1
    const mergedSelects: SelectsConfig = {
      level1: level1Select,
      ...(selects?.level2 && { level2: selects.level2 }),
      ...(selects?.level3 && { level3: selects.level3 }),
      ...(selects?.level4 && { level4: selects.level4 }),
    };

    // If no custom selects provided, generate from breadcrumbs
    if (!selects?.level2 && !selects?.level3 && !selects?.level4) {
      // Generate additional selects from breadcrumbs (in order)
      // Skip the first breadcrumb as it's usually the top-level page handled by level1
      const breadcrumbsForSelects = breadcrumbs.filter((crumb, index) => {
        // If first breadcrumb matches a top-level page, skip it
        if (index === 0) {
          const matchesTopLevel = TOP_LEVEL_PAGES.some(
            (page) =>
              page.value === currentPagePath && page.label === crumb.label
          );
          return !matchesTopLevel;
        }
        return true;
      });

      // Level 2: Second breadcrumb (if exists)
      if (breadcrumbsForSelects.length > 0) {
        const level2Breadcrumb = breadcrumbsForSelects[0];
        mergedSelects.level2 = {
          value: level2Breadcrumb.href || level2Breadcrumb.label,
          options: [
            {
              label: level2Breadcrumb.label,
              value: level2Breadcrumb.href || level2Breadcrumb.label,
            },
          ],
          onChange: (value: string | number) => {
            if (level2Breadcrumb.href) {
              router.push(level2Breadcrumb.href);
            }
          },
        };
      }

      // Level 3: Third breadcrumb (if exists)
      if (breadcrumbsForSelects.length > 1) {
        const level3Breadcrumb = breadcrumbsForSelects[1];
        mergedSelects.level3 = {
          value: level3Breadcrumb.href || level3Breadcrumb.label,
          options: [
            {
              label: level3Breadcrumb.label,
              value: level3Breadcrumb.href || level3Breadcrumb.label,
            },
          ],
          onChange: (value: string | number) => {
            if (level3Breadcrumb.href) {
              router.push(level3Breadcrumb.href);
            }
          },
        };
      }
    }

    return mergedSelects;
  }, [breadcrumbs, selects, router]);

  // Web: Always use selects, Mobile: Use breadcrumbs
  const effectiveSelects = size === "web" ? autoGeneratedSelects : null;
  const showSelects =
    size === "web" &&
    effectiveSelects &&
    (effectiveSelects.level1 ||
      effectiveSelects.level2 ||
      effectiveSelects.level3 ||
      effectiveSelects.level4);
  const showBreadcrumbs = size === "mobile" && breadcrumbs.length > 0;

  return (
    <div className={`page-header page-header--${size} ${className}`}>
      <div className="page-header__content">
        {/* Subtitle (optional) */}

        {/* Select Dropdowns (Web only) */}
        {showSelects && effectiveSelects && (
          <nav className="page-header__breadcrumb">
            <a href="/" className="page-header__breadcrumb-home">
              <HomeIcon size={size} />
            </a>
            {effectiveSelects.level1 &&
              effectiveSelects.level1.options.length > 0 && (
                <>
                  <SelectDropdown config={effectiveSelects.level1} />
                </>
              )}
            {effectiveSelects.level2 &&
              effectiveSelects.level2.options.length > 0 && (
                <>
                  <SelectDropdown config={effectiveSelects.level2} />
                </>
              )}
            {effectiveSelects.level3 &&
              effectiveSelects.level3.options.length > 0 && (
                <>
                  <SelectDropdown config={effectiveSelects.level3} />
                </>
              )}
            {effectiveSelects.level4 &&
              effectiveSelects.level4.options.length > 0 && (
                <>
                  <SelectDropdown config={effectiveSelects.level4} />
                </>
              )}
          </nav>
        )}

        {/* Breadcrumbs (Mobile only) */}
        {showBreadcrumbs && (
          <nav className="page-header__breadcrumb">
            <a href="/" className="page-header__breadcrumb-home">
              <HomeIcon size={size} />
            </a>
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={index}>
                <ArrowIcon />
                {item.href ? (
                  <a href={item.href} className="page-header__breadcrumb-item">
                    {item.label}
                  </a>
                ) : (
                  <span className="page-header__breadcrumb-item">
                    {item.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* 타이틀 */}
        {subtitle && <div className="page-header__subtitle">{subtitle}</div>}
        {title && <h1 className="page-header__title">{title}</h1>}
      </div>

      {/* 탭 네비게이션 */}
      {tabs.length > 0 && (
        <div className="page-header__tabs">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                className={`page-header__tab ${
                  isActive ? "page-header__tab--active" : ""
                }`}
                onClick={() => onTabChange?.(tab.id)}
              >
                {isActive && <ActiveDot />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
