import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import Header from "@/components/common/Header";
import Menu from "@/components/Menu";
import Footer from "@/components/Footer";
import PageHeader from "@/components/common/PageHeader";
import FloatingButton from "@/components/common/FloatingButton";
import Icon from "@/components/common/Icon";
import Card, { ProfileTag } from "@/components/common/Card";
import SEO from "@/components/common/SEO";
import { get } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/api";
import styles from "./experts.module.scss";
import { Close } from "@mui/icons-material";

interface MemberCategory {
  categoryId: number;
  categoryName: string;
  displayOrder: number;
}

interface Expert {
  id?: number;
  name: string;
  position?: string;
  affiliation?: string;
  tel?: string;
  phoneNumber?: string;
  email: string;
  imageUrl?: string;
  mainPhoto?: {
    id: number;
    url: string;
  };
  tags?: string[];
  categories?: MemberCategory[];
}

interface Category {
  id: number;
  name: string;
  isExposed: boolean;
  majorCategoryId: number;
  majorCategoryName: string;
}

interface MembersResponse {
  items?: Expert[];
  data?: Expert[];
  total?: number;
  page?: number;
  limit?: number;
}

const ITEMS_PER_PAGE = 16;

const ExpertsPage: React.FC = () => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Category Select state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  
  // Search state
  const [searchKeyword, setSearchKeyword] = useState("");
  
  // Members state
  const [experts, setExperts] = useState<Expert[]>([]);
  const [isLoadingExperts, setIsLoadingExperts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 767);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const response = await get<Category[]>(
          API_ENDPOINTS.BUSINESS_AREAS_CATEGORIES
        );
        if (response.data) {
          const exposedCategories = response.data.filter(
            (cat) => cat.isExposed
          );
          setCategories(exposedCategories);
        }
      } catch (err) {
        console.error("분야 목록을 불러오는 중 오류가 발생했습니다.", err);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Fetch members - only called explicitly, not on mount
  const fetchMembers = useCallback(async (
    categoryId: number | null,
    search: string,
    page: number
  ) => {
    // Don't fetch if both are empty
    if (!categoryId && !search.trim()) {
      setExperts([]);
      setTotalItems(0);
      setTotalPages(1);
      setHasFetched(false);
      return;
    }

    setIsLoadingExperts(true);
    setError(null);
    setHasFetched(true);
    
    try {
      // Build URL with filters and pagination
      let url = `${API_ENDPOINTS.MEMBERS}?page=${page}&limit=${ITEMS_PER_PAGE}`;
      
      // Add categoryId parameter if selected
      if (categoryId) {
        url += `&categoryId=${categoryId}`;
      }
      
      // Add search parameter if provided
      const trimmedSearch = search.trim();
      if (trimmedSearch) {
        url += `&search=${encodeURIComponent(trimmedSearch)}`;
      }
      
      console.log("Fetching experts from:", url);
      const response = await get<Expert[] | MembersResponse>(url);
      console.log("API Response:", response);

      if (response.error) {
        console.error("API Error:", response.error);
        setError(response.error);
        setExperts([]);
        setTotalPages(1);
        setTotalItems(0);
      } else if (response.data) {
        // Handle both array and object responses
        let expertsList: Expert[] = [];
        let total = 0;
        
        if (Array.isArray(response.data)) {
          expertsList = response.data;
          total = response.data.length;
        } else {
          const membersResponse = response.data as MembersResponse;
          expertsList = membersResponse.items || membersResponse.data || [];
          total = membersResponse.total || expertsList.length;
        }
        
        // Transform expert data - use categories from backend (already sorted by displayOrder)
        expertsList = expertsList.map((expert) => ({
          ...expert,
          tags: expert.categories
            ? expert.categories.map((cat) => cat.categoryName)
            : expert.tags || [],
          tel: expert.tel || expert.phoneNumber,
          position: expert.position || expert.affiliation || "세무사",
        }));
        
        setExperts(expertsList);
        setTotalItems(total);
        setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));
      } else {
        setExperts([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("전문가 목록을 불러오는 중 오류가 발생했습니다.");
      setExperts([]);
    } finally {
      setIsLoadingExperts(false);
    }
  }, []);

  // Handle category select change
  const handleCategorySelect = (category: Category) => {
    setSelectedCategoryId(category.id);
    setSelectedCategoryName(category.name);
    setIsDropdownOpen(false);
    setCurrentPage(1);
    
    // Fetch with new category (and existing search if any)
    fetchMembers(category.id, searchKeyword, 1);
    
    // Scroll to results
    setTimeout(() => {
      const expertsSection = document.getElementById("experts-list-section");
      if (expertsSection) {
        expertsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  // Clear category selection
  const handleClearCategory = () => {
    setSelectedCategoryId(null);
    setSelectedCategoryName("");
    setCurrentPage(1);
    
    // If search exists, fetch with search only; otherwise clear results
    if (searchKeyword.trim()) {
      fetchMembers(null, searchKeyword, 1);
    } else {
      setExperts([]);
      setHasFetched(false);
      setTotalItems(0);
      setTotalPages(1);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Max length validation
    if (value.length <= 50) {
      setSearchKeyword(value);
    }
  };

  // Handle search submit (Enter key or button click)
  const handleSearchSubmit = () => {
    const trimmedSearch = searchKeyword.trim();
    
    // Don't search if both filters are empty
    if (!selectedCategoryId && !trimmedSearch) {
      return;
    }
    
    setCurrentPage(1);
    fetchMembers(selectedCategoryId, trimmedSearch, 1);
    
    // Scroll to results
    setTimeout(() => {
      const expertsSection = document.getElementById("experts-list-section");
      if (expertsSection) {
        expertsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchKeyword("");
    setCurrentPage(1);
    
    // If category is selected, fetch with category only; otherwise clear results
    if (selectedCategoryId) {
      fetchMembers(selectedCategoryId, "", 1);
    } else {
      setExperts([]);
      setHasFetched(false);
      setTotalItems(0);
      setTotalPages(1);
    }
    
    searchInputRef.current?.focus();
  };

  // Pagination handler
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      fetchMembers(selectedCategoryId, searchKeyword, page);
      
      // Scroll to top of results
      const expertsSection = document.getElementById("experts-list-section");
      if (expertsSection) {
        expertsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleConsultClick = () => {
    router.push("/consultation/apply");
  };

  // Generate pagination numbers
  const getPaginationNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = isMobile ? 5 : 7;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= Math.min(5, totalPages); i++) {
          pages.push(i);
        }
        if (totalPages > 5) {
          pages.push("...");
          pages.push(totalPages);
        }
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) {
          if (i > 1) pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Get result title
  const getResultTitle = () => {
    if (selectedCategoryName && searchKeyword.trim()) {
      return `${selectedCategoryName} · '${searchKeyword.trim()}' 검색 결과`;
    } else if (selectedCategoryName) {
      return selectedCategoryName;
    } else if (searchKeyword.trim()) {
      return `'${searchKeyword.trim()}' 검색 결과`;
    }
    return "전문가 검색";
  };

  return (
    <>
      <SEO pageType="menu" menuName="전문가 소개" />
      <div className={styles.expertsPage}>
        <Header
          variant="white"
          onMenuClick={() => setIsMenuOpen(true)}
          isFixed={true}
        />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className={styles.headerImage}>
          <h1 className={styles.headerTitle}>TEAM OF EXPERTS</h1>
          <p className={styles.headerSubtitle}>전문가 소개</p>
        </div>

        <div className="container">
          <div className={styles.pageHeaderSection}>
            <PageHeader
              breadcrumbs={[{ label: "전문가 소개" }]}
              size={isMobile ? "mobile" : "web"}
            />
          </div>

          <div className={styles.heroSection}>
            <p className={styles.heroSubtitle}>Team of Experts</p>
            <div className={styles.heroTitle}>
              세무법인 함께, <br /> <span>라인업</span>에서 나옵니다
            </div>
            <div className={styles.heroDescriptionText}>
              <p>
                <span>국세청 근무 경력을 포함 </span>
                <span className={styles.boldText}>30년 이상 세무사 n명</span>
              </p>
              <p>
                <span>세무사 경력 </span>
                <span className={styles.boldText}>10년 이상 세무사 n명</span>
              </p>
              <p>함께 하는 신뢰와 함께, 든든한 구성원을 안내드립니다.</p>
            </div>
            
            {/* Filter Section */}
            <div className={styles.heroContent}>
              <div className={styles.filterContainer}>
                {/* Category Select */}
                <div className={styles.fieldSelector} ref={dropdownRef}>
                  <div
                    className={styles.fieldSelectorInput}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <p className={selectedCategoryName ? styles.selected : ""}>
                      {selectedCategoryName || "분야를 선택해주세요"}
                    </p>
                    {selectedCategoryId ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearCategory();
                        }}
                        className={styles.selectClearButton}
                        aria-label="분야 선택 해제"
                      >
                        <Close sx={{ fontSize: 16 }} />
                      </button>
                    ) : (
                      <Icon
                        type="chevron-down-white"
                        size={20}
                        className={styles.dropdownArrow}
                        style={{
                          transform: isDropdownOpen
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.3s ease",
                        }}
                      />
                    )}
                  </div>
                  {isDropdownOpen && (
                    <div className={styles.dropdownMenu}>
                      <div className={styles.dropdownContent}>
                        {isLoadingCategories ? (
                          <div className={styles.dropdownItem}>
                            <p>로딩 중...</p>
                          </div>
                        ) : categories.length > 0 ? (
                          categories.map((category) => (
                            <div
                              key={category.id}
                              className={`${styles.dropdownItem} ${
                                selectedCategoryId === category.id
                                  ? styles.dropdownItemActive
                                  : ""
                              }`}
                              onClick={() => handleCategorySelect(category)}
                            >
                              <p>{category.name}</p>
                            </div>
                          ))
                        ) : (
                          <div className={styles.dropdownItem}>
                            <p>분야가 없습니다</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Search Input */}
                <div className={styles.searchInputWrapper}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchKeyword}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    placeholder="이름 또는 업무분야를 입력해주세요"
                    className={styles.searchInput}
                    maxLength={50}
                  />
                  {searchKeyword && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className={styles.clearButton}
                      aria-label="검색어 지우기"
                    >
                      <Close sx={{ fontSize: 16 }} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className={styles.searchIconButton}
                    aria-label="검색"
                  >
                    <Icon type="search" size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Experts List Section - Only show when filters are applied */}
          {hasFetched && (
            <div
              id="experts-list-section"
              className={styles.expertsListSection}
            >
              <div className={styles.expertsListContent}>
                <div className={styles.expertsListLayout}>
                  <div className={styles.expertsListHeader}>
                    <h2 className={styles.expertsListTitle}>
                      {getResultTitle()}
                    </h2>
                    {totalItems > 0 && (
                      <p className={styles.resultsCount}>
                        총 {totalItems}명의 전문가
                      </p>
                    )}
                  </div>
                  
                  {isLoadingExperts ? (
                      <div className={styles.loadingContainer}>
                        <p>전문가 목록을 불러오는 중...</p>
                      </div>
                    ) : error ? (
                      <div className={styles.errorContainer}>
                        <p>{error}</p>
                      </div>
                    ) : experts.length > 0 ? (
                      <>
                        <div className={styles.expertsGridWrapper}>
                          <div className={styles.expertsGrid}>
                            {experts.map((expert, index) => {
                              // Use categories from backend (already sorted by displayOrder)
                              // No positional indicators, just category names
                              const profileTags: ProfileTag[] | undefined =
                                expert.categories && expert.categories.length > 0
                                  ? expert.categories.map((cat) => ({
                                      label: cat.categoryName,
                                    }))
                                  : undefined;

                              return (
                                <Card
                                  key={expert.id || index}
                                  variant="profile"
                                  title={expert.name}
                                  position={
                                    expert.position || expert.affiliation || ""
                                  }
                                  tel={expert.tel || expert.phoneNumber || ""}
                                  email={expert.email}
                                  imageUrl={
                                    expert.imageUrl || expert.mainPhoto?.url
                                  }
                                  tags={profileTags}
                                  size={isMobile ? "mobile" : "web"}
                                  className={styles.expertCard}
                                  onClick={() =>
                                    expert.id &&
                                    router.push(`/experts/${expert.id}`)
                                  }
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className={styles.pagination}>
                            <button
                              className={styles.paginationArrow}
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              aria-label="이전 페이지"
                            >
                              <Icon type="arrow-left" size={20} />
                            </button>
                            
                            <div className={styles.paginationNumbers}>
                              {getPaginationNumbers().map((page, index) => (
                                typeof page === "number" ? (
                                  <button
                                    key={index}
                                    className={`${styles.paginationNumber} ${
                                      currentPage === page
                                        ? styles.paginationNumberActive
                                        : ""
                                    }`}
                                    onClick={() => handlePageChange(page)}
                                  >
                                    {page}
                                  </button>
                                ) : (
                                  <span key={index} className={styles.paginationEllipsis}>
                                    {page}
                                  </span>
                                )
                              ))}
                            </div>
                            
                            <button
                              className={styles.paginationArrow}
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              aria-label="다음 페이지"
                            >
                              <Icon type="arrow-right" size={20} />
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={styles.emptyContainer}>
                        <Icon type="search" size={48} className={styles.emptyIcon} />
                        <p className={styles.emptyTitle}>검색 결과가 없습니다.</p>
                        <p className={styles.emptyDescription}>
                          다른 검색어로 다시 시도해 주세요.
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Buttons */}
        <div className={styles.floatingButtons}>
          <FloatingButton
            variant="consult"
            label="상담 신청하기"
            onClick={handleConsultClick}
          />
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ExpertsPage;
