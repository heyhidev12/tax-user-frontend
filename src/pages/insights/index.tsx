import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import Head from "next/head";
import Header from "@/components/common/Header";
import Menu from "@/components/Menu";
import Footer from "@/components/Footer";
import PageHeader from "@/components/common/PageHeader";
import Pagination from "@/components/common/Pagination";
import TextField, { SearchField } from "@/components/common/TextField";
import FloatingButton from "@/components/common/FloatingButton";
import Card from "@/components/common/Card";
import Icon from "@/components/common/Icon";
import Tab from "@/components/common/Tab";
import { get as getClient, post } from "@/lib/api";
import { get } from "@/lib/api-server";
import { API_ENDPOINTS } from "@/config/api";
import styles from "./insights.module.scss";
import Checkbox from "@/components/common/Checkbox";
import Button from "@/components/common/Button";

interface InsightThumbnail {
  url: string;
}

interface InsightCategory {
  id: number;
  name: string;
  type: string;
}

interface InsightSubcategory {
  id: number;
  name: string;
  sections: string[];
}

interface InsightItem {
  id: number;
  title: string;
  content: string;
  thumbnail?: InsightThumbnail;
  category: InsightCategory;
  subcategory?: InsightSubcategory;
  enableComments: boolean;
  isExposed: boolean;
  isMainExposed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface InsightResponse {
  items: InsightItem[];
  total: number;
  page: number;
  limit: number;
  displayType?: "gallery" | "snippet" | "list"; // 자료실 노출 방식
}

type InsightTab = "column" | "library" | "newsletter";
type CategoryFilter = "all" | "industry" | "consulting";
type LibraryDisplayType = "gallery" | "snippet" | "list";
type SortField = "category" | "author" | null;
type SortOrder = "asc" | "desc";

interface InsightsPageProps {
  initialInsights: InsightItem[];
  initialTotal: number;
  initialTotalPages: number;
  initialActiveTab: InsightTab;
  initialLibraryDisplayType?: LibraryDisplayType | null;
  error: string | null;
}

const InsightsPage: React.FC<InsightsPageProps> = ({
  initialInsights,
  initialTotal,
  initialTotalPages,
  initialActiveTab,
  initialLibraryDisplayType,
  error: initialError,
}) => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Query-based tab management (like History page)
  const tabFromQuery = router.query.tab as string;
  const validTabs = ["column", "library", "newsletter"];
  const [activeTab, setActiveTab] = useState<InsightTab>(initialActiveTab);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [insights, setInsights] = useState<InsightItem[]>(initialInsights);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [error, setError] = useState<string | null>(initialError);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [newsletterName, setNewsletterName] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [optionalAgreed, setOptionalAgreed] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newsletterExposed, setNewsletterExposed] = useState(true);

  // 로그인된 사용자 정보로 뉴스레터 폼 미리 채우기
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.name && !newsletterName) {
          setNewsletterName(user.name);
        }
        // email 또는 loginId(이메일 형식인 경우) 사용
        const email = user.email || (user.loginId && user.loginId.includes('@') ? user.loginId : '');
        if (email && !newsletterEmail) {
          setNewsletterEmail(email);
        }
      } catch (e) {
        // 파싱 실패 시 무시
      }
    }
  }, []);

  // 뉴스레터 탭 노출 여부 확인
  useEffect(() => {
    const checkNewsletterExposed = async () => {
      try {
        const response = await get<{ isExposed: boolean }>(API_ENDPOINTS.NEWSLETTER.PAGE);
        if (response.data) {
          setNewsletterExposed(response.data.isExposed);
        } else {
          setNewsletterExposed(false);
        }
      } catch {
        setNewsletterExposed(false);
      }
    };
    checkNewsletterExposed();
  }, []);

  // 뉴스레터 탭이 숨겨진 상태에서 newsletter 탭에 접근하면 column으로 리다이렉트
  useEffect(() => {
    if (!newsletterExposed && activeTab === 'newsletter') {
      router.replace("/insights?tab=column", undefined, { shallow: true });
      setActiveTab('column');
    }
  }, [newsletterExposed, activeTab, router]);

  // URL 쿼리 파라미터가 변경되면 탭 업데이트 (like History page)
  // Remove dataRoom from query if present
  useEffect(() => {
    if (router.isReady && router.query.dataRoom) {
      const { dataRoom, ...restQuery } = router.query;
      router.replace(
        {
          pathname: router.pathname,
          query: restQuery,
        },
        undefined,
        { shallow: true }
      );
    }
  }, [router.isReady, router.query.dataRoom, router]);

  // URL 쿼리 파라미터가 변경되면 탭 업데이트 (like History page)
  useEffect(() => {
    if (tabFromQuery && validTabs.includes(tabFromQuery)) {
      setActiveTab(tabFromQuery as InsightTab);
    } else if (tabFromQuery && !validTabs.includes(tabFromQuery)) {
      // Invalid tab in query, redirect to default
      const { dataRoom, ...restQuery } = router.query;
      router.replace(
        {
          pathname: router.pathname,
          query: { ...restQuery, tab: "column" },
        },
        undefined,
        { shallow: true }
      );
      setActiveTab("column");
    } else if (!tabFromQuery) {
      // No tab in query, set default and update URL
      const { dataRoom, ...restQuery } = router.query;
      router.replace(
        {
          pathname: router.pathname,
          query: { ...restQuery, tab: "column" },
        },
        undefined,
        { shallow: true }
      );
    }
  }, [tabFromQuery, router]);

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle newsletter subscription
  const handleNewsletterSubmit = async () => {
    // Reset errors
    setNameError('');
    setEmailError('');

    // Validate name
    if (!newsletterName.trim()) {
      setNameError('이름을 입력해주세요');
      return;
    }

    // Validate email
    if (!newsletterEmail.trim()) {
      setEmailError('이메일을 입력해주세요');
      return;
    }

    if (!validateEmail(newsletterEmail)) {
      setEmailError('올바른 이메일 주소를 입력해주세요');
      return;
    }

    // Validate privacy agreement
    if (!privacyAgreed) {
      alert('개인정보 처리 방침 이용 동의는 필수입니다.');
      return;
    }

    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await post(
        API_ENDPOINTS.NEWSLETTER.SUBSCRIBE,
        {
          name: newsletterName.trim(),
          email: newsletterEmail.trim(),
        }
      );

      if (response.error) {
        alert(response.error || '뉴스레터 구독 중 오류가 발생했습니다.');
        return;
      }

      // Success
      alert('뉴스레터 구독이 완료되었습니다.');
      window.gtag?.("event", "newsletter_submit", {
        event_category: "engagement",
        event_label: "newsletter_form",
      });

      // Reset form
      setNewsletterName('');
      setNewsletterEmail('');
      setPrivacyAgreed(false);
      setOptionalAgreed(false);
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      alert('뉴스레터 구독 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form is valid
  const isFormValid = newsletterName.trim() !== '' &&
    newsletterEmail.trim() !== '' &&
    validateEmail(newsletterEmail) &&
    privacyAgreed;
  // 자료실 노출 타입 - API 응답에서 설정
  const [libraryDisplayType, setLibraryDisplayType] =
    useState<LibraryDisplayType>(initialLibraryDisplayType || "gallery");


  // API에서 데이터 가져오기 (CSR for search/filter/pagination)
  const fetchInsights = async () => {
    try {
      setError(null);

      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", "9");
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      if (categoryFilter !== "all") {
        params.append("category", categoryFilter);
      }
      if (activeTab === "column") {
        params.append("categoryId", "1");
      } else if (activeTab === "library") {
        // Library tab - use default for now (dataRoom handling removed)
        params.append("dataRoom", "A");
      }

      const response = await getClient<InsightResponse>(
        `${API_ENDPOINTS.INSIGHTS}?${params.toString()}`
      );

      if (response.data) {
        const data = response.data;
        let filteredItems = data.items || [];

        // 클라이언트 사이드 카테고리 필터링 (API 필터링이 제대로 작동하지 않는 경우를 대비)
        // subcategory.name을 기준으로 필터링 (실제 데이터 구조에 맞춤)
        if (categoryFilter !== "all") {
          filteredItems = filteredItems.filter((item) => {
            // subcategory가 있으면 subcategory.name을 우선 사용, 없으면 category.name 사용
            const subcategoryName = item.subcategory?.name?.toLowerCase() || "";
            const categoryName = item.category?.name?.toLowerCase() || "";
            const categoryType = item.category?.type?.toLowerCase();

            // 필터링할 이름 결정 (subcategory 우선)
            const filterName = subcategoryName || categoryName;

            if (categoryFilter === "industry") {
              // 업종별: subcategory.name 또는 category.name에 업종이 포함되고, 컨설팅이 아닌 경우
              return (
                filterName.includes("업종") && !filterName.includes("컨설팅")
              );
            } else if (categoryFilter === "consulting") {
              // 컨설팅: subcategory.name 또는 category.name에 컨설팅이 포함되고, 업종별이 아닌 경우
              return (
                filterName.includes("컨설팅") && !filterName.includes("업종")
              );
            }
            return true;
          });
        }

        // 클라이언트 사이드 검색 필터링 (API가 검색을 지원하지 않는 경우를 대비)
        if (searchQuery && searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          filteredItems = filteredItems.filter((item) =>
            item.title.toLowerCase().includes(query)
          );
        }

        setInsights(filteredItems);
        setTotal(filteredItems.length);
        // totalPages 계산
        const limit = data.limit || 9;
        const calculatedTotalPages = Math.ceil(filteredItems.length / limit);
        setTotalPages(calculatedTotalPages);

        // 자료실 노출 방식 설정 (API 응답에서만 결정)
        if (activeTab === "library" && data.displayType) {
          setLibraryDisplayType(data.displayType);
        }
      }
    } catch (err) {
      console.error("Failed to fetch insights:", err);
      setError("데이터를 불러오는데 실패했습니다.");
      setInsights([]);
      setTotal(0);
      setTotalPages(1);
    }
  };


  // Client-side: fetch when filters/search/pagination change
  useEffect(() => {
    if (router.isReady) {
      // Only fetch if something changed from initial state
      if (searchQuery || categoryFilter !== "all" || currentPage !== 1 || activeTab !== initialActiveTab) {
        fetchInsights();
      }
    }
  }, [
    router.isReady,
    activeTab,
    categoryFilter,
    currentPage,
    searchQuery,
    initialActiveTab,
  ]);

  // 검색 핸들러 (Enter 키 또는 검색 버튼 클릭 시)
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // 검색 시 첫 페이지로
  };

  // 검색어 변경 핸들러 (실시간 입력)
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // 검색어가 비어있으면 즉시 검색 (필터 초기화)
    if (value === "") {
      setCurrentPage(1);
    }
  };

  // 정렬 핸들러
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 같은 필드를 클릭하면 정렬 순서 변경
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // 다른 필드를 클릭하면 해당 필드로 오름차순 정렬
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // 정렬된 insights 가져오기
  const getSortedInsights = () => {
    if (!sortField) return insights;

    return [...insights].sort((a, b) => {
      let aValue: string = "";
      let bValue: string = "";

      if (sortField === "category") {
        aValue =
          typeof a.subcategory?.name === "string"
            ? a.subcategory.name
            : typeof a.category?.name === "string"
              ? a.category.name
              : "";
        bValue =
          typeof b.subcategory?.name === "string"
            ? b.subcategory.name
            : typeof b.category?.name === "string"
              ? b.category.name
              : "";
      } else if (sortField === "author") {
        // 현재 작성자명이 하드코딩되어 있어서 실제로는 정렬이 안되지만,
        // API에서 author 정보가 오면 여기서 처리
        aValue = "작성자명";
        bValue = "작성자명";
      }

      if (sortOrder === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  };

  // 탭 변경 핸들러 (query-based, like History page)
  const handleTabChange = (tabId: string) => {
    const newTab = tabId as InsightTab;
    setActiveTab(newTab);
    setCurrentPage(1);
    setCategoryFilter("all");
    setSearchQuery("");

    // URL 업데이트 - only use tab parameter, remove dataRoom
    const { dataRoom, ...restQuery } = router.query;
    router.replace(
      {
        pathname: router.pathname,
        query: { ...restQuery, tab: newTab },
      },
      undefined,
      { shallow: true }
    );
  };

  // 카테고리 필터 변경 핸들러
  const handleCategoryChange = (category: CategoryFilter) => {
    setCategoryFilter(category);
    setCurrentPage(1);
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 게시물 클릭 핸들러
  const handleItemClick = (id: number) => {
    router.push(`/insights/${id}`);
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  // 브레드크럼 아이템
  const breadcrumbs = [{ label: "인사이트" }];

  // 탭 아이템
  const tabItems = [
    { id: "column", label: "칼럼" },
    { id: "library", label: "자료실" },
    { id: "newsletter", label: "뉴스레터" },
  ];

  // 뉴스레터 탭 노출 여부에 따라 탭 필터링
  const filteredTabItems = tabItems.filter((tab) => {
    if (tab.id === "newsletter") return newsletterExposed;
    return true;
  });

  return (
    <div className={styles.insightsPage}>
      <Header
        variant="white"
        onMenuClick={() => setIsMenuOpen(true)}
        isFixed={true}
      />
      <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <div className={activeTab === "newsletter" ? `${styles.headerImageNews} + ${styles.headerImage}` : `${styles.headerImage}`} />

      <div className={styles.content}>
        <div className="container">
          <div className={styles.pageHeaderWrapper}>
            <PageHeader
              breadcrumbs={breadcrumbs}
              size="web"
              selects={{
                level2: {
                  value: activeTab,
                  options: filteredTabItems.map((tab) => ({
                    label: tab.label,
                    value: tab.id,
                  })),
                  onChange: (value) => {
                    const tabId = String(value);
                    handleTabChange(tabId);
                  },
                },
              }}
            />
          </div>

          <div className={styles.mainContent}>

            {activeTab === "column" && (
              <>
                <div className={styles.columnTitleSection}>
                  <p className={styles.columnSubtitle}>Column</p>
                  <h2 className={styles.columnTitle}>칼럼</h2>
                </div>

                {/* 모바일 검색 섹션 */}
                <div className={styles.mobileSearchSection}>
                  <SearchField
                    placeholder="제목을 입력해주세요"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onSearch={handleSearch}
                    fullWidth
                  />
                </div>

                <div className={styles.columnContent}>
                  <nav className={styles.categoryNav}>
                    <button
                      className={`${styles.categoryItem} ${categoryFilter === "all"
                        ? styles.categoryItemActive
                        : ""
                        }`}
                      onClick={() => handleCategoryChange("all")}
                    >
                      {categoryFilter === "all" && (
                        <span className={styles.activeDot} />
                      )}
                      <span>전체</span>
                    </button>
                    <button
                      className={`${styles.categoryItem} ${categoryFilter === "industry"
                        ? styles.categoryItemActive
                        : ""
                        }`}
                      onClick={() => handleCategoryChange("industry")}
                    >
                      {categoryFilter === "industry" && (
                        <span className={styles.activeDot} />
                      )}
                      <span>업종별</span>
                    </button>
                    <button
                      className={`${styles.categoryItem} ${categoryFilter === "consulting"
                        ? styles.categoryItemActive
                        : ""
                        }`}
                      onClick={() => handleCategoryChange("consulting")}
                    >
                      {categoryFilter === "consulting" && (
                        <span className={styles.activeDot} />
                      )}
                      <span>컨설팅</span>
                    </button>
                  </nav>

                  <div className={styles.mainSection}>
                    <div className={styles.toolbar}>
                      <div className={styles.count}>
                        <span>총 </span>
                        <span className={styles.countNumber}>{total}</span>
                        <span> 개의 게시물이 있습니다</span>
                      </div>
                      <div className={styles.searchWrapper}>
                        <SearchField
                          placeholder="제목을 입력해주세요"
                          value={searchQuery}
                          onChange={handleSearchChange}
                          onSearch={handleSearch}
                          fullWidth
                        />
                      </div>
                    </div>

                    <div className={styles.divider} />

                    {error ? (
                      <div className={styles.error}>
                        <div className={styles.errorIcon}>⚠️</div>
                        <p>{error}</p>
                      </div>
                    ) : insights.length === 0 ? (
                      <div className={styles.empty}>
                        <img
                          src="/images/insights/empty-icon.svg"
                          alt="빈 상태"
                          className={styles.emptyIcon}
                        />
                        <p>등록된 게시글이 없습니다.</p>
                      </div>
                    ) : (
                      <>
                        {/* 데스크톱 그리드 */}
                        <div className={styles.desktopGrid}>
                          {insights.map((item) => {
                            const plainContent = item.content
                              .replace(/```[\s\S]*?```/g, "")
                              .replace(/#{1,6}\s+/g, "")
                              .replace(/\*\*([^*]+)\*\*/g, "$1")
                              .replace(/\*([^*]+)\*/g, "$1")
                              .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
                              .trim();

                            return (
                              <Card
                                key={item.id}
                                variant="column3"
                                size="web"
                                title={item.title}
                                imageUrl={item.thumbnail?.url}
                                category={
                                  typeof item.subcategory?.name === "string"
                                    ? item.subcategory.name
                                    : typeof item.category?.name === "string"
                                      ? item.category.name
                                      : "카테고리명"
                                }
                                description={
                                  plainContent.length > 150
                                    ? `${plainContent.substring(0, 150)}...`
                                    : plainContent
                                }
                                author="작성자명"
                                date={
                                  item.createdAt
                                    ? formatDate(item.createdAt)
                                    : ""
                                }
                                onClick={() => handleItemClick(item.id)}
                                className={
                                  styles.insightCard
                                }
                              />
                            );
                          })}
                        </div>

                        <div className={styles.paginationWrapper}>
                          <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            visiblePages={4}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === "library" && (
              <div className={styles.libraryContent}>
                {/* 모바일 타이틀 섹션 */}
                <div className={styles.mobileLibraryTitleSection}>
                  <h2 className={styles.mobileLibraryTitle}>
                    ARCHIVES A
                  </h2>
                  <p className={styles.mobileLibrarySubtitle}>
                    자료실A
                  </p>
                </div>

                {/* 모바일 검색 섹션 */}
                <div className={styles.mobileSearchSection}>
                  <SearchField
                    placeholder="제목을 입력해주세요"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onSearch={handleSearch}
                    fullWidth
                  />
                </div>

                {/* 모바일 카테고리 탭 */}
                <div className={styles.mobileCategoryTabs}>
                  <button
                    className={`${styles.mobileCategoryTab} ${categoryFilter === "all"
                      ? styles.mobileCategoryTabActive
                      : ""
                      }`}
                    onClick={() => handleCategoryChange("all")}
                  >
                    {categoryFilter === "all" && (
                      <span className={styles.mobileCategoryDot} />
                    )}
                    전체
                  </button>
                  <button
                    className={`${styles.mobileCategoryTab} ${categoryFilter === "industry"
                      ? styles.mobileCategoryTabActive
                      : ""
                      }`}
                    onClick={() => handleCategoryChange("industry")}
                  >
                    {categoryFilter === "industry" && (
                      <span className={styles.mobileCategoryDot} />
                    )}
                    업종별
                  </button>
                  <button
                    className={`${styles.mobileCategoryTab} ${categoryFilter === "consulting"
                      ? styles.mobileCategoryTabActive
                      : ""
                      }`}
                    onClick={() => handleCategoryChange("consulting")}
                  >
                    {categoryFilter === "consulting" && (
                      <span className={styles.mobileCategoryDot} />
                    )}
                    컨설팅
                  </button>
                </div>

                {/* 모바일 게시물 수 */}
                <div className={styles.mobileCount}>
                  <span>총 </span>
                  <span className={styles.mobileCountNumber}>{total}</span>
                  <span>개의 게시물이 있습니다</span>
                </div>

                <div className={styles.libraryTitleSection}>
                  <h2 className={styles.libraryTitle}>
                    ARCHIVES A
                  </h2>
                </div>
                <div className={styles.libraryMainContent}>
                  <div className={styles.librarySidebar}>
                    <h2 className={styles.librarySidebarTitle}>
                      자료실A
                    </h2>
                    <nav className={styles.libraryCategoryNav}>
                      <button
                        className={`${styles.libraryCategoryItem} ${categoryFilter === "all"
                          ? styles.libraryCategoryItemActive
                          : ""
                          }`}
                        onClick={() => handleCategoryChange("all")}
                      >
                        {categoryFilter === "all" && (
                          <span className={styles.activeDot} />
                        )}
                        <span>전체</span>
                      </button>
                      <button
                        className={`${styles.libraryCategoryItem} ${categoryFilter === "industry"
                          ? styles.libraryCategoryItemActive
                          : ""
                          }`}
                        onClick={() => handleCategoryChange("industry")}
                      >
                        {categoryFilter === "industry" && (
                          <span className={styles.activeDot} />
                        )}
                        <span>업종별</span>
                      </button>
                      <button
                        className={`${styles.libraryCategoryItem} ${categoryFilter === "consulting"
                          ? styles.libraryCategoryItemActive
                          : ""
                          }`}
                        onClick={() => handleCategoryChange("consulting")}
                      >
                        {categoryFilter === "consulting" && (
                          <span className={styles.activeDot} />
                        )}
                        <span>컨설팅</span>
                      </button>
                    </nav>
                  </div>

                  <div className={styles.libraryMainSection}>
                    <div className={styles.libraryToolbar}>
                      <div className={styles.count}>
                        <span>총 </span>
                        <span className={styles.countNumber}>{total}</span>
                        <span> 개의 게시물이 있습니다</span>
                      </div>
                      <div className={styles.searchWrapper}>
                        <SearchField
                          placeholder="제목을 입력해주세요"
                          value={searchQuery}
                          onChange={handleSearchChange}
                          onSearch={handleSearch}
                          fullWidth
                        />
                      </div>
                    </div>

                    {libraryDisplayType !== "list" && (
                      <div className={styles.divider} />
                    )}

                    {error ? (
                      <div className={styles.error}>
                        <div className={styles.errorIcon}>⚠️</div>
                        <p>{error}</p>
                      </div>
                    ) : insights.length === 0 ? (
                      <div className={styles.empty}>
                        <p>등록된 게시글이 없습니다.</p>
                      </div>
                    ) : (
                      <>
                        {libraryDisplayType === "gallery" && (
                          <div className={styles.libraryGallery}>
                            {insights.map((item) => (
                              <div
                                key={item.id}
                                className={`${styles.libraryCard} ${item.isMainExposed
                                  ? styles.libraryCardFeatured
                                  : ""
                                  }`}
                                onClick={() => handleItemClick(item.id)}
                              >
                                <div className={styles.libraryCardImage}>
                                  {item.thumbnail?.url ? (
                                    <img
                                      src={item.thumbnail.url}
                                      alt={item.title}
                                    />
                                  ) : (
                                    <div className={styles.placeholderImage} />
                                  )}
                                </div>
                                <div className={styles.libraryCardContent}>
                                  <div className={styles.libraryCardHeader}>
                                    <p className={styles.libraryCardCategory}>
                                      {typeof item.subcategory?.name ===
                                        "string"
                                        ? item.subcategory.name
                                        : typeof item.category?.name ===
                                          "string"
                                          ? item.category.name
                                          : "카테고리명"}
                                    </p>
                                    <h3 className={styles.libraryCardTitle}>
                                      {item.title}
                                    </h3>
                                  </div>
                                  <div className={styles.libraryCardFooter}>
                                    <span className={styles.libraryCardAuthor}>
                                      작성자명
                                    </span>
                                    <span className={styles.cardDivider} />
                                    <span className={styles.libraryCardDate}>
                                      {item.createdAt
                                        ? formatDate(item.createdAt)
                                        : "2026.01.28"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {libraryDisplayType === "snippet" && (
                          <div className={styles.libraryGallery}>
                            {insights.map((item) => {
                              // content에서 마크다운 제거하고 텍스트만 추출
                              const plainContent = item.content
                                .replace(/```[\s\S]*?```/g, "") // 코드 블록 제거
                                .replace(/#{1,6}\s+/g, "") // 헤더 제거
                                .replace(/\*\*([^*]+)\*\*/g, "$1") // 볼드 제거
                                .replace(/\*([^*]+)\*/g, "$1") // 이탤릭 제거
                                .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // 링크 제거
                                .trim();

                              return (
                                <div
                                  key={item.id}
                                  className={`${styles.libraryCard} ${styles.libraryCardTransparent
                                    } ${item.isMainExposed
                                      ? styles.libraryCardFeatured
                                      : ""
                                    }`}
                                  onClick={() => handleItemClick(item.id)}
                                >
                                  <div className={styles.libraryCardImage}>
                                    {item.thumbnail?.url ? (
                                      <img
                                        src={item.thumbnail.url}
                                        alt={item.title}
                                      />
                                    ) : (
                                      <div
                                        className={styles.placeholderImage}
                                      />
                                    )}
                                  </div>
                                  <div className={styles.libraryCardContent}>
                                    <div className={styles.libraryCardHeader}>
                                      <p className={styles.libraryCardCategory}>
                                        {typeof item.subcategory?.name ===
                                          "string"
                                          ? item.subcategory.name
                                          : typeof item.category?.name ===
                                            "string"
                                            ? item.category.name
                                            : "카테고리명"}
                                      </p>
                                      <h3
                                        className={
                                          styles.libraryCardTitleSingle
                                        }
                                      >
                                        {item.title}
                                      </h3>
                                      <p
                                        className={
                                          styles.libraryCardDescription
                                        }
                                      >
                                        {plainContent}
                                      </p>
                                    </div>
                                    <div className={styles.libraryCardFooter}>
                                      <span
                                        className={styles.libraryCardAuthor}
                                      >
                                        작성자명
                                      </span>
                                      <span className={styles.cardDivider} />
                                      <span className={styles.libraryCardDate}>
                                        {item.createdAt
                                          ? formatDate(item.createdAt)
                                          : "2026.01.28"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {libraryDisplayType === "list" && (
                          <div className={styles.libraryList}>
                            {/* 데스크톱 헤더 */}
                            <div className={styles.libraryListHeader}>
                              <div className={styles.libraryListHeaderRow}>
                                <div className={styles.libraryListHeaderCell}>
                                  No.
                                </div>
                                <div
                                  className={`${styles.libraryListHeaderCell} ${styles.sortable}`}
                                  onClick={() => handleSort("category")}
                                >
                                  카테고리
                                  <Icon
                                    type={
                                      sortField === "category" &&
                                        sortOrder === "asc"
                                        ? "arrow-up"
                                        : "arrow-down"
                                    }
                                    size={16}
                                    className={styles.sortIcon}
                                  />
                                </div>
                                <div className={styles.libraryListHeaderCell}>
                                  제목
                                </div>
                                <div
                                  className={`${styles.libraryListHeaderCell} ${styles.sortable}`}
                                  onClick={() => handleSort("author")}
                                >
                                  작성자
                                  <Icon
                                    type={
                                      sortField === "author" &&
                                        sortOrder === "asc"
                                        ? "arrow-up"
                                        : "arrow-down"
                                    }
                                    size={16}
                                    className={styles.sortIcon}
                                  />
                                </div>
                                <div className={styles.libraryListHeaderCell}>
                                  작성 일
                                </div>
                                <div className={styles.libraryListHeaderCell}>
                                  조회수
                                </div>
                              </div>
                            </div>

                            {/* 모바일 헤더 */}
                            <div className={styles.mobileListHeader}>
                              <div
                                className={`${styles.mobileListHeaderCell} ${styles.sortable}`}
                                onClick={() => handleSort("category")}
                              >
                                카테고리
                                <Icon
                                  type={
                                    sortField === "category" &&
                                      sortOrder === "asc"
                                      ? "arrow-up"
                                      : "arrow-down"
                                  }
                                  size={16}
                                  className={styles.sortIcon}
                                />
                              </div>
                              <div
                                className={`${styles.mobileListHeaderCell} ${styles.sortable}`}
                                onClick={() => handleSort("author")}
                              >
                                작성자
                                <Icon
                                  type={
                                    sortField === "author" &&
                                      sortOrder === "asc"
                                      ? "arrow-up"
                                      : "arrow-down"
                                  }
                                  size={16}
                                  className={styles.sortIcon}
                                />
                              </div>
                            </div>

                            {/* 데스크톱 바디 */}
                            <div className={styles.libraryListBody}>
                              {getSortedInsights().map((item, index) => (
                                <div
                                  key={item.id}
                                  className={styles.libraryListRow}
                                  onClick={() => handleItemClick(item.id)}
                                >
                                  <div className={styles.libraryListCell}>
                                    {(currentPage - 1) * 9 + index + 1}
                                  </div>
                                  <div
                                    className={`${styles.libraryListCell} ${styles.categoryCell}`}
                                  >
                                    {typeof item.subcategory?.name === "string"
                                      ? item.subcategory.name
                                      : typeof item.category?.name === "string"
                                        ? item.category.name
                                        : "카테고리 명"}
                                  </div>
                                  <div
                                    className={`${styles.libraryListCell} ${styles.titleCell}`}
                                  >
                                    <span className={styles.libraryListTitle}>
                                      {item.title}
                                    </span>
                                  </div>
                                  <div className={styles.libraryListCell}>
                                    작성자명
                                  </div>
                                  <div className={styles.libraryListCell}>
                                    {item.createdAt
                                      ? formatDate(item.createdAt)
                                      : "2025.10.14 13:05"}
                                  </div>
                                  <div className={styles.libraryListCell}>
                                    0
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* 모바일 바디 */}
                            <div className={styles.mobileListBody}>
                              {getSortedInsights().map((item, index) => (
                                <div
                                  key={item.id}
                                  className={styles.mobileListRow}
                                  onClick={() => handleItemClick(item.id)}
                                >
                                  <div className={styles.mobileListRowTop}>
                                    <span className={styles.mobileListCategory}>
                                      {typeof item.subcategory?.name ===
                                        "string"
                                        ? item.subcategory.name
                                        : typeof item.category?.name ===
                                          "string"
                                          ? item.category.name
                                          : "카테고리 명"}
                                    </span>
                                    <span className={styles.mobileListDate}>
                                      {item.createdAt
                                        ? formatDate(item.createdAt)
                                        : "2025.06.08"}
                                    </span>
                                  </div>
                                  <div className={styles.mobileListTitle}>
                                    {item.title}
                                  </div>
                                  <div className={styles.mobileListAuthor}>
                                    작성자명
                                  </div>
                                  <div className={styles.mobileListBottom}>
                                    <span className={styles.mobileListNo}>
                                      NO.{(currentPage - 1) * 9 + index + 1}
                                    </span>
                                    <span className={styles.mobileListViews}>
                                      <img
                                        src="/images/insights/icons/eye.svg"
                                        alt="조회수"
                                        className={styles.mobileListEyeIcon}
                                      />
                                      0
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className={styles.paginationWrapper}>
                          <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            visiblePages={4}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'newsletter' && (
              <div className={styles.newsletterSection}>
                <div className={styles.newsletterHero}>
                  <p className={styles.newsletterLabel}>NEWSLETTER</p>
                  <h2 className={styles.newsletterTitle}>뉴스레터</h2>
                  <div className={styles.newsletterHeroContent}>
                    <div className={styles.newsletterLeft}>

                      <img src="/images/pages/newsletter.png" alt="" />
                    </div>
                    <div className={styles.newsletterRight}>
                      <div className={styles.newsletterRighTitle}>
                        <p>Newsletter</p>
                        <h2>알면 이익이 되는 세무 정보, <br /> 구독하고 빠르게 전달 받으세요</h2>
                      </div>
                      <div className={styles.newsletterForm}>
                        <div className={styles.newsletterFormFields}>
                          <TextField
                            variant="line"
                            label="이름"
                            required
                            placeholder="수신자 명"
                            value={newsletterName}
                            onChange={(value) => {
                              setNewsletterName(value);
                              if (nameError) setNameError('');
                            }}
                            error={!!nameError}
                            errorMessage={nameError}
                            fullWidth
                            className={styles.newsletterTextField}
                          />
                          <TextField
                            variant="line"
                            label="이메일"
                            required
                            type="email"
                            placeholder="뉴스레터를 받을 이메일 주소"
                            value={newsletterEmail}
                            onChange={(value) => {
                              setNewsletterEmail(value);
                              if (emailError) setEmailError('');
                            }}
                            error={!!emailError}
                            errorMessage={emailError}
                            fullWidth
                            className={styles.newsletterTextField}
                          />
                        </div>
                        <div className={styles.newsletterCheckboxes}>
                          <div className={styles.newsletterCheckboxRow}>
                            <Checkbox
                              variant="square"
                              checked={privacyAgreed}
                              onChange={setPrivacyAgreed}
                              label="[필수] 개인정보 처리 방침 이용 동의"
                            />
                            <button className={styles.newsletterLink}>보기</button>
                          </div>
                          <div className={styles.newsletterCheckboxRow}>
                            <Checkbox
                              variant="square"
                              checked={optionalAgreed}
                              onChange={setOptionalAgreed}
                              label="[선택] OO OOOOO 이용 동의"
                            />
                            <button className={styles.newsletterLink}>보기</button>
                          </div>
                        </div>
                        <Button
                          type="primary"
                          size="large"
                          fullWidth
                          disabled={!isFormValid || isSubmitting}
                          onClick={handleNewsletterSubmit}
                          className={styles.newsletterButton}
                        >
                          {isSubmitting ? '구독 중...' : '구독하기'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.floatingButtons}>
        <FloatingButton
          variant="consult"
          label="상담 신청하기"
          onClick={() => router.push("/consultation/apply")}
        />
        <FloatingButton
          variant="top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        />
      </div>

      <Footer />
    </div>
    // </div>
  );
};

export const getServerSideProps: GetServerSideProps<InsightsPageProps> = async (context) => {
  const { tab } = context.query;
  const activeTab = (tab && ["column", "library", "newsletter"].includes(tab as string))
    ? (tab as InsightTab)
    : "column";

  try {
    const params = new URLSearchParams();
    params.append("page", "1");
    params.append("limit", "9");
    if (activeTab === "column") {
      params.append("categoryId", "1");
    } else if (activeTab === "library") {
      params.append("dataRoom", "A");
    }

    const response = await get<InsightResponse>(
      `${API_ENDPOINTS.INSIGHTS}?${params.toString()}`
    );

    if (response.data) {
      const data = response.data;
      let filteredItems = data.items || [];
      const limit = data.limit || 9;
      const calculatedTotalPages = Math.ceil(filteredItems.length / limit);

      return {
        props: {
          initialInsights: filteredItems,
          initialTotal: filteredItems.length,
          initialTotalPages: calculatedTotalPages,
          initialActiveTab: activeTab,
          initialLibraryDisplayType: activeTab === "library" && data.displayType
            ? data.displayType
            : null,
          error: null,
        },
      };
    } else {
      return {
        props: {
          initialInsights: [],
          initialTotal: 0,
          initialTotalPages: 1,
          initialActiveTab: activeTab,
          initialLibraryDisplayType: null,
          error: response.error || null,
        },
      };
    }
  } catch (err) {
    console.error("Failed to fetch insights:", err);
    return {
      props: {
        initialInsights: [],
        initialTotal: 0,
        initialTotalPages: 1,
        initialActiveTab: activeTab,
        initialLibraryDisplayType: undefined,
        error: "데이터를 불러오는데 실패했습니다.",
      },
    };
  }
};

export default InsightsPage;
