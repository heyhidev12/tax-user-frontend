import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import Head from "next/head";
import dynamic from "next/dynamic";
import "@toast-ui/editor/dist/toastui-editor-viewer.css";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import Header from "@/components/common/Header";
import Menu from "@/components/Menu";
import Footer from "@/components/Footer";
import FloatingButton from "@/components/common/FloatingButton";
import PageHeader from "@/components/common/PageHeader";
import ContentBox from "@/components/common/ContentBox";
import Icon from "@/components/common/Icon";
import SEO from "@/components/common/SEO";
import { get as getClient } from "@/lib/api";
import { get } from "@/lib/api-server";
import { API_ENDPOINTS } from "@/config/api";
import styles from "./detail.module.scss";
import ContactUs from "@/components/common/ContactUs";

// Toast UI Viewer는 클라이언트 사이드에서만 로드
const Viewer = dynamic(
  () => import("@toast-ui/react-editor").then((mod) => mod.Viewer),
  { ssr: false },
);

interface SectionContent {
  content: string;
  section: string;
}

export interface BusinessAreaDetail {
  id: number;
  name: string;
  subDescription: string;
  image: {
    id: number;
    url: string;
  };
  majorCategory: {
    id: number;
    name: string;
    sections: string[];
    isExposed: boolean;
    displayOrder: number;
  };
  minorCategory: {
    id: number;
    name: string;
    isExposed: boolean;
  };
  overview: string;
  sectionContents: SectionContent[];
  youtubeUrls: string[];
  isMainExposed: boolean;
  isExposed: boolean;
  displayOrder: number;
}

interface Expert {
  id: number;
  name: string;
  position?: string;
  affiliation?: string;
  tel?: string;
  phoneNumber?: string;
  email?: string;
  imageUrl?: string;
  mainPhoto?: {
    id: number;
    url: string;
  };
  workAreas?: string[] | Array<{ id: number; value: string }>;
  tags?: string[]; // 전문 분야 태그
}

interface InsightItem {
  id: number;
  title: string;
  content: string;
  thumbnail?: {
    url: string;
  };
  createdAt?: string;
  category?: string | { id: number; name: string; type: string }; // 카테고리 (문자열 또는 객체)
  authorName?: string; // 작성자
  subMinorCategory?: SubMinorCategory;
}

interface SubMinorCategory {
  id: number;
  name: string;
  majorCategory: { id: number; name: string };
}
interface InsightResponse {
  items: InsightItem[];
  total: number;
}

interface BusinessAreaDetailPageProps {
  data: BusinessAreaDetail | null;
  error: string | null;
}

