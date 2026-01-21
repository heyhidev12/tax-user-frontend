import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Header from '@/components/common/Header';
import Menu from '@/components/Menu';
import Footer from '@/components/Footer';
import PageHeader from '@/components/common/PageHeader';
import FloatingButton from '@/components/common/FloatingButton';
import Pagination from '@/components/common/Pagination';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import { get as getClient } from '@/lib/api';
import { get } from '@/lib/api-server';
import { API_ENDPOINTS } from '@/config/api';
import type { EducationItem, EducationListResponse, EducationType } from '@/types/education';
import styles from './education.module.scss';

interface UserProfile {
  id: number;
  loginId: string;
  name: string;
  memberType?: string;
}

interface EducationPageProps {
  initialEducationList: EducationItem[];
  initialNewEducationList: EducationItem[];
  initialTotalPages: number;
  error: string | null;
}

const EducationPage: React.FC<EducationPageProps> = ({
  initialEducationList,
  initialNewEducationList,
  initialTotalPages,
  error: initialError,
}) => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Query-based tab management (like History page)
  // Currently only 'education' tab exists, but keeping query-based structure for consistency
  // const tabFromQuery = router.query.tab as string;
  // const validTabs = ['education'];

  // Ensure URL has correct tab parameter if missing or invalid
  // useEffect(() => {
  //   if (!tabFromQuery || !validTabs.includes(tabFromQuery)) {
  //     router.replace(
  //       {
  //         pathname: router.pathname,
  //         query: { ...router.query, tab: 'education' },
  //       },
  //       undefined,
  //       { shallow: true }
  //     );
  //   }
  // }, [tabFromQuery, router]);

  const [educationList, setEducationList] = useState<EducationItem[]>(initialEducationList);
  const [newEducationList, setNewEducationList] = useState<EducationItem[]>(initialNewEducationList);
  const [error, setError] = useState<string | null>(initialError);
  const [selectedType, setSelectedType] = useState<EducationType | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);

  // User profile for visibility filtering
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Search state for New Education section
  const [newEducationSearchQuery, setNewEducationSearchQuery] = useState('');

  // Swiper refs and state
  const newEducationSwiperRef = useRef<SwiperType | null>(null);
  const [newEducationButtonsDisabled, setNewEducationButtonsDisabled] = useState({
    prev: true,
    next: false,
  });


  // Fetch user profile on mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoadingAuth(true);
      const response = await getClient<UserProfile>(API_ENDPOINTS.AUTH.ME);
      if (response.data) {
        setUserProfile(response.data);
      }
    } catch (err) {
      console.error('유저 정보를 불러오는 중 오류:', err);
      // User is not logged in
      setUserProfile(null);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Visibility filter helper
  const isItemVisible = (item: EducationItem): boolean => {
    // If targetMemberType is "ALL", show to everyone
    if (item.targetMemberType === "ALL") {
      return true;
    }

    // If targetMemberType is not "ALL", check authentication and memberType
    if (!userProfile) {
      // User is not logged in, hide restricted items
      return false;
    }

    // Check if user's memberType matches targetMemberType
    return userProfile.memberType === item.targetMemberType;
  };

  // Client-side: fetch new education list if needed (for refresh)
  const fetchNewEducationList = async () => {
    try {
      const response = await getClient<EducationListResponse>(
        `${API_ENDPOINTS.TRAINING_SEMINARS}?page=1&limit=9`
      );
      if (response.data) {
        setNewEducationList(response.data.items);
      }
    } catch (err) {
      console.error('신규 교육 목록 로딩 실패:', err);
    }
  };

  // Client-side: fetch when filters/pagination change
  useEffect(() => {
    setCurrentPage(1); // 타입 변경 시 첫 페이지로 리셋
  }, [selectedType]);

  useEffect(() => {
    // Only fetch if filter or page changed from initial state
    if (selectedType !== 'ALL' || currentPage !== 1) {
      fetchEducationList();
    }
  }, [selectedType, currentPage]);

  // Client-side: fetch education list when filters/pagination change
  const fetchEducationList = async () => {
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '9', // 3x3 그리드를 위한 9개
      });

      if (selectedType !== 'ALL') {
        params.append('type', selectedType);
      }

      const response = await getClient<EducationListResponse>(
        `${API_ENDPOINTS.TRAINING_SEMINARS}?${params.toString()}`
      );

      if (response.data) {
        setEducationList(response.data.items);
        const limit = 9; // 요청한 limit 사용
        const calculatedTotalPages = Math.ceil(response.data.total / limit);
        setTotalPages(calculatedTotalPages);
        console.log('Education pagination:', {
          total: response.data.total,
          limit,
          totalPages: calculatedTotalPages,
          items: response.data.items.length
        });
      } else if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    }
  };

  // Filter new education list based on search query AND visibility
  const filteredNewEducationList = newEducationList.filter((item) => {
    // First check visibility
    if (!isItemVisible(item)) {
      return false;
    }

    // Then check search query
    if (!newEducationSearchQuery.trim()) {
      return true;
    }
    const query = newEducationSearchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.location?.toLowerCase().includes(query) ||
      item.typeLabel?.toLowerCase().includes(query)
    );
  });

  // Update button states helper for new education swiper
  const updateNewEducationButtons = useCallback(() => {
    if (newEducationSwiperRef.current) {
      setNewEducationButtonsDisabled({
        prev: newEducationSwiperRef.current.isBeginning,
        next: newEducationSwiperRef.current.isEnd,
      });
    }
  }, []);

  // Reset swiper to first slide when search query changes
  useEffect(() => {
    if (newEducationSwiperRef.current) {
      newEducationSwiperRef.current.slideTo(0);
      updateNewEducationButtons();
    }
  }, [newEducationSearchQuery, updateNewEducationButtons]);

  const handleNewEducationPrev = () => {
    newEducationSwiperRef.current?.slidePrev();
  };

  const handleNewEducationNext = () => {
    newEducationSwiperRef.current?.slideNext();
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return dateString.replace(/\./g, '.');
  };

  // Filter education list based on visibility
  const visibleEducationList = educationList.filter(isItemVisible);

  // 모집 마감일까지 남은 일수 계산
  const getDaysUntilDeadline = (endDate: string) => {
    const today = new Date();
    const deadline = new Date(endDate);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <>
      <Head>
        <title>교육/세미나 안내 - 세무법인 함께</title>
        <meta
          name="description"
          content="세무법인 함께의 전문가 교육 프로그램과 세미나 일정을 확인하세요"
        />
        <meta property="og:title" content="교육/세미나 안내 - 세무법인 함께" />
        <meta
          property="og:description"
          content="세무법인 함께의 전문가 교육 프로그램과 세미나"
        />
        <meta property="og:type" content="website" />
      </Head>
      <div className={styles.page}>
        <Header variant="white" onMenuClick={() => setIsMenuOpen(true)} isFixed={true} />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className={styles.headerImage} />
        <div className="container">
          <div className={styles.pageHeaderWrapper}>
            <PageHeader
              // title="교육/세미나"
              breadcrumbs={[{ label: '교육/세미나' }]}
            />
          </div>

          <div className={styles.heroSection}>
            <p className={styles.heroSubtitle}>Education & Seminar</p>
            <div className={styles.heroTitle}>
              <span>기업의 성장</span>을 돕는 <br /> 가장 확실한 방법!
            </div>
            <div className={styles.heroDescriptionText}>
              <p>
                <span>세무법인 함께의</span>
                <span className={styles.boldText}>전문가 교육</span>은 <br />
                <span className={styles.boldText}>기업의 성공적인 내일</span>을 만듭니다.
              </p>
            </div>
          </div>

          <div className={styles.content}>
            {error ? (
              <div className={styles.emptyState}>
                <p>{error}</p>
              </div>
            ) : (
              <>
                <div className={styles.newSection}>
                  <div className={styles.searchInputWrapper}>
                    <input
                      type="text"
                      placeholder="검색어를 입력해보세요"
                      value={newEducationSearchQuery}
                      onChange={(e) => setNewEducationSearchQuery(e.target.value)}
                      className={styles.newEducationSearchInput}
                    />
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      className={styles.searchIcon}
                    >
                      <path
                        d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z"
                        stroke="#717171"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M19 19L14.65 14.65"
                        stroke="#717171"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className={styles.sectionHeader}>

                    <div className={styles.sectionTitleWrapper}>
                      <h4 className={styles.sectionTitle}>신규 교육</h4>
                    </div>
                    <div className={styles.sectionHeaderRight}>

                      {filteredNewEducationList.length > 0 && (
                        <div className={styles.sectionNav}>
                          <button
                            className={styles.navButton}
                            onClick={handleNewEducationPrev}
                            id="new-education-prev-btn"
                            disabled={newEducationButtonsDisabled.prev}
                          >
                            <img src="/images/common/arrow-icon.svg" alt="" className={styles.navButtonLeft} />
                          </button>
                          <button
                            className={styles.navButton}
                            onClick={handleNewEducationNext}
                            id="new-education-next-btn"
                            disabled={newEducationButtonsDisabled.next}
                          >
                            <img src="/images/common/arrow-icon.svg" alt="" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {filteredNewEducationList.length > 0 ? (
                    <div className={styles.newEducationSwiperWrapper}>
                      <Swiper
                        modules={[Navigation]}
                        grabCursor={true}
                        allowTouchMove={true}
                        navigation={{
                          prevEl: "#new-education-prev-btn",
                          nextEl: "#new-education-next-btn",
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
                            spaceBetween: 24,
                          },
                        }}
                        onSwiper={(swiper) => {
                          newEducationSwiperRef.current = swiper;
                          updateNewEducationButtons();
                        }}
                        onSlideChange={() => {
                          updateNewEducationButtons();
                        }}
                        className={styles.newEducationSwiper}
                      >
                        {filteredNewEducationList.map((item) => {
                          const daysLeft = getDaysUntilDeadline(item.recruitmentEndDate);
                          return (
                            <SwiperSlide key={item.id}>
                              <div
                                className={styles.educationCard}
                                onClick={() => router.push(`/education/${item.id}`)}
                              >
                                <div className={styles.cardImage}>
                                  <img src={item.image?.url || '/images/education/default-thumbnail.png'} alt={item.name} />
                                </div>
                                <div className={styles.cardContent}>
                                  <div className={styles.cardLabels}>
                                    {daysLeft > 0 && (
                                      <span className={styles.labelRed}>
                                        신청마감 D-{daysLeft}
                                      </span>
                                    )}
                                    <span className={styles.labelWhite}>
                                      {item.typeLabel}
                                    </span>
                                  </div>
                                  <h3 className={styles.cardTitle}>{item.name}</h3>
                                  <div className={styles.cardInfo}>
                                    <p className={styles.cardLocation}>{item.location}</p>
                                    <div className={styles.cardDateWrapper}>
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.cardDateIcon}>
                                        <path d="M3 2V4M13 2V4M2 6H14M3 2H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2Z" stroke="#d8d8d8" strokeWidth="1" strokeLinecap="round" />
                                      </svg>
                                      <p className={styles.cardDate}>
                                        {item.educationDates[0]} {item.educationTimeSlots[0]}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </SwiperSlide>
                          );
                        })}
                      </Swiper>
                    </div>
                  ) : (
                    <div className={styles.emptyState}>
                      <img src="/images/common/empty-icon.svg" alt="Empty" className={styles.emptyIcon} />
                      <p>등록된 세미나/교육이 없습니다</p>
                    </div>
                  )}
                </div>

                <div className={styles.allSection}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitleWrapper}>
                      <h4 className={styles.sectionTitle}>전체 교육</h4>
                    </div>
                  </div>
                  <div className={styles.allContent}>
                    <div className={styles.sidebar}>
                      <div
                        className={`${styles.sidebarTab} ${selectedType === 'ALL' ? styles.sidebarTabActive : ''}`}
                        onClick={() => setSelectedType('ALL')}
                      >
                        <span>전체</span>
                      </div>
                      <div
                        className={`${styles.sidebarTab} ${selectedType === 'VOD' ? styles.sidebarTabActive : ''}`}
                        onClick={() => setSelectedType('VOD')}
                      >
                        <span>VOD</span>
                      </div>
                      <div
                        className={`${styles.sidebarTab} ${selectedType === 'TRAINING' ? styles.sidebarTabActive : ''}`}
                        onClick={() => setSelectedType('TRAINING')}
                      >
                        <span>교육</span>
                      </div>
                      <div
                        className={`${styles.sidebarTab} ${selectedType === 'LECTURE' ? styles.sidebarTabActive : ''}`}
                        onClick={() => setSelectedType('LECTURE')}
                      >
                        <span>강연</span>
                      </div>
                      <div
                        className={`${styles.sidebarTab} ${selectedType === 'SEMINAR' ? styles.sidebarTabActive : ''}`}
                        onClick={() => setSelectedType('SEMINAR')}
                      >
                        <span>세미나</span>
                      </div>
                    </div>
                    <div className={styles.mainContent}>
                      {visibleEducationList.length > 0 ? (
                        <>
                          <div className={styles.educationGrid}>
                            {visibleEducationList.map((item) => {
                              const daysLeft = getDaysUntilDeadline(item.recruitmentEndDate);
                              return (
                                <div
                                  key={item.id}
                                  className={styles.educationCard}
                                  onClick={() => router.push(`/education/${item.id}`)}
                                >
                                  <div className={styles.cardImage}>
                                    <img src={item.image?.url || '/images/education/default-thumbnail.png'} alt={item.name} />
                                  </div>
                                  <div className={styles.cardContent}>
                                    <div className={styles.cardLabels}>
                                      {daysLeft > 0 ? (
                                        <span className={styles.labelRed}>
                                          신청마감 D-{daysLeft}
                                        </span>
                                      ) : (
                                        <span className={styles.labelGray}>
                                          신청마감
                                        </span>
                                      )}
                                      <span className={styles.labelWhite}>
                                        {item.typeLabel}
                                      </span>
                                    </div>
                                    <h3 className={styles.cardTitle}>{item.name}</h3>
                                    <div className={styles.cardInfo}>
                                      <p className={styles.cardLocation}>{item.location}</p>
                                      <div className={styles.cardDateWrapper}>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.cardDateIcon}>
                                          <path d="M3 2V4M13 2V4M2 6H14M3 2H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2Z" stroke="#d8d8d8" strokeWidth="1" strokeLinecap="round" />
                                        </svg>
                                        <p className={styles.cardDate}>
                                          {item.educationDates[0]} {item.educationTimeSlots[0]}
                                        </p>
                                      </div>
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
                              onPageChange={(page) => {
                                setCurrentPage(page);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              visiblePages={4}
                            />
                          </div>
                        </>
                      ) : (
                        <div className={styles.emptyState}>
                          <img src="/images/common/empty-icon.svg" alt="Empty" className={styles.emptyIcon} />
                          <p>등록된 세미나/교육이 없습니다</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <Footer />

        {/* Floating Buttons */}
        <div className={styles.floatingButtons}>
          <FloatingButton
            variant="consult"
            label="상담 신청하기"
            onClick={() => router.push('/consultation/apply')}
          />
          <FloatingButton
            variant="top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<EducationPageProps> = async () => {
  try {
    // Fetch new education list (first 9 items)
    const newEducationResponse = await get<EducationListResponse>(
      `${API_ENDPOINTS.TRAINING_SEMINARS}?page=1&limit=9`
    );

    // Fetch all education list (first page, all types)
    const allEducationResponse = await get<EducationListResponse>(
      `${API_ENDPOINTS.TRAINING_SEMINARS}?page=1&limit=9`
    );

    const newEducationList = newEducationResponse.data?.items || [];
    const educationList = allEducationResponse.data?.items || [];
    const total = allEducationResponse.data?.total || 0;
    const limit = 9;
    const totalPages = Math.ceil(total / limit);

    return {
      props: {
        initialEducationList: educationList,
        initialNewEducationList: newEducationList,
        initialTotalPages: totalPages,
        error: null,
      },
    };
  } catch (err) {
    console.error("Failed to fetch education data:", err);
    return {
      props: {
        initialEducationList: [],
        initialNewEducationList: [],
        initialTotalPages: 1,
        error: "데이터를 불러오는 중 오류가 발생했습니다.",
      },
    };
  }
};

export default EducationPage;

