import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
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
import ContentBox from "@/components/common/ContentBox";
import Icon from "@/components/common/Icon";
import SEO from "@/components/common/SEO";
import { get as getClient } from "@/lib/api";
import { get } from "@/lib/api-server";
import { API_ENDPOINTS } from "@/config/api";
import styles from "./detail.module.scss";

// Toast UI Viewer는 클라이언트 사이드에서만 로드
const Viewer = dynamic(
  () => import("@toast-ui/react-editor").then((mod) => mod.Viewer),
  { ssr: false },
);

interface MemberCategory {
  categoryId: number;
  categoryName: string;
  displayOrder: number;
}

export interface MemberDetail {
  id: number;
  name: string;
  mainPhoto?: {
    id: number;
    url: string;
  };
  subPhoto?: {
    id: number;
    url: string;
  };
  categories?: MemberCategory[];
  affiliation: string;
  phoneNumber: string;
  email: string;
  vcard?: {
    id: number;
    url: string;
  };
  pdf?: {
    id: number;
    url: string;
  };
  oneLineIntro: string;
  expertIntro: string;
  mainCases: string;
  education: string;
  careerAndAwards: string;
  booksActivitiesOther: string;
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
  categories?: MemberCategory[];
  tags?: string[];
}

interface SubMinorCategory {
  id: number;
  name: string;
}

interface InsightItem {
  id: number;
  title: string;
  content: string;
  thumbnail?: {
    url: string;
  };
  createdAt?: string;
  category?: string | { id: number; name: string; type: string };
  authorName?: string;
  subMinorCategory?: SubMinorCategory;
}



interface InsightResponse {
  items: InsightItem[];
  total: number;
}

interface ExpertDetailPageProps {
  data: MemberDetail | null;
  error: string | null;
}

