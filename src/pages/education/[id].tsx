import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import Head from "next/head";
import dynamic from "next/dynamic";
import "@toast-ui/editor/dist/toastui-editor-viewer.css";
import Header from "@/components/common/Header";
import Menu from "@/components/Menu";
import Footer from "@/components/Footer";
import Icon from "@/components/common/Icon";
import DatePickerModal from "@/components/education/DatePickerModal";
import ApplicationModal from "@/components/education/ApplicationModal";
import { get as getClient, del } from "@/lib/api";
import { get, getTokenFromCookies } from "@/lib/api-server";
import { API_ENDPOINTS } from "@/config/api";
import { type EducationDetail, type ApplicationStatus, MemberType } from "@/types/education";
import styles from "./detail.module.scss";
import { AccessTime, CalendarToday } from "@mui/icons-material";
import FloatingButton from "@/components/common/FloatingButton";

interface UserProfile {
  id: number;
  loginId: string;
  name: string;
  memberType?: string;
  isApproved?: boolean;
}

// Toast UI Viewer는 클라이언트 사이드에서만 로드
const Viewer = dynamic(
  () => import("@toast-ui/react-editor").then((mod) => mod.Viewer),
  { ssr: false }
);

interface EducationDetailPageProps {
  education: EducationDetail | null;
  error: string | null;
}