const BusinessAreaDetailPage: React.FC<BusinessAreaDetailPageProps> = ({
  data: initialData,
  error: initialError,
}) => {
  const router = useRouter();
  const { id } = router.query;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [data, setData] = useState<BusinessAreaDetail | null>(initialData);
  const [error, setError] = useState<string | null>(initialError);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [relatedNews, setRelatedNews] = useState<InsightItem[]>([]);
  // Swiper refs for controlling carousels
  const expertsSwiperRef = useRef<SwiperType | null>(null);
  const youtubeSwiperRef = useRef<SwiperType | null>(null);
  const newsSwiperRef = useRef<SwiperType | null>(null);
  const [expertsButtonsDisabled, setExpertsButtonsDisabled] = useState({
    prev: true,
    next: false,
  });
  const [youtubeButtonsDisabled, setYoutubeButtonsDisabled] = useState({
    prev: true,
    next: false,
  });
  const [newsButtonsDisabled, setNewsButtonsDisabled] = useState({
    prev: true,
    next: false,
  });

  // Update button states helper
  const updateExpertsButtons = useCallback(() => {
    if (expertsSwiperRef.current) {
      setExpertsButtonsDisabled({
        prev: expertsSwiperRef.current.isBeginning,
        next: expertsSwiperRef.current.isEnd,
      });
    }
  }, []);

  const updateYoutubeButtons = useCallback(() => {
    if (youtubeSwiperRef.current) {
      setYoutubeButtonsDisabled({
        prev: youtubeSwiperRef.current.isBeginning,
        next: youtubeSwiperRef.current.isEnd,
      });
    }
  }, []);

  const updateNewsButtons = useCallback(() => {
    if (newsSwiperRef.current) {
      setNewsButtonsDisabled({
        prev: newsSwiperRef.current.isBeginning,
        next: newsSwiperRef.current.isEnd,
      });
    }
  }, []);

  // Set up event listeners when Swiper instances are ready
  useEffect(() => {
    const swiper = expertsSwiperRef.current;
    if (!swiper) return;

    swiper.on("slideChange", updateExpertsButtons);
    swiper.on("init", updateExpertsButtons);
    updateExpertsButtons(); // Initial state

    return () => {
      swiper.off("slideChange", updateExpertsButtons);
      swiper.off("init", updateExpertsButtons);
    };
  }, [experts.length, updateExpertsButtons]);

  useEffect(() => {
    const swiper = youtubeSwiperRef.current;
    if (!swiper) return;

    swiper.on("slideChange", updateYoutubeButtons);
    swiper.on("init", updateYoutubeButtons);
    updateYoutubeButtons(); // Initial state

    return () => {
      swiper.off("slideChange", updateYoutubeButtons);
      swiper.off("init", updateYoutubeButtons);
    };
  }, [data?.youtubeUrls?.length, updateYoutubeButtons]);

  useEffect(() => {
    const swiper = newsSwiperRef.current;
    if (!swiper) return;

    swiper.on("slideChange", updateNewsButtons);
    swiper.on("init", updateNewsButtons);
    updateNewsButtons(); // Initial state

    return () => {
      swiper.off("slideChange", updateNewsButtons);
      swiper.off("init", updateNewsButtons);
    };
  }, [relatedNews.length, updateNewsButtons]);
  const [imageError, setImageError] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [youtubeVideos, setYoutubeVideos] = useState<{
    [key: string]: { title: string; author_name: string };
  }>({});
  const [isOverviewPassed, setIsOverviewPassed] = useState(false);
  const [isOverviewBannerExpanded, setIsOverviewBannerExpanded] =
    useState(false);
  // Category data for selects
  const [majorCategories, setMajorCategories] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [minorCategories, setMinorCategories] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [minorCategoryItems, setMinorCategoryItems] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const checkpointRef = useRef<HTMLDivElement>(null);
  const executionRef = useRef<HTMLDivElement>(null);
  const riskRef = useRef<HTMLDivElement>(null);
  const rootCauseRef = useRef<HTMLDivElement>(null);
  const casesRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);

  // Client-side: fetch related data (experts, news)
  useEffect(() => {
    if (id && typeof id === "string" && data?.id) {
      console.log("Fetching related data for workArea:", data);
      fetchRelatedData();
      setImageError(false); // 새 데이터 로드 시 이미지 에러 상태 초기화
    }
  }, [id, data?.id]);

  // 섹션 활성화 감지 (목차 하이라이트용)
  useEffect(() => {
    if (!data) return;

    const sections = [
      { id: "checkpoint", ref: checkpointRef },
      { id: "execution", ref: executionRef },
      { id: "cases", ref: casesRef },
      { id: "risk", ref: riskRef },
      { id: "rootcause", ref: rootCauseRef },
    ].filter((section) => {
      if (section.id === "checkpoint")
        return data.majorCategory.sections.includes("체크포인트");
      if (section.id === "execution")
        return data.majorCategory.sections.includes("함께 실행방안");
      if (section.id === "cases")
        return data.majorCategory.sections.includes("케이스");
      if (section.id === "risk")
        return data.majorCategory.sections.includes("리스크");
      if (section.id === "rootcause")
        return data.majorCategory.sections.includes("발생원인");
      return false;
    });

    const observers: IntersectionObserver[] = [];

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      // 가장 많이 보이는 섹션을 찾기
      let maxRatio = 0;
      let activeId: string | null = null;

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          const section = sections.find((s) => s.ref.current === entry.target);
          if (section && entry.intersectionRatio > 0.1) {
            activeId = section.id;
          }
        }
      });

      if (activeId) {
        setActiveSection(activeId);
      }
    };

    sections.forEach(({ ref }) => {
      if (!ref.current) return;

      const observer = new IntersectionObserver(handleIntersection, {
        threshold: [0, 0.1, 0.3, 0.5, 0.7, 1],
        rootMargin: "-10% 0px -70% 0px",
      });

      observer.observe(ref.current);
      observers.push(observer);
    });

    // 초기 스크롤 위치 확인
    const checkInitialSection = () => {
      sections.forEach(({ id, ref }) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const isVisible =
          rect.top < viewportHeight * 0.5 && rect.bottom > viewportHeight * 0.3;
        if (isVisible) {
          setActiveSection(id);
        }
      });
    };

    // 약간의 지연 후 초기 섹션 확인
    const timeoutId = setTimeout(checkInitialSection, 100);

    return () => {
      observers.forEach((observer) => observer.disconnect());
      clearTimeout(timeoutId);
    };
  }, [data]);

  // Overview 섹션이 화면에서 보이지 않는지 감지
  useEffect(() => {
    if (!overviewRef.current || !data?.overview) return;

    const handleScroll = () => {
      if (!overviewRef.current) return;
      const rect = overviewRef.current.getBoundingClientRect();
      // Overview 섹션이 화면에서 완전히 사라졌는지 확인 (화면 상단을 지나갔을 때)
      // rect.bottom <= 0이면 Overview가 화면 위로 완전히 사라짐
      // rect.bottom > 0이면 Overview가 다시 보임
      const isNotVisible = rect.bottom <= 0;
      setIsOverviewPassed(isNotVisible);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // 초기 상태 확인

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [data]);

  // Fetch hierarchical data for categories (major categories)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getClient<
          Array<{
            majorCategory: { id: number; name: string };
            minorCategories: Array<{ id: number; name: string }>;
          }>
        >(`${API_ENDPOINTS.BUSINESS_AREAS_HIERARCHICAL}?limit=20&page=1`);

        if (response.data && Array.isArray(response.data)) {
          // Extract unique major categories
          const majors = response.data.map((item) => item.majorCategory);
          setMajorCategories(majors);
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };

    fetchCategories();
  }, []);

  // Update minor categories when data changes
  useEffect(() => {
    if (!data) return;

    const updateMinorCategories = async () => {
      try {
        const response = await get<
          Array<{
            majorCategory: { id: number; name: string };
            minorCategories: Array<{
              id: number;
              name: string;
              items?: Array<{ id: number; name: string }>;
            }>;
          }>
        >(`${API_ENDPOINTS.BUSINESS_AREAS_HIERARCHICAL}?limit=20&page=1`);

        if (response.data && Array.isArray(response.data)) {
          // Find current major category and set its minor categories
          const currentMajor = response.data.find(
            (item) => item.majorCategory.id === data.majorCategory.id,
          );
          if (currentMajor) {
            setMinorCategories(
              currentMajor.minorCategories.map((cat) => ({
                id: cat.id,
                name: cat.name,
              })),
            );

            // Find current minor category and set its items
            const currentMinorCategory = currentMajor.minorCategories.find(
              (cat) => cat.id === data.minorCategory.id,
            );
            if (currentMinorCategory && currentMinorCategory.items) {
              setMinorCategoryItems(
                currentMinorCategory.items.map((item) => ({
                  id: item.id,
                  name: item.name,
                })),
              );
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch minor categories:", err);
      }
    };

    updateMinorCategories();
  }, [data?.majorCategory.id, data?.minorCategory.id]);

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

  const fetchRelatedData = async () => {
    try {
      // 관련 업무 세무사 가져오기 (workArea 파라미터 사용)
      if (data?.minorCategory.id && typeof id === "string") {
        try {
          const url = `${API_ENDPOINTS.MEMBERS}?page=1&limit=20&workArea=${data?.minorCategory.id}`;
          console.log("Calling members API:", url);
          const membersResponse = await getClient<
            Expert[] | { items: Expert[]; data: Expert[] }
          >(url);
          console.log("Members API response:", membersResponse);

          if (membersResponse.data) {
            // 응답이 배열인 경우와 객체인 경우 모두 처리
            let expertsList: Expert[] = [];
            if (Array.isArray(membersResponse.data)) {
              expertsList = membersResponse.data;
            } else {
              const response = membersResponse.data as {
                items?: Expert[];
                data?: Expert[];
              };
              expertsList = response.items || response.data || [];
            }
            // workAreas를 tags로 변환
            expertsList = expertsList.map((expert) => ({
              ...expert,
              tags: expert.workAreas
                ? expert.workAreas.map((area) =>
                  typeof area === "string" ? area : area.value,
                )
                : expert.tags || [],
              tel: expert.tel || expert.phoneNumber,
              position: expert.position || expert.affiliation || "세무사",
            }));
            setExperts(expertsList);
          }
        } catch (err) {
          console.error("세무사 데이터를 불러오는 중 오류:", err);
          setExperts([]);
        }
      }

      // 관련 소식 가져오기
      try {
        const userParams = buildUserFilterParams();
        const newsResponse = await getClient<InsightResponse>(
          `${API_ENDPOINTS.INSIGHTS}?page=1&limit=10${userParams}&subMinorCategoryId=${data?.minorCategory.id}`,
        );
        if (newsResponse.data?.items) {
          setRelatedNews(newsResponse.data.items);
        }
      } catch (err) {
        // 실패 시 빈 배열
        setRelatedNews([]);
      }
    } catch (err) {
      console.error("관련 데이터를 불러오는 중 오류:", err);
    }
  };

  const getSectionContent = (sectionName: string): string => {
    if (!data?.sectionContents) return "";
    const section = data.sectionContents.find(
      (sc) => sc.section === sectionName,
    );
    return section?.content || "";
  };

  const extractYouTubeId = (url: string): string | null => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const fetchYouTubeVideoInfo = async (url: string) => {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        url,
      )}&format=json`;
      const response = await fetch(oembedUrl);
      if (response.ok) {
        const data = await response.json();
        return { title: data.title, author_name: data.author_name };
      }
    } catch (err) {
      console.error("YouTube video info fetch error:", err);
    }
    return null;
  };

  // YouTube 영상 정보 가져오기
  useEffect(() => {
    if (data?.youtubeUrls && data.youtubeUrls.length > 0) {
      const fetchAllVideoInfo = async () => {
        const videoInfoMap: {
          [key: string]: { title: string; author_name: string };
        } = {};
        await Promise.all(
          data.youtubeUrls.map(async (url) => {
            const info = await fetchYouTubeVideoInfo(url);
            if (info) {
              videoInfoMap[url] = info;
            }
          }),
        );
        setYoutubeVideos(videoInfoMap);
      };
      fetchAllVideoInfo();
    }
  }, [data?.youtubeUrls]);

  const handleTopClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConsultClick = () => {
    // Pass the minor category ID as query param for auto-selection
    const categoryId = data?.minorCategory?.id;
    if (categoryId) {
      router.push(`/consultation/apply?categoryId=${categoryId}`);
    } else {
      router.push("/consultation/apply");
    }
  };

  const handleExpertPrev = () => {
    expertsSwiperRef.current?.slidePrev();
  };

  const handleExpertNext = () => {
    expertsSwiperRef.current?.slideNext();
  };

  const handleYoutubePrev = () => {
    youtubeSwiperRef.current?.slidePrev();
  };

  const handleYoutubeNext = () => {
    youtubeSwiperRef.current?.slideNext();
  };

  const handleNewsPrev = () => {
    newsSwiperRef.current?.slidePrev();
  };

  const handleNewsNext = () => {
    newsSwiperRef.current?.slideNext();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}.${String(date.getDate()).padStart(2, "0")}`;
  };

  if (error || !data) {
    return (
      <div className={styles.page}>
        <Header variant="transparent" onMenuClick={() => setIsMenuOpen(true)} />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className="container">
          <div className={styles.error}>
            <p>{error || "업무 분야를 찾을 수 없습니다."}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Breadcrumb 생성 (fallback for mobile)
  const breadcrumbs = [
    { label: "업무 분야", href: "/business-areas/hierarchical" },
    {
      label: data.majorCategory.name,
      href: `/business-areas/hierarchical?tab=${data.majorCategory.id}`
    },
    {
      label: data.minorCategory.name,
      href: `/business-areas/hierarchical?tab=${data.majorCategory.id}&subtab=${data.minorCategory.id}`
    },
    { label: data.name }, // 현재 페이지는 링크 없음
  ];

  // Custom selects with API-driven options for business-areas detail page
  const selects = {
    level2:
      majorCategories.length > 0
        ? {
          value: data.majorCategory.id,
          options: majorCategories.map((cat) => ({
            label: cat.name,
            value: cat.id,
          })),
          onChange: (value: string | number) => {
            router.push(`/business-areas/hierarchical?tab=${value}`);
          },
        }
        : undefined,
    level3:
      minorCategories.length > 0
        ? {
          value: data.minorCategory.id,
          options: minorCategories.map((cat) => ({
            label: cat.name,
            value: cat.id,
          })),
          onChange: (value: string | number) => {
            // Navigate to hierarchical page with selected minor category expanded
            router.push(
              `/business-areas/hierarchical?tab=${data.majorCategory.id}&subtab=${value}`
            );
          },
        }
        : undefined,
    level4:
      minorCategoryItems.length > 0
        ? {
          value: data.id,
          options: minorCategoryItems.map((item) => ({
            label: item.name,
            value: item.id,
          })),
          onChange: (value: string | number) => {
            router.push(`/business-areas/${value}`);
          },
        }
        : undefined,
  };

  return (
    <>
      <SEO
        title={data.name ? `${data.name} | 세무법인 함께` : "업무 분야 | 세무법인 함께"}
        description={data.subDescription || `${data.name} 관련 세무 서비스 제공`}
      />
      <div className={styles.page}>
        <Header
          variant="white"
          onMenuClick={() => setIsMenuOpen(true)}
          isFixed={true}
        />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        <div className={styles.headerImage}>
          <h1 className={styles.headerTitle}> PRACTICE AREAS</h1>
          <p className={styles.headerSubtitle}>업무분야</p>
        </div>
        <div className="container">
          {/* Page Header with Selects */}
          <div className={styles.pageHeaderWrapper}>
            <PageHeader
              title={data.name}
              breadcrumbs={breadcrumbs}
              selects={selects}
              size="web"
            />
          </div>

          <div className={styles.heroContent}>
            {data.subDescription && (
              <p className={styles.heroDescription}>{data.subDescription}</p>
            )}
          </div>

          <div className={styles.heroSection}>
            {data.image?.url && !imageError ? (
              <img
                src={data.image.url}
                alt={data.name}
                className={styles.heroImage}
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
            ) : (
              <div className={styles.imagePlaceholder}>
                <span>{data.name}</span>
              </div>
            )}
            <div className={styles.heroOverlay} />
          </div>

          {/* Fixed Overview Banner - Shows when Overview section is not visible */}
          {isOverviewPassed && data.overview && (
            <div
              className={`${styles.overviewFixedBanner} ${isOverviewBannerExpanded ? styles.expanded : ""
                }`}
              onClick={() =>
                setIsOverviewBannerExpanded(!isOverviewBannerExpanded)
              }
            >
              <div className="container">
                <div className={styles.overviewFixedBannerContent}>
                  {/* 모바일 헤더 (OVERVIEW + 토글) */}
                  <div className={styles.overviewFixedBannerHeader}>
                    <div className={styles.overviewFixedBannerTitle}>
                      <span></span>
                      Overview
                    </div>
                    <div className={styles.overviewFixedBannerToggle}>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d={
                            isOverviewBannerExpanded
                              ? "M5 12.5L10 7.5L15 12.5"
                              : "M5 7.5L10 12.5L15 7.5"
                          }
                          stroke="#2d2d2d"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                  {/* 데스크탑 타이틀 */}
                  <div className={styles.overviewFixedBannerTitleDesktop}>
                    <span></span>
                    Overview
                  </div>
                  <div className={styles.overviewFixedBannerDivider} />
                  <div
                    className={`${styles.overviewFixedBannerBody} ${!isOverviewBannerExpanded ? styles.collapsed : ""
                      }`}
                  >
                    <div className={styles.overviewContentInner}>
                      <Viewer initialValue={data.overview} />
                    </div>
                  </div>
                  {/* 데스크탑 토글 */}
                  <div className={styles.overviewFixedBannerToggleDesktop}>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d={
                          isOverviewBannerExpanded
                            ? "M5 12.5L10 7.5L15 12.5"
                            : "M5 7.5L10 12.5L15 7.5"
                        }
                        stroke="#2d2d2d"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Sticky Tab Navigation - Shows when scrolled past overview */}
          {isOverviewPassed && (
            <nav className={styles.mobileStickyNav}>
              {data.majorCategory.sections.includes("발생원인") && (
                <button
                  className={`${styles.mobileTabItem} ${activeSection === "rootcause"
                      ? styles.mobileTabItemActive
                      : ""
                    }`}
                  onClick={() =>
                    document
                      .getElementById("rootcause")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <span>발생원인</span>
                </button>
              )}
              {data.majorCategory.sections.includes("리스크") && (
                <button
                  className={`${styles.mobileTabItem} ${activeSection === "risk" ? styles.mobileTabItemActive : ""
                    }`}
                  onClick={() =>
                    document
                      .getElementById("risk")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <span>리스크</span>
                </button>
              )}
              {data.majorCategory.sections.includes("체크포인트") && (
                <button
                  className={`${styles.mobileTabItem} ${activeSection === "checkpoint"
                      ? styles.mobileTabItemActive
                      : ""
                    }`}
                  onClick={() =>
                    document
                      .getElementById("checkpoint")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <span>체크포인트</span>
                </button>
              )}
              {data.majorCategory.sections.includes("함께 실행방안") && (
                <button
                  className={`${styles.mobileTabItem} ${activeSection === "execution"
                      ? styles.mobileTabItemActive
                      : ""
                    }`}
                  onClick={() =>
                    document
                      .getElementById("execution")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <span>함께 실행방안</span>
                </button>
              )}
              {data.majorCategory.sections.includes("케이스") && (
                <button
                  className={`${styles.mobileTabItem} ${activeSection === "cases" ? styles.mobileTabItemActive : ""
                    }`}
                  onClick={() =>
                    document
                      .getElementById("cases")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <span>케이스</span>
                </button>
              )}
            </nav>
          )}

          {/* Overview Section - Below Hero Image */}
          {data.overview && (
            <div ref={overviewRef} className={styles.overviewSectionWrapper}>
              <h2 className={styles.overviewTitle}>Overview</h2>
              <div className={styles.overviewContent}>
                <p>개요</p>
                <div className={styles.overviewContentInner}>
                  <Viewer initialValue={data.overview} />
                </div>
              </div>
            </div>
          )}

          <div className={styles.contentWrapper}>
            {/* Main Content */}
            <div className={styles.mainContent}>
              {data.majorCategory.sections.includes("발생원인") && (
                <section
                  id="rootcause"
                  ref={rootCauseRef}
                  className={styles.section}
                >
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Root Cause</h2>
                  </div>
                  <div className={styles.sectionContent}>
                    <h3 className={styles.subSectionTitle}>발생원인</h3>
                    <ContentBox>
                      <div className={styles.overlay} />
                      <div className={styles.executionContent}>
                        {getSectionContent("발생원인") && (
                          <div className={styles.contentText}>
                            <Viewer
                              initialValue={getSectionContent("발생원인")}
                            />
                          </div>
                        )}
                      </div>
                    </ContentBox>
                  </div>
                </section>
              )}
              {data.majorCategory.sections.includes("리스크") && (
                <section id="risk" ref={riskRef} className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Risk</h2>
                  </div>
                  <div className={styles.sectionContent}>
                    <h3 className={styles.subSectionTitle}>리스크</h3>
                    <ContentBox>
                      <div className={styles.overlay} />
                      <div className={styles.casesContent}>
                        {getSectionContent("리스크") && (
                          <div className={styles.contentText}>
                            <Viewer initialValue={getSectionContent("리스크")} />
                          </div>
                        )}
                      </div>
                    </ContentBox>
                  </div>
                </section>
              )}
              {/* Check Point Section */}
              {data.majorCategory.sections.includes("체크포인트") && (
                <section
                  id="checkpoint"
                  ref={checkpointRef}
                  className={styles.section}
                >
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Check Point</h2>
                  </div>
                  <div className={styles.sectionContent}>
                    <h3 className={styles.subSectionTitle}>체크포인트</h3>
                    <ContentBox>
                      <div className={styles.overlay} />
                      <div className={styles.checkPointContent}>
                        {getSectionContent("체크포인트") && (
                          <div className={styles.contentText}>
                            <Viewer
                              initialValue={getSectionContent("체크포인트")}
                            />
                          </div>
                        )}
                      </div>
                    </ContentBox>
                  </div>
                </section>
              )}

              {/* Execution Strategy Section */}
              {data.majorCategory.sections.includes("함께 실행방안") && (
                <section
                  id="execution"
                  ref={executionRef}
                  className={styles.section}
                >
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Execution Strategy</h2>
                  </div>
                  <div className={styles.sectionContent}>
                    <h3 className={styles.subSectionTitle}>함께 실행방안</h3>
                    <ContentBox>
                      <div className={styles.overlay} />
                      <div className={styles.executionContent}>
                        {getSectionContent("함께 실행방안") && (
                          <div className={styles.contentText}>
                            <Viewer
                              initialValue={getSectionContent("함께 실행방안")}
                            />
                          </div>
                        )}
                      </div>
                    </ContentBox>
                  </div>
                </section>
              )}

              {/* Cases Section */}
              {data.majorCategory.sections.includes("케이스") && (
                <section id="cases" ref={casesRef} className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Cases</h2>
                  </div>
                  <div className={styles.sectionContent}>
                    <h3 className={styles.subSectionTitle}>케이스</h3>
                    <ContentBox>
                      <div className={styles.overlay} />
                      <div className={styles.casesContent}>
                        {getSectionContent("케이스") && (
                          <div className={styles.contentText}>
                            <Viewer initialValue={getSectionContent("케이스")} />
                          </div>
                        )}
                      </div>
                    </ContentBox>
                  </div>
                </section>
              )}
            </div>

            {/* Left Sidebar Navigation */}
            <div className={styles.sidebarNav}>
              {data.majorCategory.sections.includes("발생원인") && (
                <a
                  href="#rootcause"
                  className={`${styles.navItem} ${activeSection === "rootcause" ? styles.active : ""
                    }`}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("rootcause")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <span className={styles.navText}>발생원인</span>
                </a>
              )}
              {data.majorCategory.sections.includes("리스크") && (
                <a
                  href="#risk"
                  className={`${styles.navItem} ${activeSection === "risk" ? styles.active : ""
                    }`}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("risk")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <span className={styles.navText}>리스크</span>
                </a>
              )}
              {data.majorCategory.sections.includes("체크포인트") && (
                <a
                  href="#checkpoint"
                  className={`${styles.navItem} ${activeSection === "checkpoint" ? styles.active : ""
                    }`}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("checkpoint")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <span className={styles.navText}>체크포인트</span>
                </a>
              )}
              {data.majorCategory.sections.includes("함께 실행방안") && (
                <a
                  href="#execution"
                  className={`${styles.navItem} ${activeSection === "execution" ? styles.active : ""
                    }`}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("execution")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <span className={styles.navText}>함께 실행방안</span>
                </a>
              )}
              {data.majorCategory.sections.includes("케이스") && (
                <a
                  href="#cases"
                  className={`${styles.navItem} ${activeSection === "cases" ? styles.active : ""
                    }`}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("cases")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <span className={styles.navText}>케이스</span>
                </a>
              )}
            </div>
          </div>

          <div className={styles.floatingButtons}>
            <FloatingButton
              variant="consult"
              label="상담 신청하기"
              onClick={handleConsultClick}
            />
          </div>
        </div>
        <div className={styles.infoWrapper}>
          <div className="container">
            {experts.length > 0 && (
              <div className={styles.fullWidthSection}>
                <div className={styles.fullWidthContainer}>
                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <div className={styles.sectionHeaderContent}>
                        <div>
                          <h2 className={styles.sectionTitle}>Related Experts</h2>
                          <p className={styles.sectionSubtitle}>
                            <span /> 관련 업무 세무사
                          </p>
                        </div>
                        <div className={styles.navigationButtons}>
                          <button
                            className={styles.navButton}
                            onClick={handleExpertPrev}
                            id="experts-prev-btn"
                            disabled={expertsButtonsDisabled.prev}
                          >
                            <Icon
                              type="arrow-left2-green"
                              className={styles.arrow}
                              size={20}
                            />
                          </button>
                          <button
                            className={styles.navButton}
                            onClick={handleExpertNext}
                            id="experts-next-btn"
                            disabled={expertsButtonsDisabled.next}
                          >
                            <Icon type="arrow-right2-green" size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className={styles.expertsContent}>
                      <Swiper
                        modules={[Navigation]}
                        grabCursor={true}
                        allowTouchMove={true}
                        navigation={{
                          prevEl: "#experts-prev-btn",
                          nextEl: "#experts-next-btn",
                        }}
                        breakpoints={{
                          0: {
                            slidesPerView: 1.55,
                            spaceBetween: 16,
                          },
                          576: {
                            slidesPerView: 2,
                            spaceBetween: 18,
                          },
                          768: {
                            slidesPerView: 3,
                            spaceBetween: 20,
                          },
                          1024: {
                            slidesPerView: 4,
                            spaceBetween: 24,
                          },
                        }}
                        onSwiper={(swiper) => {
                          expertsSwiperRef.current = swiper;
                          updateExpertsButtons();
                        }}
                        onSlideChange={() => {
                          updateExpertsButtons();
                        }}
                        className={styles.expertsSwiper}
                      >
                        {experts.map((expert, index) => (
                          <SwiperSlide key={expert.id || index}>
                            <div
                              className={styles.expertCard}
                              onClick={() => router.push(`/experts/${expert.id}`)}
                            >
                              <div className={styles.expertImage}>
                                <img
                                  src={
                                    expert.mainPhoto?.url ||
                                    expert.imageUrl ||
                                    "/images/common/default-avatar.png"
                                  }
                                  alt={expert.name}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "/images/common/default-avatar.png";
                                  }}
                                />
                              </div>

                              <div className={styles.expertInfo}>
                                <div className={styles.expertNameRow}>
                                  <p className={styles.expertName}>
                                    {expert.name}
                                  </p>
                                  <p className={styles.expertPositionLabel}>
                                    {expert.position || "세무사"}
                                  </p>
                                </div>

                                <div className={styles.expertContact}>
                                  {(expert.tel || expert.phoneNumber) && (
                                    <div className={styles.expertContactItem}>
                                      <span className={styles.expertContactLabel}>
                                        TEL
                                      </span>
                                      <span className={styles.expertContactValue}>
                                        {expert.tel || expert.phoneNumber}
                                      </span>
                                    </div>
                                  )}

                                  {expert.email && (
                                    <div className={styles.expertContactItem}>
                                      <span className={styles.expertContactLabel}>
                                        EMAIL
                                      </span>
                                      <span className={styles.expertContactValue}>
                                        {expert.email}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {expert.tags && expert.tags.length > 0 && (
                                  <div className={styles.expertTags}>
                                    {" "}
                                    {expert.tags.map((tag, tagIndex) => {
                                      let indicator = "";
                                      if (tagIndex === 0) {
                                        indicator = " ■■■";
                                      } else if (tagIndex === 1) {
                                        indicator = " ■■□";
                                      } else if (tagIndex === 2) {
                                        indicator = " ■□□";
                                      }
                                      return (
                                        <span
                                          key={tagIndex}
                                          className={styles.expertTag}
                                        >
                                          {" "}
                                          {tag} {indicator}{" "}
                                        </span>
                                      );
                                    })}{" "}
                                  </div>
                                )}
                              </div>
                            </div>
                          </SwiperSlide>
                        ))}
                      </Swiper>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {data.youtubeUrls && data.youtubeUrls.length > 0 && (
              <div className={styles.fullWidthSection}>
                <div className={styles.fullWidthContainer}>
                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <div className={styles.sectionHeaderContent}>
                        <div>
                          <h2 className={styles.sectionTitle}>Youtube</h2>
                          <p className={styles.sectionSubtitle}>
                            <span></span> 함께공식 유튜브
                          </p>
                        </div>
                        <div className={styles.navigationButtons}>
                          <button
                            className={styles.navButton}
                            onClick={handleYoutubePrev}
                            id="youtube-prev-btn"
                            disabled={youtubeButtonsDisabled.prev}
                          >
                            <Icon type="arrow-left2-green" size={20} />
                          </button>
                          <button
                            className={styles.navButton}
                            onClick={handleYoutubeNext}
                            id="youtube-next-btn"
                            disabled={youtubeButtonsDisabled.next}
                          >
                            <Icon type="arrow-right2-green" size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className={styles.youtubeContent}>
                      <Swiper
                        modules={[Navigation]}
                        grabCursor={true}
                        allowTouchMove={true}
                        navigation={{
                          prevEl: "#youtube-prev-btn",
                          nextEl: "#youtube-next-btn",
                        }}
                        breakpoints={{
                          0: {
                            slidesPerView: 1.3,
                            spaceBetween: 16,
                          },
                          576: {
                            slidesPerView: 2,
                            spaceBetween: 18,
                          },
                          768: {
                            slidesPerView: 3,
                            spaceBetween: 20,
                          },
                          1024: {
                            slidesPerView: 4,
                            spaceBetween: 24,
                          },
                        }}
                        onSwiper={(swiper) => {
                          youtubeSwiperRef.current = swiper;
                          updateYoutubeButtons();
                        }}
                        onSlideChange={() => {
                          updateYoutubeButtons();
                        }}
                        className={styles.youtubeSwiper}
                      >
                        {data.youtubeUrls.map((url, index) => {
                          const videoId = extractYouTubeId(url);
                          if (!videoId) return null;
                          return (
                            <SwiperSlide key={index}>
                              <div
                                className={styles.youtubeCard}
                                onClick={() => window.open(url, "_blank")}
                              >
                                <div className={styles.youtubeThumbnail}>
                                  <img
                                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                                    alt={`YouTube video ${index + 1}`}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                    }}
                                  />
                                </div>
                                <div className={styles.youtubeInfo}>
                                  <p className={styles.youtubeChannel}>
                                    {youtubeVideos[url]?.author_name ||
                                      "세무법인함께 TV"}
                                  </p>
                                  <p className={styles.youtubeTitle}>
                                    {youtubeVideos[url]?.title ||
                                      "세무 관련 정보를 제공하는 영상입니다"}
                                  </p>
                                </div>
                              </div>
                            </SwiperSlide>
                          );
                        })}
                      </Swiper>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {relatedNews.length > 0 && (
              <div className={styles.fullWidthSection}>
                <div className={styles.fullWidthContainer}>
                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <div className={styles.sectionHeaderContent}>
                        <div>
                          <h2 className={styles.sectionTitle}>Related News</h2>
                          <p className={styles.sectionSubtitle}>
                            <span></span> 관련 소식
                          </p>
                        </div>
                        <div className={styles.navigationButtons}>
                          <button
                            className={styles.navButton}
                            onClick={handleNewsPrev}
                            id="news-prev-btn"
                            disabled={newsButtonsDisabled.prev}
                          >
                            <Icon type="arrow-left2-green" size={20} />
                          </button>
                          <button
                            className={styles.navButton}
                            onClick={handleNewsNext}
                            id="news-next-btn"
                            disabled={newsButtonsDisabled.next}
                          >
                            <Icon type="arrow-right2-green" size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className={styles.newsContent}>
                      <Swiper
                        modules={[Navigation]}
                        grabCursor={true}
                        allowTouchMove={true}
                        navigation={{
                          prevEl: "#news-prev-btn",
                          nextEl: "#news-next-btn",
                        }}
                        breakpoints={{
                          0: {
                            slidesPerView: 1.3,
                            spaceBetween: 16,
                          },
                          576: {
                            slidesPerView: 2,
                            spaceBetween: 18,
                          },
                          768: {
                            slidesPerView: 3,
                            spaceBetween: 20,
                          },
                          1024: {
                            slidesPerView: 4,
                            spaceBetween: 24,
                          },
                        }}
                        onSwiper={(swiper) => {
                          newsSwiperRef.current = swiper;
                          updateNewsButtons();
                        }}
                        onSlideChange={() => {
                          updateNewsButtons();
                        }}
                        className={styles.newsSwiper}
                      >
                        {relatedNews.map((news) => (
                          <SwiperSlide key={news.id}>
                            <div
                              className={styles.newsCard}
                              onClick={() => router.push(`/insights/${news.id}`)}
                            >
                              {news.thumbnail && (
                                <div className={styles.newsThumbnail}>
                                  <img
                                    src={news.thumbnail.url}
                                    alt={news.title}
                                  />
                                </div>
                              )}
                              <div className={styles.newsInfo}>
                                <div className={styles.newsHeader}>
                                  {  news.subMinorCategory && (
                                    <p className={styles.newsCategory}>
                                      {news.subMinorCategory?.name}
                                    </p>
                                  )}
                                  <h3 className={styles.newsTitle}>
                                    {news.title}
                                  </h3>
                                </div>
                                <div className={styles.newsMeta}>
                                  {news.authorName && (
                                    <>
                                      <span className={styles.newsAuthor}>
                                        {news.authorName}
                                      </span>
                                      <span className={styles.newsSeparator}>
                                      </span>
                                    </>
                                  )}
                                  {news.createdAt && (
                                    <span className={styles.newsDate}>
                                      {formatDate(news.createdAt)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </SwiperSlide>
                        ))}
                      </Swiper>
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
        <ContactUs categoryId={data?.minorCategory?.id} />

        <Footer />
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<
  BusinessAreaDetailPageProps
> = async (context) => {
  const { id } = context.params!;

  try {
    const response = await get<BusinessAreaDetail>(
      `${API_ENDPOINTS.BUSINESS_AREAS}/${id}`,
    );

    if (response.data) {
      return {
        props: {
          data: response.data,
          error: null,
        },
      };
    } else {
      return {
        props: {
          data: null,
          error: response.error || "업무 분야를 찾을 수 없습니다.",
        },
      };
    }
  } catch (err) {
    console.error("Failed to fetch business area detail:", err);
    return {
      props: {
        data: null,
        error: "데이터를 불러오는 중 오류가 발생했습니다.",
      },
    };
  }
};

export default BusinessAreaDetailPage;