const ExpertDetailPage: React.FC<ExpertDetailPageProps> = ({
  data: initialData,
  error: initialError,
}) => {
  const router = useRouter();
  const { id } = router.query;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [data, setData] = useState<MemberDetail | null>(initialData);
  const [error, setError] = useState<string | null>(initialError);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [relatedNews, setRelatedNews] = useState<InsightItem[]>([]);
  const expertsSwiperRef = useRef<SwiperType | null>(null);
  const newsSwiperRef = useRef<SwiperType | null>(null);
  const [expertsButtonsDisabled, setExpertsButtonsDisabled] = useState({
    prev: true,
    next: false,
  });
  const [newsButtonsDisabled, setNewsButtonsDisabled] = useState({
    prev: true,
    next: false,
  });
  const [imageError, setImageError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Keep local state in sync when navigating to another expert on the same page
  useEffect(() => {
    setData(initialData);
    setError(initialError);
  }, [initialData, initialError]);

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 767);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Update button states helper
  const updateExpertsButtons = useCallback(() => {
    if (expertsSwiperRef.current) {
      setExpertsButtonsDisabled({
        prev: expertsSwiperRef.current.isBeginning,
        next: expertsSwiperRef.current.isEnd,
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

  // Fetch related content client-side (secondary data)
  useEffect(() => {
    if (id && data) {
      fetchRelatedNews();
    }
  }, [id, data]);

  useEffect(() => {
    if (
      data?.categories &&
      data.categories.length > 0 &&
      typeof id === "string"
    ) {
      fetchRelatedExperts();
    }
  }, [data?.categories, id]);

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

  const fetchRelatedNews = async () => {
    try {
      const userParams = buildUserFilterParams();

      const response = await getClient<InsightResponse>(
        `${API_ENDPOINTS.INSIGHTS}?page=1&limit=100${userParams}`,
      );

      if (response.data) {
        console.log("response.data", response.data);
        // Filter news to only show items where authorName matches current expert's name
        const allNews = response.data.items || [];
        const filteredNews = allNews.filter(
          (news) => news.authorName === data?.name
        );
        setRelatedNews(filteredNews);
        console.log("filteredNews", filteredNews);
      }
    } catch (err) {
      console.error("관련 소식을 불러오는 중 오류:", err);
    }
  };

  const fetchRelatedExperts = async () => {
    try {
      if (!data?.categories || data.categories.length === 0) return;

      // Get first category ID (categories are already sorted by displayOrder from backend)
      const firstCategory = data.categories[0];
      const categoryId = firstCategory.categoryId;

      if (!categoryId) return;

      const url = `${API_ENDPOINTS.MEMBERS}?page=1&limit=20&categoryId=${categoryId}`;
      const membersResponse = await getClient<
        Expert[] | { items: Expert[]; data: Expert[] }
      >(url);

      if (membersResponse.data) {
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

        // Filter out current expert and transform data
        // Use categories from backend (already sorted by displayOrder)
        expertsList = expertsList
          .filter((expert) => expert.id !== data?.id)
          .map((expert) => ({
            ...expert,
            tags: expert.categories
              ? expert.categories.map((cat) => cat.categoryName)
              : expert.tags || [],
            tel: expert.tel || expert.phoneNumber,
            position: expert.position || expert.affiliation || "세무사",
          }));

        setExperts(expertsList);
      }
    } catch (err) {
      console.error("관련 세무사를 불러오는 중 오류:", err);
      setExperts([]);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}.${String(date.getDate()).padStart(2, "0")}`;
  };

  const handleTopClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConsultClick = () => {
    if (data?.id) {
      router.push(`/consultation/apply?expertId=${data.id}`);
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

  const handleNewsPrev = () => {
    newsSwiperRef.current?.slidePrev();
  };

  const handleNewsNext = () => {
    newsSwiperRef.current?.slideNext();
  };

  const handleDownloadVCard = () => {
    if (data?.vcard?.url) {
      window.open(data.vcard.url, "_blank");
    }
  };

  const handleDownloadPDF = () => {
    if (data?.pdf?.url) {
      window.open(data.pdf.url, "_blank");
    }
  };
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleShare = async () => {
    if (typeof window === "undefined") return;

    const url = window.location.href;
    const title = `${data?.name || "세무사"} - 세무법인 함께`;
    const text = `${data?.name || "세무사"} 세무사 프로필`;

    // 1. Mobile Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        return;
      } catch (err) {
        console.warn("Share canceled or failed:", err);
      }
    }

    // 2. Clipboard fallback
    try {
      await navigator.clipboard.writeText(url);
      alert("링크가 클립보드에 복사되었습니다.");
    } catch (err) {
      alert("공유를 지원하지 않는 브라우저입니다.");
      console.error("Clipboard error:", err);
    }
  };


  if (error || !data) {
    return (
      <div className={styles.page}>
        <Header variant="transparent" onMenuClick={() => setIsMenuOpen(true)} />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className={styles.container}>
          <div className={styles.error}>
            <p>{error || "전문가를 찾을 수 없습니다."}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <SEO pageType="menu" menuName="전문가 소개" />
        <Header variant="white" onMenuClick={() => setIsMenuOpen(true)} isFixed={true} />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div style={{ padding: "100px 20px", textAlign: "center" }}>
          {error || "전문가 정보를 찾을 수 없습니다."}
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <SEO
        pageType="content"
        menuName="전문가 소개"
        postTitle={`${data.name} 세무사`}
        description={data.oneLineIntro || `${data.name} 세무사 - ${data.affiliation}`}
        ogImage={data.mainPhoto?.url}
      />
      <div className={styles.page}>
        <Header
          variant="transparent"
          onMenuClick={() => setIsMenuOpen(true)}
          isFixed={true}
        />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className="container">
          {/* Hero Section - Full Width */}
          <div className={styles.heroSection}>
            <div className="container" style={{ height: "100%" }}>
              <div className={styles.heroContainer}>
                <div className={styles.heroImageWrapper}>
                  <div className={styles.logoWatermark}>
                    <img src="/images/common/expertVector.png" alt="" />
                  </div>
                  {data.mainPhoto?.url && !imageError ? (
                    <img
                      src={data.mainPhoto.url}
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
                </div>
                <div className={styles.heroInfo}>
                  <h2 className={styles.heroTitle}>Tax Accountant</h2>
                  <div className={styles.heroNameRow}>
                    <h1 className={styles.heroName}>{data.name}</h1>
                    <span className={styles.heroPosition}>세무사</span>
                  </div>
                  {!isMobile && data.categories && data.categories.length > 0 && (
                    <div
                      className={`${styles.sidebarWorkAreas} ${styles.mainWorkAreas}`}
                    >
                      <div className={styles.sidebarWorkAreasTags}>
                        {data.categories.map((cat) => (
                          <span
                            key={cat.categoryId}
                            className={styles.sidebarWorkAreaTag}
                          >
                            {cat.categoryName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className={styles.heroContact}>
                    {data.affiliation && (
                      <div className={styles.heroContactItem}>
                        <div className={styles.heroContactIconWrapper}>
                          <Icon type="location" />
                        </div>

                        <span className={styles.heroContactLabel}>
                          {data.affiliation}
                        </span>
                      </div>
                    )}
                    {data.phoneNumber && (
                      <div className={styles.heroContactItem}>
                        <div className={styles.heroContactIconWrapper}>
                          <Icon type="call" />
                        </div>
                        <span className={styles.heroContactLabel}>
                          {data.phoneNumber}
                        </span>
                      </div>
                    )}
                    {data.email && (
                      <div className={styles.heroContactItem}>
                        <div className={styles.heroContactIconWrapper}>
                          <Icon type="mail" />
                        </div>
                        <span className={styles.heroContactLabel}>
                          {data.email}
                        </span>
                      </div>
                    )}
                  </div>
                  {isMobile && data.categories && data.categories.length > 0 && (
                    <div className={styles.sidebarWorkAreas}>
                      <h2>주요 업무 분야</h2>
                      <div className={styles.sidebarWorkAreasTags}>
                        {data.categories.map((cat) => (
                          <span
                            key={cat.categoryId}
                            className={styles.sidebarWorkAreaTag}
                          >
                            {cat.categoryName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 모바일 인용구 - 아이콘 아래 */}
                </div>
              </div>
            </div>
            <div className={styles.heroActionButtons}>
              {data.vcard?.url && (
                <button
                  className={styles.heroActionButton}
                  onClick={handleDownloadVCard}
                  aria-label="연락처 저장"
                >
                  <img src="/images/common/icons/vcf.svg" alt="" />
                  V-card
                </button>
              )}
              {data.pdf?.url && (
                <button
                  className={styles.heroActionButton}
                  onClick={handleDownloadPDF}
                  aria-label="PDF 다운로드"
                >
                  <img src="/images/common/icons/pdf.svg" alt="" />
                  PDF
                </button>
              )}
              <button
                className={styles.heroActionButton}
                onClick={handlePrint}
                aria-label="이력서 보기"
              >
                <img src="/images/common/icons/print.svg" alt="" />
              </button>
              <button
                className={styles.heroActionButton}
                onClick={handleShare}
                aria-label="공유하기"
              >
                <img src="/images/common/icons/share.svg" alt="" />
              </button>
            </div>
          </div>

          {/* About the Expert Section with Sidebar */}
          <div className={styles.aboutSectionWrapper}>
            <div className={styles.aboutContainer}>
              {/* About the Expert Section - Full Width */}

              {/* Sidebar and Main Content - Two Columns */}
              <div className={styles.aboutLayout}>
                {/* Sidebar - 모바일에서는 숨김 (Hero에서 표시) */}
                {!isMobile && (
                  <div className={styles.sidebar}>
                    <div className={styles.sidebarCard}>
                      {data.subPhoto?.url && (
                        <div className={styles.sidebarImage}>
                          <img src={data.subPhoto.url} alt={data.name} />
                        </div>
                      )}
                      <div className={styles.sidebarInfo}>
                        <div className={styles.sidebarNameRow}>
                          <h3 className={styles.sidebarName}>{data.name}</h3>
                          <span className={styles.sidebarPosition}>세무사</span>
                        </div>
                        <div className={styles.sidebarContact}>
                          {data.affiliation && (
                            <div className={styles.sidebarContactItem}>
                              <div className={styles.heroContactIconWrapper}>
                                <Icon type="location" />
                              </div>
                              <span>{data.affiliation}</span>
                            </div>
                          )}
                          {data.phoneNumber && (
                            <div className={styles.sidebarContactItem}>
                              <div className={styles.heroContactIconWrapper}>
                                <Icon type="call" />
                              </div>
                              <span>{data.phoneNumber}</span>
                            </div>
                          )}
                          {data.email && (
                            <div className={styles.sidebarContactItem}>
                              <div className={styles.heroContactIconWrapper}>
                                <Icon type="mail" />
                              </div>
                              <span>{data.email}</span>
                            </div>
                          )}
                        </div>
                        {data.categories && data.categories.length > 0 && (
                          <div className={styles.sidebarWorkAreas}>
                            <div className={styles.sidebarWorkAreasTags}>
                              {data.categories.map((cat) => (
                                <span
                                  key={cat.categoryId}
                                  className={styles.sidebarWorkAreaTag}
                                >
                                  {cat.categoryName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          className={styles.getConsult}
                          onClick={handleConsultClick}
                        >
                          이 전문가에게 바로 상담신청
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Main Content */}
                <div className={styles.mainContent}>
                  {data.oneLineIntro && (
                    <div className={styles.heroQuote}>
                      <div className={styles.heroQuoteContent}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="40"
                          height="40"
                          viewBox="0 0 40 40"
                          fill="none"
                        >
                          <path
                            d="M17.6724 29.2026C17.6724 31.4095 16.9828 33.0647 15.6034 34.444C14.2241 35.8233 12.569 36.375 10.6379 36.375C8.15517 36.375 6.22414 35.4095 4.7069 33.4784C3.18965 31.5474 2.5 29.3405 2.5 26.5819C2.5 21.8922 3.60345 17.6164 6.08621 13.6164C8.56897 9.61638 11.7414 6.58189 15.6034 4.375L17.2586 6.58189C14.9138 8.09914 12.8448 10.1681 11.1897 12.6509C9.53448 15.2716 8.56897 17.7543 8.43103 20.2371C7.87931 22.1681 8.2931 22.9957 9.67241 22.7198C10.0862 22.5819 10.5 22.444 10.9138 22.444H12.1552C13.6724 22.7198 14.9138 23.5474 16.0172 24.6509C17.1207 25.8922 17.6724 27.4095 17.6724 29.2026ZM38.3621 29.2026C38.3621 31.4095 37.6724 33.0647 36.2931 34.444C34.9138 35.8233 33.2586 36.375 31.3276 36.375C28.8448 36.375 26.9138 35.4095 25.3966 33.4784C23.7414 31.5474 23.0517 29.3405 23.0517 26.5819C23.0517 22.0302 24.2931 17.7543 26.7759 13.6164C29.2586 9.61638 32.431 6.58189 36.2931 4.375L37.9483 6.58189C35.6035 8.09914 33.5345 10.1681 31.8793 12.6509C30.2241 15.2716 29.2586 17.7543 28.9828 20.2371C28.569 22.0302 28.9828 22.8578 30.3621 22.7198C30.6379 22.5819 31.0517 22.444 31.4655 22.444H32.8448C34.3621 22.7198 35.6035 23.5474 36.7069 24.6509C37.8103 25.8922 38.3621 27.4095 38.3621 29.2026Z"
                            fill="#E4E4E4"
                          />
                        </svg>
                        <p className={styles.heroQuoteText}>
                          {data.oneLineIntro}
                        </p>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="36"
                          height="32"
                          viewBox="0 0 36 32"
                          fill="none"
                        >
                          <path
                            d="M20.6899 7.17241C20.6899 4.96552 21.3795 3.31034 22.7589 1.93103C24.1382 0.551724 25.7933 -8.80257e-07 27.7244 -7.11441e-07C30.2071 -4.94391e-07 32.1382 0.965507 33.6554 2.89655C35.1727 4.82759 35.8623 7.03448 35.8623 9.7931C35.8623 14.4828 34.7589 18.7586 32.2761 22.7586C29.7933 26.7586 26.6209 29.7931 22.7589 32L21.1037 29.7931C23.4485 28.2759 25.5175 26.2069 27.1726 23.7241C28.8278 21.1034 29.7933 18.6207 29.9313 16.1379C30.483 14.2069 30.0692 13.3793 28.6899 13.6552C28.2761 13.7931 27.8623 13.931 27.4485 13.931L26.2071 13.931C24.6899 13.6552 23.4485 12.8276 22.3451 11.7241C21.2416 10.4828 20.6899 8.96552 20.6899 7.17241ZM0.000231052 7.17241C0.000231245 4.96551 0.689883 3.31034 2.0692 1.93103C3.44851 0.551723 5.10368 -2.689e-06 7.03471 -2.52019e-06C9.51747 -2.30314e-06 11.4485 0.965505 12.9658 2.89655C14.6209 4.82758 15.3106 7.03448 15.3106 9.7931C15.3106 14.3448 14.0692 18.6207 11.5864 22.7586C9.10368 26.7586 5.93126 29.7931 2.06919 32L0.414025 29.7931C2.75885 28.2759 4.82781 26.2069 6.48299 23.7241C8.13816 21.1034 9.10368 18.6207 9.37954 16.1379C9.79333 14.3448 9.37954 13.5172 8.00023 13.6552C7.72437 13.7931 7.31057 13.931 6.89678 13.931L5.51747 13.931C4.00023 13.6552 2.75885 12.8276 1.6554 11.7241C0.551954 10.4827 0.000230896 8.96551 0.000231052 7.17241Z"
                            fill="#E4E4E4"
                          />
                        </svg>
                      </div>
                    </div>
                  )}

                  {data.expertIntro && (
                    <section className={styles.aboutSection}>
                      <div className={styles.aboutHeader}>
                        <h2 className={styles.aboutTitle}>About the Expert</h2>
                      </div>
                      <div className={styles.aboutContent}>
                        <div className={styles.aboutFieldTitle}>
                          <span></span> 전문가 소개
                        </div>
                        {/* <div className={styles.aboutDivider} /> */}
                        <div className={styles.aboutContentInner}>
                          <Viewer initialValue={data.expertIntro} />
                        </div>
                      </div>
                    </section>
                  )}
                  {/* Main Cases Section */}
                  {data.mainCases && (
                    <section className={styles.sectionWrapper}>
                      <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>주요 처리 사례</h2>
                      </div>
                      <div className={styles.sectionContent}>
                        <ContentBox>
                          <div className={styles.listContent}>
                            <Viewer initialValue={data.mainCases} />
                          </div>
                        </ContentBox>
                      </div>
                    </section>
                  )}

                  {/* Education Section */}
                  {data.education && (
                    <section className={styles.sectionWrapper}>
                      <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>학력</h2>
                      </div>
                      <div className={styles.sectionContent}>
                        <ContentBox>
                          <div className={styles.listContent}>
                            <Viewer initialValue={data.education} />
                          </div>
                        </ContentBox>
                      </div>
                    </section>
                  )}

                  {/* Career and Awards Section */}
                  {data.careerAndAwards && (
                    <section className={styles.sectionWrapper}>
                      <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                          경력 및 수상 실적
                        </h2>
                      </div>
                      <div className={styles.sectionContent}>
                        <ContentBox>
                          <div className={styles.listContent}>
                            <Viewer initialValue={data.careerAndAwards} />
                          </div>
                        </ContentBox>
                      </div>
                    </section>
                  )}

                  {/* Books, Activities, Other Section */}
                  {data.booksActivitiesOther && (
                    <section className={styles.sectionWrapper}>
                      <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>저서·활동·기타</h2>
                      </div>
                      <div className={styles.sectionContent}>
                        <ContentBox>
                          <div className={styles.listContent}>
                            <Viewer initialValue={data.booksActivitiesOther} />
                          </div>
                        </ContentBox>
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
          {isMobile && (
            <div className={styles.getConsultWrapper}>
              <button
                className={styles.getConsult}
                onClick={handleConsultClick}
              >
                이 전문가에게 바로 상담신청
              </button>
            </div>
          )}

          {/* Related Experts Section */}
          {experts.length > 0 && (
            <div className={styles.fullWidthSection}>
              <div className="container">
                <div className={styles.fullWidthContainer}>
                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <div className={styles.sectionHeaderContent}>
                        <div>
                          <h2 className={styles.sectionTitleEn}>
                            Related Experts
                          </h2>
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
                        preventClicks={false}
                        preventClicksPropagation={false}
                        noSwiping
                        noSwipingClass="no-swiping"
                        navigation={{
                          prevEl: "#experts-prev-btn",
                          nextEl: "#experts-next-btn",
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
                          expertsSwiperRef.current = swiper;
                          updateExpertsButtons();
                        }}
                        onSlideChange={() => {
                          updateExpertsButtons();
                        }}
                        className={styles.expertsSwiper}
                      >
                        {experts.map((expert, index) => (
                          <SwiperSlide key={expert.id || index} >
                            <div
                              className={styles.expertCard}
                              onClick={(e) => {
                                console.log("expert.id", expert.id);
                                if (expert.id) {
                                  router.push(`/experts/${expert.id}`);
                                }
                              }}
                              style={{ cursor: 'pointer' }}
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
                                      <span
                                        className={styles.expertContactLabel}
                                      >
                                        TEL
                                      </span>
                                      <span
                                        className={styles.expertContactValue}
                                      >
                                        {expert.tel || expert.phoneNumber}
                                      </span>
                                    </div>
                                  )}

                                  {expert.email && (
                                    <div className={styles.expertContactItem}>
                                      <span
                                        className={styles.expertContactLabel}
                                      >
                                        EMAIL
                                      </span>
                                      <span
                                        className={styles.expertContactValue}
                                      >
                                        {expert.email}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {expert.tags && expert.tags.length > 0 && (
                                  <div className={styles.expertTags}>
                                    {expert.tags.map((tag, tagIndex) => (
                                      <span
                                        key={tagIndex}
                                        className={styles.expertTag}
                                      >
                                        {tag}
                                      </span>
                                    ))}
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
            </div>
          )}

          {/* Related News Section */}
          {relatedNews.length > 0 && (
            <div className={styles.fullWidthSection}>
              <div className="container">
                <div className={styles.fullWidthContainer}>
                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <div className={styles.sectionHeaderContent}>
                        <div>
                          <h2 className={styles.sectionTitleEn}>
                            Related News
                          </h2>
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
                        preventClicks={false}
                        preventClicksPropagation={false}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                if (news.id) {
                                  router.push(`/insights/${news.id}`);
                                }
                              }}
                              style={{ cursor: 'pointer' }}
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
                                  {news.category && (
                                    <p className={styles.newsCategory}>
                                      {
                                          news?.subMinorCategory
                                          ? news.subMinorCategory.name
                                          : "카테고리"}
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
                                      <span
                                        className={styles.newsSeparator}
                                      ></span>
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
            </div>
          )}
        </div>

        <Footer />

        {/* Floating Buttons */}
        <div className={styles.floatingButtons}>
          {!isMobile && (
            <FloatingButton
              variant="consult"
              label="상담 신청하기"
              onClick={handleConsultClick}
            />
          )}
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<
  ExpertDetailPageProps
> = async (context) => {
  const { id } = context.params!;

  try {
    const response = await get<MemberDetail>(`${API_ENDPOINTS.MEMBERS}/${id}`);

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
          error: response.error || "전문가를 찾을 수 없습니다.",
        },
      };
    }
  } catch (err) {
    console.error("Failed to fetch expert detail:", err);
    return {
      props: {
        data: null,
        error: "전문가 정보를 불러오는 중 오류가 발생했습니다.",
      },
    };
  }
};

export default ExpertDetailPage;