const EducationDetailPage: React.FC<EducationDetailPageProps> = ({ education: initialEducation, error: initialError }) => {
  const router = useRouter();
  const { id } = router.query;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [education, setEducation] = useState<EducationDetail | null>(initialEducation);
  const [error, setError] = useState<string | null>(initialError);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    
    const fetchDetail = async () => {
      try {
        const response = await getClient<EducationDetail>(
          `${API_ENDPOINTS.TRAINING_SEMINARS}/${id}`
        );
        
        if (response.data) {
          setEducation(response.data);
          setError(null);
        } else {
          setError(response.error || "교육 정보를 찾을 수 없습니다.");
        }
      } catch (err) {
        console.error("Failed to fetch education detail:", err);
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
      }
    };
  
    fetchDetail();
  }, [id]);
  
  // Convert Vimeo URL to embed format
  // Only call this when url is NOT null
  const getVimeoEmbedUrl = (url: string): string => {
    // If already in embed format, return as is
    if (url.includes("player.vimeo.com/video/")) {
      return url;
    }

    // Extract video ID from various Vimeo URL formats
    // Formats: https://vimeo.com/1070109559, https://vimeo.com/video/1070109559, etc.
    const patterns = [
      /vimeo\.com\/video\/(\d+)/,  // https://vimeo.com/video/1070109559
      /vimeo\.com\/(\d+)/,          // https://vimeo.com/1070109559
      /vimeo\.com\/.*\/(\d+)/,      // Other variations
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return `https://player.vimeo.com/video/${match[1]}`;
      }
    }

    // If no pattern matches, try to extract any numeric ID from the URL
    const numericMatch = url.match(/(\d{8,})/); // Vimeo IDs are typically 8+ digits
    if (numericMatch && numericMatch[1]) {
      return `https://player.vimeo.com/video/${numericMatch[1]}`;
    }

    // If parsing fails, return the original URL (should not happen with valid Vimeo URLs)
    return url;
  };
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  // ✅ Fetch user's application from dedicated endpoint
  const [myApplication, setMyApplication] = useState<{ id: number; status: ApplicationStatus; participationDate?: string } | null>(null);
  const [isLoadingMyApplication, setIsLoadingMyApplication] = useState(false);

  // 사용자 정보 가져오기 (CSR - auth-related)
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoadingAuth(true);
      
      // ✅ Check for token before calling /me
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
      console.error("유저 정보를 불러오는 중 오류:", err);
      // User is not logged in or token is invalid
      setUserProfile(null);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // ✅ Fetch user's application status from dedicated endpoint
  useEffect(() => {
    if (!id || isLoadingAuth) return;
    
    const fetchMyApplication = async () => {
      // Only fetch if user is logged in
      if (!userProfile) {
        setMyApplication(null);
        return;
      }
      
      try {
        setIsLoadingMyApplication(true);
        const response = await getClient<{ id: number; status: ApplicationStatus; participationDate?: string } | null>(
          `${API_ENDPOINTS.TRAINING_SEMINARS}/${id}/my-application`
        );
        
        if (response.data) {
          // ✅ Use status exactly as returned from backend (no transformations)
          setMyApplication(response.data);
        } else {
          setMyApplication(null);
        }
      } catch (err) {
        console.error("신청 정보를 불러오는 중 오류:", err);
        setMyApplication(null);
      } finally {
        setIsLoadingMyApplication(false);
      }
    };
    
    fetchMyApplication();
  }, [id, userProfile, isLoadingAuth]);

  // Visibility filtering based on targetMemberType
  useEffect(() => {
    if (!education || isLoadingAuth) return;

    const { targetMemberType } = education;

    // If targetMemberType is "ALL", show to everyone
    if (targetMemberType === "ALL") {
      setVisibilityError(null);
      return;
    }

    // If targetMemberType is not "ALL", check authentication and memberType
    if (!userProfile) {
      // User is not logged in
      setVisibilityError("로그인이 필요한 교육입니다.");
      return;
    }

    // Check if user's memberType matches targetMemberType
    if (userProfile.memberType !== targetMemberType) {
      setVisibilityError("이 교육은 " + education.targetMemberTypeLabel + " 전용입니다.");
      return;
    }

    // User has access
    setVisibilityError(null);
  }, [education, userProfile, isLoadingAuth]);

  const getDaysUntilDeadline = (endDate: string) => {
    const today = new Date();
    const deadline = new Date(endDate);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  };

  // 교육 일자 포맷팅 (첫 번째 날짜 ~ 마지막 날짜 형식)
  const formatEducationDates = (dates: string[]) => {
    if (!dates || dates.length === 0) return "";

    const formatSingleDate = (dateString: string) => {
      // 날짜 문자열을 Date 객체로 변환 (YYYY.MM.DD 또는 YYYY-MM-DD 형식 지원)
      const normalizedDate = dateString.replace(/\./g, "-");
      const dateObj = new Date(normalizedDate);

      // 유효하지 않은 날짜인 경우 원본 반환
      if (isNaN(dateObj.getTime())) {
        return dateString;
      }

      const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
      const weekday = weekdays[dateObj.getDay()];

      // YY.MM.DD 형식으로 변환
      const year = dateObj.getFullYear().toString().slice(-2);
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");

      return `${year}.${month}.${day} (${weekday})`;
    };

    if (dates.length === 1) {
      return formatSingleDate(dates[0]);
    }

    // 첫 번째와 마지막 날짜만 사용
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];

    const firstNormalized = firstDate.replace(/\./g, "-");
    const lastNormalized = lastDate.replace(/\./g, "-");
    const firstDateObj = new Date(firstNormalized);
    const lastDateObj = new Date(lastNormalized);

    // 유효하지 않은 날짜인 경우 원본 반환
    if (isNaN(firstDateObj.getTime()) || isNaN(lastDateObj.getTime())) {
      return `${firstDate} ~ ${lastDate}`;
    }

    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const firstWeekday = weekdays[firstDateObj.getDay()];
    const lastWeekday = weekdays[lastDateObj.getDay()];

    const firstYear = firstDateObj.getFullYear().toString().slice(-2);
    const firstMonth = String(firstDateObj.getMonth() + 1).padStart(2, "0");
    const firstDay = String(firstDateObj.getDate()).padStart(2, "0");

    const lastYear = lastDateObj.getFullYear().toString().slice(-2);
    const lastMonth = String(lastDateObj.getMonth() + 1).padStart(2, "0");
    const lastDay = String(lastDateObj.getDate()).padStart(2, "0");

    // 같은 연도면 두 번째 날짜에서 연도 생략
    const firstFormatted = `${firstYear}.${firstMonth}.${firstDay} (${firstWeekday})`;
    const lastFormatted =
      firstYear === lastYear
        ? `${lastMonth}.${lastDay} (${lastWeekday})`
        : `${lastYear}.${lastMonth}.${lastDay} (${lastWeekday})`;

    return `${firstFormatted} ~ ${lastFormatted}`;
  };

  // Show loading state while checking auth
  if (isLoadingAuth) {
    return (
      <div className={styles.page}>
        <Header variant="transparent" onMenuClick={() => setIsMenuOpen(true)} />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className={styles.container}>
          <div className={styles.error}>
            로딩 중...
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show error if education not found or initial error
  if (error || !education) {
    return (
      <div className={styles.page}>
        <Header variant="transparent" onMenuClick={() => setIsMenuOpen(true)} />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className={styles.container}>
          <div className={styles.error}>
            {error || "교육 정보를 찾을 수 없습니다."}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show visibility error if user doesn't have access
  if (visibilityError) {
    return (
      <div className={styles.page}>
        <Header variant="transparent" onMenuClick={() => setIsMenuOpen(true)} />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className={styles.container}>
          <div className={styles.error}>
            {visibilityError}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const daysLeft = getDaysUntilDeadline(education.recruitmentEndDate);
  const checkRecruitmentClosed = () => {
    if (!education.recruitmentEndDate) return false;
    const today = new Date();
    const endDate = new Date(education.recruitmentEndDate);

    // 날짜만 비교 (시/분/초 무시) → 마감일 당일(endDate와 같은 날)에는 신청 가능
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    return today > endDate;
  };

  const isRecruitmentClosed = checkRecruitmentClosed();
  // ✅ Use myApplication from dedicated API endpoint (not education.applications array)
  const userApplication = myApplication;

  // 버튼 상태 결정 - 올바른 ApplicationStatus만 사용 (백엔드 enum과 정확히 일치)
  const getButtonState = () => {
    // Case A: User never applied
    if (!userApplication) {
      return "can_apply";
    }

    // Case B-D: Check actual status from backend (exact string match, case-sensitive)
    // ✅ Use exact backend enum values: WAITING, CONFIRMED, CANCELLED
    // No transformations, no fallbacks to WAITING - only exact matches
    const status = userApplication.status;
    
    switch (status) {
      case "WAITING":
        return "waiting";
      
      case "CONFIRMED":
        return "confirmed";
      
      case "CANCELLED":
        // Treat as new user - can apply again
        return "can_apply";
      
      default:
        // Fallback: treat unknown status as can_apply (NOT waiting!)
        return "can_apply";
    }
  };

  const buttonState = getButtonState();

  // 신청 취소 처리
  const handleCancelApplication = async () => {
    if (!userApplication?.id) return;
    console.log(daysLeft);
    if(daysLeft <= 1) {
      alert("교육/세미나 당일에는 취소할 수 없습니다");
      return;
    }

    const confirmed = window.confirm("신청을 취소하시겠습니까?");
    if (!confirmed) return;

    try {
      // 신청 취소 API: DELETE /training-seminars/{seminarId}/apply
      const response = await del(
        `${API_ENDPOINTS.TRAINING_SEMINARS}/${id}/apply`
      );

      if (response.error) {
        console.error("신청 취소 실패:", response.error);
        // Show backend error message
        alert(response.error || "신청 취소에 실패했습니다.");
        return;
      }

      alert("신청이 취소되었습니다.");
      // ✅ Refetch my application status from API to ensure accuracy
      try {
        const refetchResponse = await getClient<{ id: number; status: ApplicationStatus; participationDate?: string } | null>(
          `${API_ENDPOINTS.TRAINING_SEMINARS}/${id}/my-application`
        );
        if (refetchResponse.data) {
          setMyApplication(refetchResponse.data);
        } else {
          setMyApplication(null);
        }
      } catch (refetchErr) {
        // If refetch fails, assume application was cancelled (set to null)
        setMyApplication(null);
      }
    } catch (err) {
      console.error("신청 취소 중 오류:", err);
      alert("신청 취소 중 오류가 발생했습니다.");
    }
  };

  // 버튼 렌더링 함수 - 올바른 상태만 처리
  const renderActionButton = () => {
    if (isRecruitmentClosed) {
      return (
        <button className={styles.closedButton} disabled>
          모집 종료
        </button>
      );
    }
    // State: WAITING - 승인 대기중
    if (buttonState === "waiting") {
      return (
        <>
          <button className={styles.pendingButton} disabled>
            승인 대기중
          </button>
          <button
            className={styles.cancelLink}
            onClick={handleCancelApplication}
          >
            신청 취소
          </button>
        </>
      );
    }

    // State: CONFIRMED - 신청 완료
    if (buttonState === "confirmed") {
      return (
        <>
          <button className={styles.pendingButton} disabled>
            신청 완료
          </button>
         {daysLeft > 0 && <button
            className={styles.cancelLink}
            onClick={handleCancelApplication}
          >
            신청 취소
          </button>}
        </>
      );
    }

    // State: can_apply - 신청하기 (never applied or CANCELLED)
    return (
      <button
        className={styles.applyButton}
        onClick={() => {
          // Check if user is logged in
          if (!userProfile) {
            alert("교육/세미나는 로그인 후 신청할 수 있습니다.");
            return;
          }
          setIsApplicationModalOpen(true);
        }}
      >
        신청하기
      </button>
    );
  };

  return (
    <>
      <Head>
        <title>{education.name} - 세무법인 함께</title>
        <meta
          name="description"
          content={education.instructorName || `${education.name} - 세무법인 함께 교육 프로그램`}
        />
        <meta property="og:title" content={`${education.name} - 세무법인 함께`} />
        <meta
          property="og:description"
          content={education.instructorName || `${education.name}`}
        />
        <meta property="og:type" content="article" />
        {education.image?.url && (
          <meta property="og:image" content={education.image.url} />
        )}
      </Head>
      <div className={styles.page}>
        <Header
          variant="transparent"
          onMenuClick={() => setIsMenuOpen(true)}
          isFixed={true}
        />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        <div className="container">
          <div className={styles.contentHeader}>
            {/* Only render video when backend explicitly returns vimeoVideoUrl !== null */}
            
            <div className={styles.labels}>
              {daysLeft > 0 ? (
                <span className={styles.labelRed}>신청마감 D-{daysLeft}</span>
              ) : (
                <span className={styles.labelGray}>신청마감</span>
              )}
              <span className={styles.labelWhite}>{education.typeLabel}</span>
            </div>
            <h1 className={styles.contentTitle}>{education.name}</h1>
          </div>
          <div className={styles.content}>
            <div className={styles.imageSection}>
              <div className={styles.imageWrapper}>
                <img
                  src={
                    education.image?.url ||
                    "/images/education/default-thumbnail.png"
                  }
                  alt={education.name}
                />
              </div>
            </div>
            <div className={styles.contentHeaderMobile}>
              <div className={styles.labels}>
                {daysLeft > 0 ? (
                  <span className={styles.labelRed}>신청마감 D-{daysLeft}</span>
                ) : (
                  <span className={styles.labelGray}>신청마감</span>
                )}
                <span className={styles.labelWhite}>{education.typeLabel}</span>
              </div>
              <h1 className={styles.contentTitle}>{education.name}</h1>
            </div>

            {/* 강의 정보 */}
            <div className={styles.sidebar}>
              <div className={styles.sidebarCard}>
                {/* <div className={styles.cardHeader}>
                <div className={styles.labels}>
                 
                    <span className={styles.labelGray}>교육 주제</span>
                  
                </div>
                <h2 className={styles.cardTitle}>{education.name}</h2>
              </div> */}

                {/* <div className={styles.divider} /> */}

                <div className={styles.cardInfo}>
                  <div className={styles.infoRow}>
                    <div className={styles.infoLabel}>
                      <span className={styles.icon}>유형</span>
                    </div>
                    <p className={styles.infoValue}>{education.typeLabel}</p>
                  </div>
                  <div className={styles.infoRow}>
                    <div className={styles.infoLabel}>
                      <span className={styles.icon}>강사</span>
                    </div>
                    <p className={styles.infoValue}>{education.instructorName}</p>
                  </div>
                  <div className={styles.infoRow}>
                    <div className={styles.infoLabel}>
                      <span className={styles.icon}>대상</span>
                    </div>
                    <p className={styles.infoValue}>{education.target}</p>
                  </div>
                </div>
                <div className={styles.divider} />

                <div className={styles.educationDetails}>
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>
                      <CalendarToday />
                      <span className={styles.detailIcon}>교육 일자</span>
                    </div>
                    <p className={styles.detailValue}>
                      {formatEducationDates(education.educationDates)}
                    </p>
                  </div>
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>
                      <AccessTime />
                      <span className={styles.detailIcon}>교육 시간</span>
                    </div>
                    <p className={styles.detailValue}>
                      {education.educationTimeSlots.join(", ")}
                    </p>
                  </div>
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>
                      <img
                        src="/images/common/map-icon.svg"
                        alt="교육 장소"
                        className={styles.detailIconImage}
                      />
                      <span className={styles.detailIcon}>교육 장소</span>
                    </div>
                    <p className={styles.detailValue}>{education.location}</p>
                  </div>
                </div>

                {education.otherInfo && (
                  <div className={styles.otherInfo}>
                    <p>{education.otherInfo}</p>
                  </div>
                )}
                <div className={styles.divider} />

                <div className={styles.dateSelector}>
                  <div className={styles.dateInput}>
                    <CalendarToday />
                    <p>
                      {(buttonState === "waiting" || buttonState === "confirmed")
                        ? myApplication?.participationDate || selectedDate || "참여 날짜 선택"
                        : selectedDate || "참여 날짜 선택"}
                    </p>
                  </div>
                  <button
                    className={styles.dateButton}
                    onClick={() => setIsDatePickerOpen(true)}
                    disabled={buttonState === "waiting" || buttonState === "confirmed"}
                  >
                    날짜 선택
                  </button>
                </div>

                <div className={styles.price}>
                  <p> {education.price ? education.price : 0} 원</p>
                </div>

                <div className={styles.actionButtonDesktop}>
                  {renderActionButton()}
                </div>
              </div>
            </div>

            {/* 설명 섹션 */}
            <div className={styles.bodySection}>
              <div className={styles.bodyContent}>
                <Viewer initialValue={education.body} />
              </div>
            </div>
            {education.vimeoVideoUrl && (
              <div className={styles.videoWrapper}>
                <iframe
                  src={getVimeoEmbedUrl(education.vimeoVideoUrl)}
                  title="Vimeo Video"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            )}
          </div>
        </div>

        {/* 모바일 하단 고정 버튼 */}
        <div className={styles.stickyButtonWrapper}>{renderActionButton()}</div>

        <Footer />
        <div className={styles.floatingButtons}>
          <FloatingButton
            variant="consult"
            label="상담 신청하기"
            onClick={() => router.push("/consultation/apply")}
          />
        </div>
        <DatePickerModal
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          onConfirm={(date) => setSelectedDate(date)}
          availableDates={education.educationDates}
        />

        {education && (
          <ApplicationModal
            isOpen={isApplicationModalOpen}
            onClose={() => setIsApplicationModalOpen(false)}
            education={education}
            initialDate={selectedDate}
            onSuccess={async () => {
              // ✅ Refetch my application status from API after successful application
              if (userProfile && id) {
                try {
                  const response = await getClient<{ id: number; status: ApplicationStatus; participationDate?: string } | null>(
                    `${API_ENDPOINTS.TRAINING_SEMINARS}/${id}/my-application`
                  );
                  if (response.data) {
                    setMyApplication(response.data);
                  } else {
                    setMyApplication(null);
                  }
                } catch (err) {
                  console.error("신청 정보를 불러오는 중 오류:", err);
                }
              }
            }}
          />
        )}
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<EducationDetailPageProps> = async (context) => {
  const { id } = context.params!;

  try {
    // Get token from cookies (backend will handle permissions internally)
    const token = getTokenFromCookies(context);
    
    // Call API without query params - backend handles permissions via auth token
    const response = await get<EducationDetail>(
      `${API_ENDPOINTS.TRAINING_SEMINARS}/${id}`,
      { token: token || undefined }
    );

    if (response.data) {
      return {
        props: {
          education: response.data,
          error: null,
        },
      };
    } else {
      return {
        props: {
          education: null,
          error: response.error || "교육 정보를 찾을 수 없습니다.",
        },
      };
    }
  } catch (err) {
    console.error("Failed to fetch education detail:", err);
    return {
      props: {
        education: null,
        error: "데이터를 불러오는 중 오류가 발생했습니다.",
      },
    };
  }
};

export default EducationDetailPage;
