import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import Header from "@/components/common/Header";
import Menu from "@/components/Menu";
import Footer from "@/components/Footer";
import PageHeader from "@/components/common/PageHeader";
import Pagination from "@/components/common/Pagination";
import TextField, { SearchField } from "@/components/common/TextField";
import FloatingButton from "@/components/common/FloatingButton";
import Card from "@/components/common/Card";
import Icon from "@/components/common/Icon";
import SEO from "@/components/common/SEO";
import TermsModal, { TermsType } from "@/components/common/TermsModal";
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
  targetMemberType?: string; // "ALL", "GENERAL", "INSURANCE", "OTHER", etc.
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
  // 세무사(INSURANCE) 회원 전용 승인 여부
  isApproved?: boolean;
  createdAt?: string;
  updatedAt?: string;
  authorName?: string;
  viewCount?: number;
  files: any[];
  subMinorCategory?: InsightSubMinorCategory;
}

interface InsightSubMinorCategory {
  id: number;
  name: string;
}
interface InsightResponse {
  items: InsightItem[];
  total: number;
  page: number;
  limit: number;
  displayType?: "gallery" | "snippet" | "list"; // 자료실 노출 방식
}

// Hierarchical API types
interface InsightHierarchicalSubcategory {
  id: number;
  name: string;
  items: InsightItem[];
}

interface InsightHierarchicalItem {
  category: InsightCategory;
  subcategories: InsightHierarchicalSubcategory[];
}

type InsightHierarchicalData = InsightHierarchicalItem[];

type InsightTab = "column" | "library" | "newsletter";
type LibraryDisplayType = "gallery" | "snippet" | "list";
type SortField = "category" | "author" | null;
type SortOrder = "asc" | "desc";

interface InsightsPageProps {
  initialInsights: InsightItem[];
  initialTotal: number;
  initialTotalPages: number;
  initialActiveTab: InsightTab;
  initialLibraryDisplayType?: LibraryDisplayType | null;
  initialCategoryValue?: string | number; // Initial category value for select
  error: string | null;
}

