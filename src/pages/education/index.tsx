import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import Header from '@/components/common/Header';
import Menu from '@/components/Menu';
import Footer from '@/components/Footer';
import PageHeader from '@/components/common/PageHeader';
import FloatingButton from '@/components/common/FloatingButton';
import Pagination from '@/components/common/Pagination';
import SEO from '@/components/common/SEO';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import { get as getClient } from '@/lib/api';
import { get } from '@/lib/api-server';
import { API_ENDPOINTS } from '@/config/api';
import type { EducationItem, EducationListResponse, EducationType } from '@/types/education';
import { MemberType as EducationMemberType } from '@/types/education';
import styles from './education.module.scss';

interface UserProfile {
  id: number;
  loginId: string;
  name: string;
  memberType?: string;
  isApproved?: boolean;
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

  const [swiperItems, setSwiperItems] = useState<EducationItem[]>(initialNewEducationList);
  const [listItems, setListItems] = useState<EducationItem[]>(initialEducationList);
  const [error, setError] = useState<string | null>(initialError);
  const [selectedType, setSelectedType] = useState<EducationType | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [isLoadingEducationList, setIsLoadingEducationList] = useState(false);
  const [isLoadingSwiper, setIsLoadingSwiper] = useState(false);

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

      // Check for token before calling /me
      const token = localStorage.getItem('accessToken');
      if (!token) {
        // No token: user is not logged in, set to null and proceed as guest
        setUserProfile(null);
        setIsLoadingAuth(false);
        return;
      }