const InsightsPage: React.FC<InsightsPageProps> = ({
  initialInsights,
  initialTotal,
  initialTotalPages,
  initialLibraryDisplayType,
  initialCategoryValue,
  error: initialError,
}) => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Query-based category management - NEW FORMAT: category and sub only
  // Always normalize to string for consistent comparison
  const categoryFromQuery = String(router.query.category || "");
  const subFromQuery = String(router.query.sub || "");
  const isNewsletterCategory = categoryFromQuery === "newsletter";

  // Newsletter mode state - initialized immediately from query (works on refresh/direct access)
  const [isNewsletterMode, setIsNewsletterMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const category = urlParams.get('category');
      return category === 'newsletter';
    }
    return false;
  });

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
  
  // Terms modal state
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [activeTermsType, setActiveTermsType] = useState<TermsType>('privacy');
  
  const handleOpenTermsModal = (type: TermsType) => {
    setActiveTermsType(type);
    setIsTermsModalOpen(true);
  };
  
  const handleCloseTermsModal = () => {
    setIsTermsModalOpen(false);
  };

  // Hierarchical data state
  const [hierarchicalData, setHierarchicalData] = useState<InsightHierarchicalData>([]);
  // Store category as string for consistent type matching with select
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(() => {
    // Initialize from URL query if available (numeric category only)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const category = urlParams.get('category');
      if (category && category !== "newsletter") {
        const parsed = parseInt(category, 10);
        return !isNaN(parsed) ? parsed : null;
      }
    }
    return null;
  });
  // Virtual "전체" subcategory has id = 0 (special value)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number>(() => {
    // Initialize from URL query if available (only for normal categories, not newsletter)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const category = urlParams.get('category');
      const sub = urlParams.get('sub');

      // Newsletter doesn't use sub parameter - ignore it
      if (category === 'newsletter') {
        return 0; // Default value, but not used for newsletter
      }

      return sub ? parseInt(sub, 10) : 0;
    }
    return 0; // Default to "전체" (0)
  });
  const [isLoadingHierarchical, setIsLoadingHierarchical] = useState(false);

  // Initialize newsletter mode from query params immediately on mount/route change
  useEffect(() => {
    if (!router.isReady) return;

    const category = String(router.query.category || "");


    if (category === 'newsletter') {
      setIsNewsletterMode(true);
      setSelectValue("newsletter"); // Set select value immediately

      // Remove sub parameter if present (newsletter doesn't use sub)
      if (router.query.sub) {
        router.replace(
          {
            pathname: router.pathname,
            query: { category: "newsletter" },
          },
          undefined,
          { shallow: true }
        );
      }
    } else {
      setIsNewsletterMode(false);
    }
  }, [router.isReady, router.query.category, router]);

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

  // Clean up old query params (categoryId, tab, dataRoom) and migrate to new format
  useEffect(() => {
    if (router.isReady) {
      const { categoryId, tab, dataRoom, category, sub, ...restQuery } = router.query;
      const needsCleanup = categoryId || tab || dataRoom;

      if (needsCleanup) {
        // Migrate old format to new format
        let newCategory = category;
        let newSub = sub;

        if (categoryId && !category) {
          // Migrate categoryId to category
          newCategory = categoryId;
        }

        if (tab === "newsletter" && !category) {
          newCategory = "newsletter";
        } else if (tab && !category && !categoryId) {
          // If tab=column/library but no category, use first category from hierarchical data
          // This will be handled after hierarchical data loads
        }

        // Remove old params and update URL
        router.replace(
          {
            pathname: router.pathname,
            query: {
              ...restQuery,
              ...(newCategory && { category: newCategory }),
              ...(newSub && { sub: newSub }),
            },
          },
          undefined,
          { shallow: true }
        );
      }
    }
  }, [router.isReady, router.query, router]);

  // Handle newsletter category - redirect if not exposed
  useEffect(() => {
    if (router.isReady && isNewsletterCategory && !newsletterExposed) {
      // Redirect to first category if newsletter is not exposed
      if (hierarchicalData.length > 0) {
        const firstCategory = hierarchicalData[0];
        router.replace(
          {
            pathname: router.pathname,
            query: { category: firstCategory.category.id },
          },
          undefined,
          { shallow: true }
        );
      } else {
        router.replace("/insights", undefined, { shallow: true });
      }
    }
  }, [router.isReady, isNewsletterCategory, newsletterExposed, hierarchicalData, router]);

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email validation on blur
  const handleEmailBlur = () => {
    if (newsletterEmail.trim()) {
      if (!validateEmail(newsletterEmail)) {
        setEmailError('올바른 이메일 주소를 입력해주세요');
      } else {
        setEmailError('');
      }
    }
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
  // 자료실 노출 타입 - category.type에서 설정
  const [libraryDisplayType, setLibraryDisplayType] =
    useState<LibraryDisplayType>(initialLibraryDisplayType || "gallery");

  // Helper function to check if user is logged in and get memberType & isApproved
  const getUserAuthState = () => {
    if (typeof window === 'undefined') {
      return { isLoggedIn: false, memberType: null, isApproved: null };
    }

    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      return { isLoggedIn: false, memberType: null, isApproved: null };
    }

    try {
      const user = JSON.parse(userStr);
      return {
        isLoggedIn: true,
        memberType: user.memberType || null,
        isApproved: user.memberType === 'INSURANCE' ? user.isApproved : null,
      };
    } catch {
      return { isLoggedIn: false, memberType: null, isApproved: null };
    }
  };

  // Build query params for API calls with user filtering
  const buildUserFilterParams = () => {
    const { isLoggedIn, memberType, isApproved } = getUserAuthState();

    const params = new URLSearchParams();

    if (!isLoggedIn) {
      // Not logged in: explicitly send memberType=null for guest filtering
      params.append('memberType', 'null');
      return `&${params.toString()}`;
    }

    // Logged in: send actual user data
    if (memberType) {
      params.append('memberType', memberType);
    }
    if (isApproved !== null) {
      params.append('isApproved', String(isApproved));
    }

    return params.toString() ? `&${params.toString()}` : '';
  };

  // Fetch hierarchical data once on mount
  // IMPORTANT: Always fetch, even for newsletter category, to ensure dropdown has multiple options
  useEffect(() => {
    const fetchHierarchicalData = async () => {
      // Always fetch hierarchical data to ensure dropdown has multiple options
      // This prevents static text rendering when newsletter is selected

      try {
        setIsLoadingHierarchical(true);
        setError(null);
        const userParams = buildUserFilterParams();
        const response = await getClient<InsightHierarchicalData>(
          `${API_ENDPOINTS.INSIGHTS}/hierarchical?${userParams.replace(/^&/, '')}`
        );
        setHierarchicalData(response?.data || []);

        
      } catch (err) {
        console.error("Failed to fetch hierarchical data:", err);
        setError("데이터를 불러오는데 실패했습니다.");
        setHierarchicalData([]);
      } finally {
        setIsLoadingHierarchical(false);
      }
    };

    // Always fetch hierarchical data, even for newsletter category
    // This ensures dropdown has multiple options (newsletter + other categories) so it renders as dropdown, not static text
    if (router.isReady) {
      fetchHierarchicalData();
    }
  }, [router.isReady, categoryFromQuery, subFromQuery, router, newsletterExposed]);

  // Listen for auth state changes (login/logout in other tabs or same tab)
  useEffect(() => {
    if (!router.isReady || hierarchicalData.length === 0) return;

    const checkCategoryVisibility = () => {
      if (isNewsletterCategory) return; // Skip for newsletter

      // Backend already filters categories, hierarchicalData contains only visible ones
      const visibleCategories = hierarchicalData.map(item => item.category);

      // If current selected category is not visible, redirect
      if (selectedCategoryId) {
        const isCurrentCategoryVisible = visibleCategories.some((cat) => cat.id === selectedCategoryId);
        if (!isCurrentCategoryVisible) {
          // Redirect to first visible category or newsletter
          if (visibleCategories.length > 0) {
            const firstVisible = hierarchicalData[0];
            if (firstVisible) {
              setSelectedCategoryId(firstVisible.category.id);
              setSelectedSubcategoryId(0);
              setSelectValue(String(firstVisible.category.id));
              router.replace(
                {
                  pathname: router.pathname,
                  query: { category: String(firstVisible.category.id), sub: 0 },
                },
                undefined,
                { shallow: true }
              );
            }
          } else if (newsletterExposed) {
            router.replace(
              {
                pathname: router.pathname,
                query: { category: "newsletter" },
              },
              undefined,
              { shallow: true }
            );
          }
        }
      }
    };

    // Check immediately
    checkCategoryVisibility();

    // Listen for storage changes (login/logout in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken' || e.key === 'user') {
        checkCategoryVisibility();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [hierarchicalData, router.isReady, newsletterExposed, selectedCategoryId, isNewsletterCategory]);

  // Page size map based on category type
  const pageSizeMap: Record<string, number> = {
    A: 9,  // Gallery
    B: 6,  // Snippet
    C: 10, // List
  };

  // Update insights when selection or filters change
  // index.tsx faylida useEffect larni o'zgartirish:

  // insights ni fetch qilish uchun yangi useEffect
  useEffect(() => {
    if (isNewsletterCategory) return;
    if (!selectedCategoryId || selectedSubcategoryId === null) return;

    const fetchInsights = async () => {
      try {
        setIsLoadingHierarchical(true);

        // Build query params for regular /insights API
        const params = new URLSearchParams();

        // Add pagination
        params.append('page', String(currentPage));

        // Get page size based on category type
        const categoryType = selectedCategory?.category.type?.toUpperCase() || "A";
        const pageSizeMap: Record<string, number> = {
          A: 9,  // Gallery
          B: 6,  // Snippet
          C: 10, // List
        };
        const limit = pageSizeMap[categoryType] || 9;
        params.append('limit', String(limit));

        // Add category filter
        params.append('categoryId', String(selectedCategoryId));

        // CRITICAL: sub=0 bo'lsa, subcategoryId QO'SHMAYMIZ!
        if (selectedSubcategoryId !== 0) {
          params.append('subcategoryId', String(selectedSubcategoryId));
        }

        // ADD SEARCH QUERY
        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim());
        }

        // Add member type and approval filters
        const { isLoggedIn, memberType, isApproved } = getUserAuthState();

        if (isLoggedIn && memberType) {
          params.append('memberType', memberType);
          if (memberType === 'INSURANCE' && isApproved !== null) {
            params.append('isApproved', String(isApproved));
          }
        } else {
          params.append('memberType', 'null');
        }

        console.log("Fetching /insights with params:", params.toString());

        // REGULAR /insights API dan foydalanish
        const response = await getClient<InsightResponse>(
          `${API_ENDPOINTS.INSIGHTS}?${params.toString()}`
        );

        if (response.data) {
          setInsights(response.data.items || []);
          setTotal(response.data.total || 0);
          setTotalPages(Math.ceil((response.data.total || 0) / limit));

          // Set display type based on category.type
          if (categoryType === "A") {
            setLibraryDisplayType("gallery");
          } else if (categoryType === "B") {
            setLibraryDisplayType("snippet");
          } else if (categoryType === "C") {
            setLibraryDisplayType("list");
          }
        }
      } catch (err) {
        console.error("Failed to fetch insights:", err);
        setError("데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoadingHierarchical(false);
      }
    };

    fetchInsights();
  }, [
    selectedCategoryId,
    selectedSubcategoryId,
    currentPage,
    searchQuery, // 검색어 변경 시 다시 fetch
    isNewsletterCategory
  ]);

  // 검색 핸들러 (Enter 키 또는 검색 버튼 클릭 시)
  // 검색 핸들러
  // 검색 핸들러
  // Search handler - faqat search query bilan
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // Search uchun debounce (1000ms)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleSearchChangeWithDebounce = useCallback((value: string) => {
    setSearchQuery(value);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const newTimeout = setTimeout(() => {
      setCurrentPage(1);
    }, 1000);

    setSearchTimeout(newTimeout);
  }, [searchTimeout]);

  // URL ni search query bilan yangilash
  useEffect(() => {
    if (!router.isReady) return;

    const currentQuery = { ...router.query };

    if (searchQuery.trim()) {
      currentQuery.search = searchQuery.trim();
    } else if ('search' in currentQuery) {
      delete currentQuery.search;
    }

    if (searchQuery.trim() || 'search' in currentQuery) {
      currentQuery.page = String(currentPage);

      router.replace(
        {
          pathname: router.pathname,
          query: currentQuery,
        },
        undefined,
        { shallow: true }
      );
    }
  }, [searchQuery, currentPage, router.isReady]);

  // Game item click handler
  const handleItemClick = (id: number) => {
    const query: Record<string, string> = {};
    
    if (selectedCategoryId) {
      query.category = String(selectedCategoryId);
    }
    
    // sub=0 bo'lsa ham queryga qo'shamiz
    if (selectedSubcategoryId !== null && selectedSubcategoryId !== undefined) {
      query.sub = String(selectedSubcategoryId);
    }
    
    if (searchQuery.trim()) {
      query.search = searchQuery.trim();
    }
    
    router.push({
      pathname: `/insights/${id}`,
      query: query
    });
  };
  
  // 정렬 핸들러 (ONLY for List type C)
  const handleSort = (field: SortField) => {
    // Only allow sorting for List type (C)
    if (libraryDisplayType !== "list") return;

    if (sortField === field) {
      // Same field clicked: toggle order (asc -> desc -> null)
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else if (sortOrder === "desc") {
        // Third click: reset to original order
        setSortField(null);
        setSortOrder("asc");
      }
    } else {
      // Different field clicked: set new field with asc order
      setSortField(field);
      setSortOrder("asc");
    }
    // Reset to first page when sorting changes
    setCurrentPage(1);
  };

  // getSortedInsights is no longer needed - sorting is applied before pagination in useEffect
  // This function is kept for backward compatibility with existing UI code
  const getSortedInsights = () => {
    // Sorting is already applied in the useEffect before pagination
    // This just returns the already-sorted-and-paginated insights
    return insights;
  };

  // 카테고리 선택 변경 핸들러 (NEW FORMAT: category only)
  const handleCategorySelectChange = (categoryValue: string | number) => {
    // Normalize to string for consistent handling
    const categoryValueStr = String(categoryValue);

    if (categoryValueStr === "newsletter") {
      // Newsletter category - use ONLY category=newsletter (no sub parameter)
      setIsNewsletterMode(true);
      setSelectedCategoryId(null); // Clear numeric category
      setSelectValue("newsletter"); // Explicitly update select state
      setCurrentPage(1); // Reset page when category changes
      setSearchQuery("");
      setSortField(null); // Reset sorting
      setSortOrder("asc");
      router.replace(
        {
          pathname: router.pathname,
          query: { category: "newsletter" },
        },
        undefined,
        { shallow: true }
      );
    } else {
      // Numeric category - always parse from string
      const categoryId = parseInt(categoryValueStr, 10);
      if (isNaN(categoryId)) return;

      const category = hierarchicalData.find((item) => item.category.id === categoryId);
      if (!category) return;

      setIsNewsletterMode(false); // Clear newsletter mode
      setSelectedCategoryId(categoryId);
      setSelectedSubcategoryId(0); // Default to "전체"
      setSelectValue(String(categoryId)); // Explicitly update select state with string
      setCurrentPage(1); // Reset page when category changes
      setSearchQuery("");
      setSortField(null); // Reset sorting
      setSortOrder("asc");

      // Update URL query - reset sub to default (전체 = 0), use string for category
      router.replace(
        {
          pathname: router.pathname,
          query: { category: String(categoryId), sub: 0 },
        },
        undefined,
        { shallow: true }
      );
    }
  };

  // 서브카테고리 선택 변경 핸들러 (NEW FORMAT: sub only)
  const handleSubcategoryChange = (subcategoryId: number) => {
    // Do not handle subcategory changes for newsletter (newsletter doesn't use sub)
    if (isNewsletterCategory || isNewsletterMode) {
      return;
    }

    setSelectedSubcategoryId(subcategoryId);
    setCurrentPage(1); // Reset page when subcategory changes
    setSortField(null); // Reset sorting
    setSortOrder("asc");

    // Update URL query - only update sub (for normal categories)
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, sub: subcategoryId },
      },
      undefined,
      { shallow: true }
    );
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 게시물 클릭 핸들러
  // const handleItemClick = (id: number) => {
  //   // 현재 query parametrlarini olish
  //   const query: Record<string, string> = {};

  //   // 현재 URL dan barcha query parametrlarini olish
  //   const currentUrl = new URL(window.location.href);
  //   const queryParams = new URLSearchParams(currentUrl.search);

  //   // Barcha mavjud parametrlarni o'tkazish
  //   queryParams.forEach((value, key) => {
  //     if (['category', 'sub', 'subMinor', 'search', 'q', 'page'].includes(key)) {
  //       query[key] = value;
  //     }
  //   });

  //   // category bo'lsa qo'shamiz
  //   if (selectedCategoryId) {
  //     query.category = String(selectedCategoryId);
  //   }

  //   // sub=0 ("전체") bo'lmasa qo'shamiz
  //   if (selectedSubcategoryId !== null && selectedSubcategoryId !== undefined && selectedSubcategoryId !== 0) {
  //     query.sub = String(selectedSubcategoryId);
  //   }

  //   // search query ni saqlash
  //   if (searchQuery.trim()) {
  //     query.query = searchQuery.trim();
  //   }

  //   // page ni reset qilish (detail page ga o'tganda)
  //   delete query.page;

  //   console.log("🔗 Navigating to detail with query:", query);

  //   router.push({
  //     pathname: `/insights/${id}`,
  //     query: query
  //   });
  // };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "";

    const date = new Date(dateString);

    const seoulTime = new Date(
      date.toLocaleString("en-US", { timeZone: "Asia/Seoul" })
    );

    const yyyy = seoulTime.getFullYear();
    const mm = String(seoulTime.getMonth() + 1).padStart(2, "0");
    const dd = String(seoulTime.getDate()).padStart(2, "0");
    const hh = String(seoulTime.getHours()).padStart(2, "0");
    const min = String(seoulTime.getMinutes()).padStart(2, "0");

    return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
  };




  // 브레드크럼 아이템
  const breadcrumbs = [{ label: "인사이트" }];

  // Dynamic select items from hierarchical data + newsletter
  // Always use string values for consistent type matching
  const getSelectItems = () => {
    // Always include newsletter option (even when hierarchicalData is empty)
    // This ensures 2nd select always has options for newsletter
    const dynamicCategories = hierarchicalData.length > 0
      ? hierarchicalData
        .map((item) => ({
          id: item.category.id,
          label: item.category.name,
          value: String(item.category.id), // Force string type
        }))
        .filter((item) => item.label) // Filter out empty names
      : [];

    // Add newsletter as last static option
    const items = [
      ...dynamicCategories,
      { id: "newsletter", label: "뉴스레터", value: "newsletter" },
    ];

    // Filter newsletter based on exposure
    // BUT: For newsletter mode, always include newsletter option to ensure dropdown renders
    const filtered = items.filter((item) => {
      if (item.id === "newsletter") {
        // Always include newsletter if newsletter mode is active (for dropdown to render)
        if (isNewsletterCategory || isNewsletterMode) {
          return true;
        }
        return newsletterExposed;
      }
      return true;
    });

    return filtered;
  };

  // Get current selected category for select display
  // Always use string type for consistent matching with options
  // Initialize immediately from URL query to ensure correct state on refresh/direct access
  const [selectValue, setSelectValue] = useState<string>(() => {
    // First check URL query directly (works on refresh/direct access)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const category = urlParams.get('category');
      if (category === 'newsletter') {
        return "newsletter";
      }
      if (category && !isNaN(Number(category))) {
        return category;
      }
    }
    // Fallback to initialCategoryValue from SSR
    if (initialCategoryValue === "newsletter") return "newsletter";
    if (typeof initialCategoryValue === "number") return String(initialCategoryValue);
    return String(initialCategoryValue || "");
  });

  // Update select value after hydration and API load - ensure controlled state
  useEffect(() => {
    if (!router.isReady) return; // Wait for router to be ready

    // For newsletter, always set value immediately (doesn't depend on hierarchicalData)
    if (isNewsletterCategory || isNewsletterMode) {
      setSelectValue("newsletter");
      return; // Early return for newsletter - don't wait for hierarchicalData
    }

    // For normal categories, wait for hierarchicalData
    const selectItems = getSelectItems();

    if (selectItems.length === 0) {
      // Don't update if no items available yet (but newsletter already handled above)
      return;
    } else if (selectedCategoryId !== null) {
      // Explicitly set select state after API load
      setSelectValue(String(selectedCategoryId));
    } else {
      // Fallback to first available item
      const firstItem = selectItems[0];
      if (firstItem) {
        setSelectValue(String(firstItem.value));
      }
    }
  }, [router.isReady, isNewsletterCategory, isNewsletterMode, selectedCategoryId, hierarchicalData, newsletterExposed]);

  const getCurrentSelectValue = (): string => {
    return selectValue;
  };

  // Get selected category object
  const selectedCategory = selectedCategoryId && hierarchicalData.length > 0
    ? hierarchicalData.find((item) => item.category.id === selectedCategoryId)
    : null;

  // Get subcategories for current category (including virtual "전체")
  const getCurrentSubcategories = () => {
    if (isNewsletterCategory || !selectedCategoryId || hierarchicalData.length === 0) {
      return [];
    }

    if (!selectedCategory) return [];

    // Prepend virtual "전체" subcategory
    const 전체Subcategory = {
      id: 0,
      name: "전체",
      items: selectedCategory.subcategories.reduce<InsightItem[]>(
        (acc, sub) => [...acc, ...(sub.items || [])],
        []
      ),
    };

    return [전체Subcategory, ...selectedCategory.subcategories];
  };

  return (
    <div className={styles.insightsPage}>
      <SEO pageType="menu" menuName="인사이트" />
      <Header
        variant="white"
        onMenuClick={() => setIsMenuOpen(true)}
        isFixed={true}
      />
      <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      {!isNewsletterCategory ? <div className={styles.headerImage}>
        <h1 className={styles.headerTitle}>INSIGHTS</h1>
        <p className={styles.headerSubtitle}>인사이트</p>
      </div> : <div className={styles.headerImageNews + " " + styles.headerImage}>
        <h1 className={styles.headerTitle}>EDUCATION</h1>
        <p className={styles.headerSubtitle}>교육/세미나</p>
      </div>}
      <div className={styles.content}>
        <div className="container">
          <div className={styles.pageHeaderWrapper}>
            <PageHeader
              breadcrumbs={breadcrumbs}
              size="web"
              selects={{
                level2: {
                  value: getCurrentSelectValue(), // Always string type
                  options: (() => {
                    const items = getSelectItems();

                    // Map items to select options format
                    let options = items.map((item) => ({
                      label: item.label,
                      value: item.value, // Already string from getSelectItems
                    }));

                    // For newsletter mode, ensure we always have multiple options to render dropdown (not static text)
                    // SelectDropdown component renders static text when options.length === 1
                    // So we need at least 2 options to show dropdown
                    if (isNewsletterCategory || isNewsletterMode) {
                      const hasNewsletter = options.some(opt => opt.value === "newsletter");

                      // Ensure newsletter option exists
                      if (!hasNewsletter && newsletterExposed) {
                        options.push({ label: "뉴스레터", value: "newsletter" });
                      }

                      // CRITICAL: If only newsletter option exists (hierarchicalData not loaded yet),
                      // we need to ensure dropdown still renders by having at least 2 options
                      // We'll keep newsletter + wait for hierarchicalData, but ensure newsletter is always included
                      // The key is: newsletter should always be in options when newsletter mode is active
                      if (options.length === 0 && newsletterExposed) {
                        // This should not happen if getSelectItems() works correctly, but safety check
                        options = [{ label: "뉴스레터", value: "newsletter" }];
                      }

                      // IMPORTANT: If we only have newsletter (1 option), SelectDropdown will render static text
                      // To ensure dropdown renders, we need at least 2 options
                      // But we can't add fake options - we need to ensure hierarchicalData loads
                      // However, for newsletter mode, we should always have newsletter + other categories
                      // So if options.length === 1, it means hierarchicalData hasn't loaded yet
                      // In this case, we should still return the options (newsletter) and let it render
                      // Once hierarchicalData loads, options will have multiple items and dropdown will appear
                    }

                    return options;
                  })(),
                  onChange: (value) => {
                    // Value is already string from PageHeader component
                    const categoryValue = String(value);
                    handleCategorySelectChange(categoryValue);
                  },
                },
                // Do NOT render level3 select for newsletter - only show first two selects
              }}
            />
          </div>

          <div className={styles.mainContent}>

            {!isNewsletterCategory && (
              <>
                <div className={styles.columnTitleSection}>
                  <p className={styles.columnSubtitle}>Column</p>
                  <h2 className={styles.columnTitle}>{selectedCategory?.category.name}</h2>
                </div>

                {/* 모바일 검색 섹션 */}
                <div className={styles.mobileSearchSection}>
                  <SearchField
                    placeholder="제목을 입력해주세요"
                    value={searchQuery}
                    onChange={handleSearchChangeWithDebounce}
                    onSearch={handleSearch}
                    fullWidth
                  />
                </div>

                <div className={styles.columnContent}>
                  <nav className={styles.categoryNav}>
                    {getCurrentSubcategories().map((subcategory) => (
                      <button
                        key={subcategory.id}
                        className={`${styles.categoryItem} ${selectedSubcategoryId === subcategory.id
                          ? styles.categoryItemActive
                          : ""
                          }`}
                        onClick={() => handleSubcategoryChange(subcategory.id)}
                      >
                        {selectedSubcategoryId === subcategory.id && (
                          <span className={styles.activeDot} />
                        )}
                        <span>{subcategory.name}</span>
                      </button>
                    ))}
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
                          onChange={handleSearchChangeWithDebounce}
                          onSearch={handleSearch}
                          fullWidth
                        />
                      </div>
                    </div>

                    <div className={styles.divider} />

                    {isLoadingHierarchical ? (
                      <div className={styles.empty}>
                        <p>로딩 중...</p>
                      </div>
                    ) : error ? (
                      <div className={styles.error}>
                        <div className={styles.errorIcon}>⚠️</div>
                        <p>{error}</p>
                      </div>
                    ) : insights.length === 0 ? (
                      <div className={styles.empty}>
                        <img
                          src="/images/common/empty-icon.svg"
                          alt="빈 상태"
                          className={styles.emptyIcon}
                        />
                        <p>등록된 게시글이 없습니다.</p>
                      </div>
                    ) : libraryDisplayType === "gallery" ? (
                      <>
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
                                  typeof item.subMinorCategory?.name === "string"
                                    ? item.subMinorCategory.name

                                    : "카테고리명"
                                }
                                description={
                                  plainContent.length > 150
                                    ? `${plainContent.substring(0, 150)}...`
                                    : plainContent
                                }
                                author={item.authorName ? item.authorName : "작성자명"}
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


                    ) : libraryDisplayType === "snippet" ? (
                      <>
                        <div className={styles.librarySnippet}>
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
                                        styles.libraryCardTitle
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
                                      {item.authorName}
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
                        <div className={styles.paginationWrapper}>
                          <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            visiblePages={4}
                          />
                        </div>
                      </>
                    ) : (
                      <> <div className={styles.libraryList}>
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
                              {sortField === "category" && (
                                <Icon
                                  type={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                                  size={16}
                                  className={styles.sortIcon}
                                />
                              )}
                            </div>
                            <div className={styles.libraryListHeaderCell}>
                              제목
                            </div>
                            <div
                              className={`${styles.libraryListHeaderCell} ${styles.sortable}`}
                              onClick={() => handleSort("author")}
                            >
                              작성자
                              {sortField === "author" && (
                                <Icon
                                  type={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                                  size={16}
                                  className={styles.sortIcon}
                                />
                              )}
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
                            {sortField === "category" && (
                              <Icon
                                type={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                                size={16}
                                className={styles.sortIcon}
                              />
                            )}
                          </div>
                          <div
                            className={`${styles.mobileListHeaderCell} ${styles.sortable}`}
                            onClick={() => handleSort("author")}
                          >
                            작성자
                            {sortField === "author" && (
                              <Icon
                                type={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                                size={16}
                                className={styles.sortIcon}
                              />
                            )}
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
                                {(currentPage - 1) * 10 + index + 1}
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
                                  {item?.files?.length > 0 && (
                                    <img
                                      src="/images/common/insightFile-icon.svg"
                                      alt="첨부 파일"
                                      className={styles.mobileListFileIcon}
                                    />
                                  )}
                                </span>
                              </div>
                              <div className={styles.libraryListCell}>
                                {item.authorName || "작성자명"}
                              </div>
                              <div className={styles.libraryListCell}>
                                {item.createdAt
                                  ? formatDateTime(item.createdAt)
                                  : "2025.10.14 13:05"}
                              </div>
                              <div className={styles.libraryListCell}>
                                {item.viewCount ? item.viewCount : "0"}
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
                                {item?.files?.length > 0 && (
                                  <img
                                    src="/images/common/insightFile-icon.svg"
                                    alt="첨부 파일"
                                    className={styles.mobileListFileIcon}
                                  />
                                )}
                              </div>
                              <div className={styles.mobileListAuthor}>
                                "작성자명"
                              </div>
                              <div className={styles.mobileListBottom}>
                                <span className={styles.mobileListNo}>
                                  NO.{(currentPage - 1) * 10 + index + 1}
                                </span>
                                <span className={styles.mobileListDivider}></span>
                                <span className={styles.mobileListViews}>
                                  <img
                                    src="/images/common/eye-icon.svg"
                                    alt="조회수"
                                    className={styles.mobileListEyeIcon}
                                  />
                                  {item.viewCount ? item.viewCount : "0"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
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



            {isNewsletterCategory && (
              <div className={styles.newsletterSection}>
                <div className={styles.newsletterHero}>
                  <p className={styles.newsletterLabel}>Newsletter</p>
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
                            onBlur={handleEmailBlur}
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
                            <button className={styles.newsletterLink} onClick={() => handleOpenTermsModal('privacy')}>보기</button>
                          </div>
                          <div className={styles.newsletterCheckboxRow}>
                            <Checkbox
                              variant="square"
                              checked={optionalAgreed}
                              onChange={setOptionalAgreed}
                              label="[선택] OO OOOOO 이용 동의"
                            />
                            <button className={styles.newsletterLink} onClick={() => handleOpenTermsModal('marketing')}>보기</button>
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
      </div>

      <Footer />
      
      {/* Terms Modal */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={handleCloseTermsModal}
        termsType={activeTermsType}
      />
    </div>
    // </div>
  );
};

// index.tsx da getServerSideProps:

// index.tsx da getServerSideProps:

export const getServerSideProps: GetServerSideProps<InsightsPageProps> = async (context) => {
  const { category, sub, search } = context.query;
  const isNewsletter = category === "newsletter";

  if (isNewsletter) {
    return {
      props: {
        initialInsights: [],
        initialTotal: 0,
        initialTotalPages: 1,
        initialActiveTab: "newsletter",
        initialLibraryDisplayType: null,
        initialCategoryValue: "newsletter",
        error: null,
      },
    };
  }

  try {
    const hierarchicalResponse = await get<InsightHierarchicalData>(
      `${API_ENDPOINTS.INSIGHTS}/hierarchical`
    );

    let selectedCategoryId: number | null = null;
    if (category && category !== "newsletter") {
      selectedCategoryId = parseInt(category as string, 10);
    }

    let initialItems: InsightItem[] = [];
    let displayType: LibraryDisplayType | null = null;

    if (selectedCategoryId) {
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '10');
      params.append('categoryId', String(selectedCategoryId));

      if (sub && sub !== '0') {
        params.append('subcategoryId', String(sub));
      }

      // Faqat search query ishlatish
      if (search && typeof search === 'string') {
        params.append('search', search);
      }

      const insightsResponse = await get<InsightResponse>(
        `${API_ENDPOINTS.INSIGHTS}?${params.toString()}`
      );

      if (insightsResponse.data) {
        initialItems = insightsResponse.data.items || [];

        const categoryData = hierarchicalResponse.data?.find(
          item => item.category.id === selectedCategoryId
        );

        if (categoryData) {
          const categoryType = categoryData.category.type?.toUpperCase() || "A";
          if (categoryType === "A") {
            displayType = "gallery";
          } else if (categoryType === "B") {
            displayType = "snippet";
          } else if (categoryType === "C") {
            displayType = "list";
          }
        }
      }
    }

    return {
      props: {
        initialInsights: initialItems,
        initialTotal: initialItems.length,
        initialTotalPages: 1,
        initialActiveTab: "column",
        initialLibraryDisplayType: displayType,
        initialCategoryValue: selectedCategoryId ?? "",
        error: null,
      },
    };
  } catch (err) {
    return {
      props: {
        initialInsights: [],
        initialTotal: 0,
        initialTotalPages: 1,
        initialActiveTab: "column",
        initialLibraryDisplayType: null,
        initialCategoryValue: "",
        error: "데이터를 불러오는데 실패했습니다.",
      },
    };
  }
};
export default InsightsPage;