      // Token exists: fetch user profile
      const response = await getClient<UserProfile>(API_ENDPOINTS.AUTH.ME);
      if (response.data) {
        setUserProfile(response.data);
      } else {
        setUserProfile(null);
      }
    } catch (err) {
      console.error('유저 정보를 불러오는 중 오류:', err);
      // User is not logged in or token is invalid
      setUserProfile(null);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Build query params for API calls with user filtering
  const buildUserFilterParams = () => {
    const params = new URLSearchParams();

    if (!userProfile) {
      // Not logged in: explicitly send memberType=null for guest filtering
      params.append('memberType', 'null');
      return `&${params.toString()}`;
    }

    // Logged in: send actual user data
    if (userProfile.memberType) {
      params.append('memberType', userProfile.memberType);
    }
    // Only add isApproved for INSURANCE users
    if (userProfile.memberType === 'INSURANCE' && 'isApproved' in userProfile) {
      params.append('isApproved', String((userProfile as any).isApproved));
    }

    return params.toString() ? `&${params.toString()}` : '';
  };

  // 현재 로그인 사용자가 세무사(INSURANCE) 회원인지 여부
  const isInsuranceMember = userProfile?.memberType === EducationMemberType.INSURANCE;

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
    if (userProfile.memberType !== item.targetMemberType) {
      return false;
    }

    // 추가 조건: 세무사(INSURANCE) 회원일 때는 승인된 교육만 노출
    if (isInsuranceMember) {
      // isApproved가 false인 경우만 숨기고, undefined/true는 노출
      if (item.isApproved === false) {
        return false;
      }
    }

    return true;
  };

  // Swiper data is now loaded server-side, no need to fetch on mount
  // Only fetch if initial data is empty (fallback)
  // ✅ Wait for auth to be ready before fetching
  useEffect(() => {
    // Don't fetch until auth is initialized
    if (isLoadingAuth) return;

    if (initialNewEducationList.length === 0) {
      const fetchSwiperData = async () => {
        setIsLoadingSwiper(true);
        setError(null);

        try {
          const params = new URLSearchParams({
            page: '1',
            limit: '8',
            sort: 'new',
          });
          const userParams = buildUserFilterParams();

          const response = await getClient<EducationListResponse>(
            `${API_ENDPOINTS.TRAINING_SEMINARS}?${params.toString()}${userParams}`
          );

          if (response.data) {
            setSwiperItems(response.data.items);
          } else if (response.error) {
            setError(response.error);
          }
        } catch (err) {
          console.error('Swiper 데이터 로딩 실패:', err);
          setError('데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
          setIsLoadingSwiper(false);
        }
      };

      fetchSwiperData();
    }
  }, [isLoadingAuth, userProfile]); // ✅ Refetch when auth state changes

  // Fetch bottom list data: dynamic, refetches on page/tab change
  // ✅ Wait for auth to be ready before fetching
  useEffect(() => {
    // Don't fetch until auth is initialized
    if (isLoadingAuth) return;

    const fetchListData = async () => {
      setIsLoadingEducationList(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '8',
          sort: 'deadline', // Sort by recruitment end date
        });

        // Add type filter only if not 'ALL'
        if (selectedType !== 'ALL') {
          params.append('type', selectedType);
        }
        const userParams = buildUserFilterParams();

        const response = await getClient<EducationListResponse>(
          `${API_ENDPOINTS.TRAINING_SEMINARS}?${params.toString()}${userParams}`
        );

        if (response.data) {
          setListItems(response.data.items);
          const limit = 8;
          const calculatedTotalPages = Math.ceil(response.data.total / limit);
          setTotalPages(calculatedTotalPages);
        } else if (response.error) {
          setError(response.error);
        }
      } catch (err) {
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoadingEducationList(false);
      }
    };

    fetchListData();
  }, [isLoadingAuth, userProfile, selectedType, currentPage]); // ✅ Refetch when auth state or filters change

  // Handle tab change: reset page and clear list items (swiper unchanged)
  const handleTabChange = (type: EducationType | 'ALL') => {
    setSelectedType(type);
    setCurrentPage(1);
    setListItems([]); // Clear list items immediately
    // Swiper data remains unchanged
  };

  // Filter swiper items based on:
  // 1. Visibility (user auth + member type)
  // 2. Created within last 30 days
  // 3. Search query
  const filteredNewEducationList = swiperItems.filter((item) => {
    // First check visibility
    if (!isItemVisible(item)) {
      return false;
    }

    // Check if created within last 30 days
    if (item.createdAt) {
      const createdDate = new Date(item.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // If created more than 30 days ago, exclude from "New Education"
      if (createdDate < thirtyDaysAgo) {
        return false;
      }
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

  // Filter list items based on visibility and sort by recruitmentEndDate (ascending)
  const visibleEducationList = listItems
    .filter(isItemVisible)
    .sort((a, b) => {
      // Sort by recruitment end date (earliest first)
      const dateA = new Date(a.recruitmentEndDate).getTime();
      const dateB = new Date(b.recruitmentEndDate).getTime();
      return dateA - dateB;
    });

  // 모집 마감일까지 남은 일수 계산
  const getDaysUntilDeadline = (endDate: string) => {
    const today = new Date();
    const deadline = new Date(endDate);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <>
      <SEO pageType="menu" menuName="교육/세미나" />
      <div className={styles.page}>
        <Header variant="white" onMenuClick={() => setIsMenuOpen(true)} isFixed={true} />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className={styles.headerImage}>
          <h1 className={styles.headerTitle}>EDUCATION</h1>
          <p className={styles.headerSubtitle}>교육/세미나</p>
        </div>
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
                <span className={styles.boldText}> 전문가 교육</span>은 <br />
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
                                  {daysLeft <= 0 && (<div className={styles.cardImageDimmedOverlay}></div>)}
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
                                        <path d="M3 2V4M13 2V4M2 6H14M3 2H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2Z" stroke="#555555" strokeWidth="1" strokeLinecap="round" />
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
                        onClick={() => handleTabChange('ALL')}
                      >
                        <span>전체</span>
                      </div>
                      <div
                        className={`${styles.sidebarTab} ${selectedType === 'VOD' ? styles.sidebarTabActive : ''}`}
                        onClick={() => handleTabChange('VOD')}
                      >
                        <span>VOD</span>
                      </div>
                      <div
                        className={`${styles.sidebarTab} ${selectedType === 'TRAINING' ? styles.sidebarTabActive : ''}`}
                        onClick={() => handleTabChange('TRAINING')}
                      >
                        <span>교육</span>
                      </div>
                      <div
                        className={`${styles.sidebarTab} ${selectedType === 'LECTURE' ? styles.sidebarTabActive : ''}`}
                        onClick={() => handleTabChange('LECTURE')}
                      >
                        <span>강의</span>
                      </div>
                      <div
                        className={`${styles.sidebarTab} ${selectedType === 'SEMINAR' ? styles.sidebarTabActive : ''}`}
                        onClick={() => handleTabChange('SEMINAR')}
                      >
                        <span>세미나</span>
                      </div>
                    </div>
                    <div className={styles.mainContent}>
                      {isLoadingEducationList ? (
                        <div className={styles.emptyState}>
                          <p>로딩 중...</p>
                        </div>
                      ) : visibleEducationList.length > 0 ? (
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
                                  {daysLeft <= 0 && (<div className={styles.cardImageDimmedOverlay}></div>)}

                                    <img className={styles.cardImageImg} src={item.image?.url || '/images/education/default-thumbnail.png'} alt={item.name} />
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
                                          <path d="M3 2V4M13 2V4M2 6H14M3 2H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2Z" stroke="#555555" strokeWidth="1" strokeLinecap="round" />
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
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<EducationPageProps> = async () => {
  try {
    // Fetch initial swiper data (new education section) server-side
    // ✅ Use the same sort key as client-side: 'new'
    const swiperParams = new URLSearchParams({
      page: '1',
      limit: '8',
      sort: 'new',
    });

    const swiperResponse = await get<EducationListResponse>(
      `${API_ENDPOINTS.TRAINING_SEMINARS}?${swiperParams.toString()}`
    ).catch(() => ({ data: { items: [], total: 0, page: 1, limit: 8 } }));

    // Fetch initial list data (first page, all types, sorted by deadline)
    const listParams = new URLSearchParams({
      page: '1',
      limit: '8',
      sort: 'deadline',
    });

    const listResponse = await get<EducationListResponse>(
      `${API_ENDPOINTS.TRAINING_SEMINARS}?${listParams.toString()}`
    ).catch(() => ({ data: { items: [], total: 0, page: 1, limit: 8 } }));

    const initialNewEducationList = swiperResponse.data?.items || [];
    const initialEducationList = listResponse.data?.items || [];
    const initialTotalPages = listResponse.data?.total
      ? Math.ceil(listResponse.data.total / 8)
      : 1;

    return {
      props: {
        initialEducationList,
        initialNewEducationList,
        initialTotalPages,
        error: null,
      },
    };
  } catch (err) {
    console.error("Failed to initialize education page:", err);
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

