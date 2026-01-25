import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Header from "@/components/common/Header";
import Menu from "@/components/Menu";
import Footer from "@/components/Footer";
import DateRangePickerModal from "@/components/common/DateRangePickerModal";
import { TextField } from "@/components/common/TextField";
import { get, post, patch, del } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/api";
import styles from "./my.module.scss";
import { MemberType } from "@/types/education";

interface UserProfile {
  id: number;
  loginId: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  memberType?: string;
  provider?: string;
  newsletterSubscribed?: boolean;
  isApproved?: boolean;
}

interface ApplicationSummary {
  seminarTotal: number;
  consultationTotal: number;
  total: number;
}

interface SeminarImage {
  id: number;
  url: string;
}

interface TrainingSeminarApplication {
  no: number;
  id: number;
  applicationId: number;
  seminarId: number;
  name: string;
  type: "TRAINING" | "SEMINAR" | "VOD" | "LECTURE";
  typeLabel: string;
  image?: SeminarImage;
  location: string;
  deadlineLabel: string;
  deadlineDays: number;
  recruitmentEndDate?: string; // Server-provided recruitment end date
  status: "CONFIRMED" | "CANCELLED" | "PENDING";
  statusLabel: string;
  participationDate: string;
  participationTime: string;
  attendeeCount: number;
  appliedAt: string;
}

interface ConsultationApplication {
  id: number;
  date: string;
  content: string;
  field: string;
  consultant: string;
  status: "completed" | "received" | "pending" | "waiting";
  reply?: string;
}

// API에서 반환되는 상담 데이터 형식
interface ConsultationApiResponse {
  id: number;
  consultingField: string;
  assignedTaxAccountant: string;
  content: string;
  status: string;
  createdAt: string;
  answer?: string;
}

interface MyApplicationsResponse {
  type: "consultation" | "seminar";
  items: TrainingSeminarApplication[] | ConsultationApiResponse[];
  total: number;
  page: number;
  limit: number;
  summary?: ApplicationSummary;
  isExposed?: boolean;
}

const MyPage: React.FC = () => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "applications">(
    "profile",
  );
  const [activeSubTab, setActiveSubTab] = useState<"training" | "member">(
    "training",
  );
  const [mobileView, setMobileView] = useState<
    "main" | "profile" | "applications"
  >("main");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [applicationSummary, setApplicationSummary] =
    useState<ApplicationSummary>({
      seminarTotal: 0,
      consultationTotal: 0,
      total: 0,
    });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Newsletter subscription status
  const [newsletterSubscribed, setNewsletterSubscribed] =
    useState<boolean>(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

  // Withdrawal (탈퇴) related state
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [showWithdrawPassword, setShowWithdrawPassword] = useState(false);
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [withdrawPasswordError, setWithdrawPasswordError] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Training/Seminar applications
  const [trainingApplications, setTrainingApplications] = useState<
    TrainingSeminarApplication[]
  >([]);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<
    "today" | "7days" | "15days" | "1month" | "6months"
  >("7days");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [trainingPage, setTrainingPage] = useState(1);
  const [trainingTotal, setTrainingTotal] = useState(0);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Consultation applications
  const [consultationApplications, setConsultationApplications] = useState<
    ConsultationApplication[]
  >([]);
  const [consultationLoading, setConsultationLoading] = useState(false);
  const [consultationPage, setConsultationPage] = useState(1);
  const [consultationTotal, setConsultationTotal] = useState(0);
  const [selectedConsultation, setSelectedConsultation] =
    useState<ConsultationApplication | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 회원정보 수정 관련 상태
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [showPasswordVerify, setShowPasswordVerify] = useState(false);
  const [passwordVerify, setPasswordVerify] = useState("");
  const [passwordVerifyError, setPasswordVerifyError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // 모바일 드롭다운 상태
  const [isEmailDomainDropdownOpen, setIsEmailDomainDropdownOpen] =
    useState(false);

  // 회원정보 수정 폼 상태
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    emailDomain: "",
    phoneNumber: "",
  });
  const [emailDomainSelect, setEmailDomainSelect] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 비밀번호 변경 폼 상태
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 휴대폰 번호 변경 관련 상태
  const [showChangePhoneForm, setShowChangePhoneForm] = useState(false);
  const [phoneChangeForm, setPhoneChangeForm] = useState({
    phoneNumber: "",
  });
  const [phoneChangeError, setPhoneChangeError] = useState("");
  const [isRequestingVerification, setIsRequestingVerification] =
    useState(false);
  const [isVerificationRequested, setIsVerificationRequested] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [isChangingPhone, setIsChangingPhone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // 타이머 효과
  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isTimerActive, timeLeft]);

  // URL 쿼리 파라미터에서 탭 읽기
  const tabFromQuery = router.query.tab as string;
  const validTabs = ["profile", "applications"];
  const initialTab =
    tabFromQuery && validTabs.includes(tabFromQuery) ? tabFromQuery : "profile";

  useEffect(() => {
    if (tabFromQuery && validTabs.includes(tabFromQuery)) {
      setActiveTab(tabFromQuery as "profile" | "applications");
    }
  }, [tabFromQuery]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await get<UserProfile>(API_ENDPOINTS.AUTH.ME);

      if (response.error) {
        // 인증 오류인 경우 로그인 페이지로 리다이렉트
        if (response.status === 401 || response.status === 403) {
          // Clear any stored tokens
          localStorage.removeItem("accessToken");
          // Redirect to login
          router.push("/login");
          return;
        } else {
          setError(response.error);
        }
      } else if (response.data) {
        setUserProfile(response.data);
      } else {
        // 데이터가 없으면 로그아웃 처리
        localStorage.removeItem("accessToken");
        router.push("/login");
        return;
      }
    } catch (err) {
      // 오류 발생 시 로그아웃 처리
      localStorage.removeItem("accessToken");
      router.push("/login");
      return;
    } finally {
      setLoading(false);
    }
  };

  // Fetch newsletter subscription status
  const fetchNewsletterStatus = async () => {
    try {
      const response = await get<{
        email?: string;
        isSubscribed: boolean;
        subscriptionLabel?: string;
        isExposed?: boolean;
      }>(API_ENDPOINTS.NEWSLETTER.ME);

      if (response.error) {
        // If error, default to not subscribed
        setNewsletterSubscribed(false);
      } else if (response.data) {
        // Use isSubscribed as the single source of truth
        const isSubscribed = response.data.isSubscribed === true;
        setNewsletterSubscribed(isSubscribed);
      } else {
        setNewsletterSubscribed(false);
      }
    } catch (err) {
      // On error, default to not subscribed
      setNewsletterSubscribed(false);
    } finally {
    }
  };

  // Handle newsletter unsubscribe
  const handleNewsletterUnsubscribe = async () => {
    // Show confirm dialog
    const confirmed = window.confirm("뉴스레터 구독을 해제하시겠습니까?");
    if (!confirmed) {
      return;
    }

    setIsUnsubscribing(true);
    try {
      const response = await post(API_ENDPOINTS.NEWSLETTER.ME_UNSUBSCRIBE);

      if (response.error) {
        alert(response.error || "구독 해제에 실패했습니다.");
        return;
      }

      // On success: Update UI state immediately
      setNewsletterSubscribed(false);
      alert("뉴스레터 구독이 해제되었습니다.");
    } catch (err) {
      alert("구독 해제 중 오류가 발생했습니다.");
    } finally {
      setIsUnsubscribing(false);
    }
  };

  // Handle withdrawal (탈퇴하기) - Step 1: Show confirmation
  const handleWithdrawClick = () => {
    setShowWithdrawConfirm(true);
  };

  // Handle withdrawal confirmation - Step 2: Show password input
  const handleWithdrawConfirm = () => {
    setShowWithdrawConfirm(false);
    setShowWithdrawPassword(true);
    setWithdrawPassword("");
    setWithdrawPasswordError("");
  };

  // Handle withdrawal cancel
  const handleWithdrawCancel = () => {
    setShowWithdrawConfirm(false);
    setShowWithdrawPassword(false);
    setWithdrawPassword("");
    setWithdrawPasswordError("");
  };

  // Handle withdrawal - Step 3: API call
  const handleWithdrawSubmit = async () => {
    if (!withdrawPassword) {
      setWithdrawPasswordError("비밀번호를 입력해주세요.");
      return;
    }

    setIsWithdrawing(true);
    setWithdrawPasswordError("");

    try {
      // Call DELETE /auth/me with password in body
      const response = await del<{ success?: boolean }>(
        API_ENDPOINTS.AUTH.WITHDRAW,
        {
          body: { password: withdrawPassword },
        },
      );

      if (response.error) {
        // Check if password is incorrect
        if (response.status === 400 || response.status === 401) {
          setWithdrawPasswordError("비밀번호가 일치하지 않습니다.");
        } else {
          setWithdrawPasswordError(
            response.error || "탈퇴 처리 중 오류가 발생했습니다.",
          );
        }
        return;
      }

      // On success: Clear auth tokens, reset state, redirect to login
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("autoLogin");
      localStorage.removeItem("user");

      // Show success message
      alert("탈퇴가 완료되었습니다.");

      // Redirect to login
      router.push("/");
    } catch (err) {
      setWithdrawPasswordError("탈퇴 처리 중 오류가 발생했습니다.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Initial auth check
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      // No token, redirect to login immediately
      router.push("/login");
      return;
    }
    
    // Token exists, fetch user profile
    fetchUserProfile();
    fetchNewsletterStatus(); // Fetch newsletter status on page load
  }, []);

  // API 응답을 UI 형식으로 변환하는 함수
  const mapConsultationResponse = (
    item: ConsultationApiResponse,
  ): ConsultationApplication => {
    // 날짜 포맷 변환 (ISO -> YYYY.MM.DD)
    const formatDate = (dateStr: string): string => {
      try {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}.${month}.${day}`;
      } catch {
        return dateStr;
      }
    };

    // API status를 UI status로 변환
    const mapStatus = (
      status: string,
    ): "completed" | "received" | "pending" | "waiting" => {
      const statusMap: Record<
        string,
        "completed" | "received" | "pending" | "waiting"
      > = {
        COMPLETED: "completed",
        RECEIVED: "received",
        PENDING: "pending",
        WAITING: "waiting",
        // 소문자 버전도 지원
        completed: "completed",
        received: "received",
        pending: "pending",
        waiting: "waiting",
      };
      return statusMap[status] || "pending";
    };

    return {
      id: item.id,
      date: formatDate(item.createdAt),
      content: item.content,
      field: item.consultingField,
      consultant: item.assignedTaxAccountant,
      status: mapStatus(item.status),
      reply: item.answer,
    };
  };

  // 날짜 형식 변환: "YYYY. MM. DD" -> "YYYY-MM-DD"
  const convertDateToApiFormat = (dateStr: string): string => {
    if (!dateStr) return "";
    // "2025. 05. 19" -> "2025-05-19"
    return dateStr.replace(/\.\s*/g, "-").replace(/\s+/g, "");
  };

  // API 호출을 위한 쿼리 파라미터 빌더
  const buildQueryParams = (
    type: "seminar" | "consultation",
    page: number,
    limit: number = 20,
    startDateParam?: string,
    endDateParam?: string,
  ): string => {
    const params = new URLSearchParams();
    params.append("type", type);
    params.append("page", page.toString());
    params.append("limit", limit.toString());

    if (startDateParam) {
      params.append("startDate", convertDateToApiFormat(startDateParam));
    }
    if (endDateParam) {
      params.append("endDate", convertDateToApiFormat(endDateParam));
    }

    return params.toString();
  };

  // 모집 마감일까지 남은 일수 계산 (교육 페이지와 동일한 로직)
  const getDaysUntilDeadline = (endDate: string) => {
    const today = new Date();
    const deadline = new Date(endDate);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // 마감일 라벨 생성 함수
  const getDeadlineLabel = (item: TrainingSeminarApplication) => {
    if (!item.recruitmentEndDate) {
      // Fallback to old label if recruitmentEndDate is not available
      return item.deadlineLabel;
    }

    const daysLeft = getDaysUntilDeadline(item.recruitmentEndDate);
    
    if (daysLeft > 1) {
      return `신청마감 D-${daysLeft}`;
    } else if (daysLeft === 1) {
      return '신청마감 D-day';
    } else {
      return '신청마감';
    }
  };

  // 마감일 경과 여부 확인 (dimmed 스타일 적용용)
  const isDeadlinePassed = (item: TrainingSeminarApplication) => {
    if (!item.recruitmentEndDate) {
      return false;
    }
    const daysLeft = getDaysUntilDeadline(item.recruitmentEndDate);
    return daysLeft === 0;
  };

  // 세미나/교육 신청 내역 조회
  const fetchSeminarApplications = async (
    page: number = 1,
    startDateParam?: string,
    endDateParam?: string,
  ) => {
    try {
      setTrainingLoading(true);
      const queryString = buildQueryParams(
        "seminar",
        page,
        20,
        startDateParam,
        endDateParam,
      );
      const response = await get<MyApplicationsResponse>(
        `${API_ENDPOINTS.AUTH.MY_APPLICATIONS}?${queryString}`,
      );

      if (response.error) {
        if (response.status === 401 || response.status === 403) {
          setTrainingApplications([]);
          setTrainingTotal(0);
        } else {
          console.error("세미나 신청 내역을 불러오는 중 오류:", response.error);
        }
      } else if (response.data) {
        const { items = [], total = 0 } = response.data;
        setTrainingApplications((items as TrainingSeminarApplication[]) || []);
        setTrainingTotal(total);
      } else {
        setTrainingApplications([]);
        setTrainingTotal(0);
      }
    } catch (err) {
      console.error("세미나 신청 내역을 불러오는 중 오류:", err);
      setTrainingApplications([]);
      setTrainingTotal(0);
    } finally {
      setTrainingLoading(false);
    }
  };

  // 상담 신청 내역 조회
  const fetchConsultationApplications = async (
    page: number = 1,
    startDateParam?: string,
    endDateParam?: string,
  ) => {
    try {
      setConsultationLoading(true);
      const queryString = buildQueryParams(
        "consultation",
        page,
        20,
        startDateParam,
        endDateParam,
      );
      const response = await get<MyApplicationsResponse>(
        `${API_ENDPOINTS.AUTH.MY_APPLICATIONS}?${queryString}`,
      );

      if (response.error) {
        if (response.status === 401 || response.status === 403) {
          setConsultationApplications([]);
          setConsultationTotal(0);
        } else {
          console.error("상담 신청 내역을 불러오는 중 오류:", response.error);
        }
      } else if (response.data) {
        const { items = [], total = 0 } = response.data;
        const consultationItems = (items as ConsultationApiResponse[]) || [];
        const mappedConsultations = consultationItems.map(
          mapConsultationResponse,
        );
        setConsultationApplications(mappedConsultations);
        setConsultationTotal(total);
      } else {
        setConsultationApplications([]);
        setConsultationTotal(0);
      }
    } catch (err) {
      console.error("상담 신청 내역을 불러오는 중 오류:", err);
      setConsultationApplications([]);
      setConsultationTotal(0);
    } finally {
      setConsultationLoading(false);
    }
  };

  // 검색 버튼 클릭 핸들러
  const handleSearch = (type: "seminar" | "consultation") => {
    // 페이지를 1로 리셋
    if (type === "seminar") {
      setTrainingPage(1);
      fetchSeminarApplications(1, startDate, endDate);
    } else {
      setConsultationPage(1);
      fetchConsultationApplications(1, startDate, endDate);
    }
  };

  useEffect(() => {
    const fetchAllApplications = async () => {
      try {
        // Fetch both seminar and consultation applications separately
        const [seminarResponse, consultationResponse] = await Promise.all([
          get<MyApplicationsResponse>(
            `${API_ENDPOINTS.AUTH.MY_APPLICATIONS}?type=seminar&page=1&limit=20`,
          ),
          get<MyApplicationsResponse>(
            `${API_ENDPOINTS.AUTH.MY_APPLICATIONS}?type=consultation&page=1&limit=20`,
          ),
        ]);

        // Handle seminar response
        if (seminarResponse.error) {
          if (
            seminarResponse.status === 401 ||
            seminarResponse.status === 403
          ) {
            setTrainingApplications([]);
            setTrainingTotal(0);
          } else {
            console.error(
              "세미나 신청 내역을 불러오는 중 오류:",
              seminarResponse.error,
            );
          }
        } else if (seminarResponse.data) {
          const { items = [], total = 0 } = seminarResponse.data;
          setTrainingApplications(
            (items as TrainingSeminarApplication[]) || [],
          );
          setTrainingTotal(total);
        } else {
          setTrainingApplications([]);
          setTrainingTotal(0);
        }

        // Handle consultation response
        if (consultationResponse.error) {
          if (
            consultationResponse.status === 401 ||
            consultationResponse.status === 403
          ) {
            setConsultationApplications([]);
            setConsultationTotal(0);
          } else {
            console.error(
              "상담 신청 내역을 불러오는 중 오류:",
              consultationResponse.error,
            );
          }
        } else if (consultationResponse.data) {
          const { items = [], total = 0 } = consultationResponse.data;
          const consultationItems = (items as ConsultationApiResponse[]) || [];
          const mappedConsultations = consultationItems.map(
            mapConsultationResponse,
          );
          setConsultationApplications(mappedConsultations);
          setConsultationTotal(total);
        } else {
          setConsultationApplications([]);
          setConsultationTotal(0);
        }

        // Calculate summary from totals
        const seminarTotal = seminarResponse.data?.total || 0;
        const consultationTotal = consultationResponse.data?.total || 0;
        setApplicationSummary({
          seminarTotal,
          consultationTotal,
          total: seminarTotal + consultationTotal,
        });
      } catch (err) {
        // 오류 발생 시 기본값 사용
        setApplicationSummary({
          seminarTotal: 0,
          consultationTotal: 0,
          total: 0,
        });
        console.error("신청 내역을 불러오는 중 오류:", err);
      }
    };

    fetchAllApplications();
  }, []);

  // 날짜 필터 계산
  useEffect(() => {
    const today = new Date();
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}. ${month}. ${day}`;
    };

    let start: Date;
    switch (dateFilter) {
      case "today":
        start = new Date(today);
        break;
      case "7days":
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        break;
      case "15days":
        start = new Date(today);
        start.setDate(today.getDate() - 15);
        break;
      case "1month":
        start = new Date(today);
        start.setMonth(today.getMonth() - 1);
        break;
      case "6months":
        start = new Date(today);
        start.setMonth(today.getMonth() - 6);
        break;
      default:
        start = new Date(today);
        start.setDate(today.getDate() - 7);
    }

    setStartDate(formatDate(start));
    setEndDate(formatDate(today));
  }, [dateFilter]);

  // 데이터는 fetchAllApplications에서 이미 가져옴

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as "profile" | "applications");
    router.replace(`/my?tab=${tabId}`, undefined, { shallow: true });
  };

  const handleSummaryCardClick = (subTab: "training" | "member") => {
    setActiveTab("applications");
    setActiveSubTab(subTab);
    router.replace(`/my?tab=applications`, undefined, { shallow: true });
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("autoLogin");
    localStorage.removeItem("user");
    router.push("/login");
  };

  // 비밀번호 확인 핸들러
  const handlePasswordVerify = async () => {
    if (!passwordVerify) {
      setPasswordVerifyError("비밀번호를 입력해주세요.");
      return;
    }

    setIsVerifying(true);
    setPasswordVerifyError("");

    // 비밀번호 확인 성공 후 회원정보 수정 화면 표시
    const proceedWithVerification = () => {
      setIsPasswordVerified(true);
      setShowPasswordVerify(false);
      setPasswordVerify("");
      setPasswordVerifyError("");

      // 현재 사용자 정보로 폼 초기화
      const emailParts = displayProfile.email?.split("@") || ["", ""];
      let phoneNumber = "";

      if (displayProfile.phoneNumber) {
        phoneNumber = displayProfile.phoneNumber;
      }

      setEditForm({
        name: displayProfile.name || "",
        email: emailParts[0] || "",
        emailDomain: emailParts[1] || "",
        phoneNumber: phoneNumber,
      });
    };

    try {
      // Use /auth/verify-password API (Authorization header is automatically added by post function)
      const response = await post(API_ENDPOINTS.AUTH.VERIFY_PASSWORD, {
        password: passwordVerify,
      });

      if (response.error) {
        // On failure: Show error message
        setPasswordVerifyError("비밀번호가 일치하지 않습니다.");
        return;
      }

      // On success: Allow access to the member info edit page
      // Do NOT refresh or reissue tokens
      proceedWithVerification();
    } catch (err) {
      setPasswordVerifyError("비밀번호 확인 중 오류가 발생했습니다.");
    } finally {
      setIsVerifying(false);
    }
  };

  // 회원정보 수정 저장 핸들러
  const handleSaveProfile = async () => {
    setIsSaving(true);

    try {
      const email = editForm.emailDomain
        ? `${editForm.email}@${editForm.emailDomain}`
        : editForm.email;

      // 휴대폰 번호에서 하이픈 제거하여 숫자만 전송
      const phoneNumberOnly = editForm.phoneNumber
        ? editForm.phoneNumber.replace(/\D/g, "")
        : "";

      const response = await patch(API_ENDPOINTS.AUTH.PROFILE, {
        name: editForm.name,
        email: email,
        phoneNumber: phoneNumberOnly,
      });

      if (response.error) {
        alert("회원정보 수정에 실패했습니다: " + response.error);
        return;
      }

      // 성공 시 사용자 정보 새로고침
      const profileResponse = await get<UserProfile>(API_ENDPOINTS.AUTH.ME);
      if (profileResponse.data) {
        setUserProfile(profileResponse.data);
      }

      setIsPasswordVerified(false);
      setShowPasswordVerify(false);
      setShowChangePasswordForm(false);
      alert("회원정보가 수정되었습니다.");
    } catch (err) {
      alert("회원정보 수정 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 비밀번호 변경 핸들러
  const handleChangePassword = async () => {
    // 유효성 검사
    const errors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    if (!passwordForm.currentPassword) {
      errors.currentPassword = "현재 비밀번호를 입력해주세요.";
    }
    if (!passwordForm.newPassword) {
      errors.newPassword = "새 비밀번호를 입력해주세요.";
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = "비밀번호는 8자 이상이어야 합니다.";
    }
    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = "새 비밀번호 확인을 입력해주세요.";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = "비밀번호가 일치하지 않습니다.";
    }

    if (
      errors.currentPassword ||
      errors.newPassword ||
      errors.confirmPassword
    ) {
      setPasswordErrors(errors);
      return;
    }

    setIsChangingPassword(true);
    setPasswordErrors({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    try {
      const response = await patch(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        newPasswordConfirm: passwordForm.confirmPassword,
      });

      if (response.error) {
        setPasswordErrors({
          currentPassword: response.error,
          newPassword: "",
          confirmPassword: "",
        });
        return;
      }

      setShowChangePasswordForm(false);
      setIsPasswordVerified(false);
      setShowPasswordVerify(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      alert("비밀번호가 변경되었습니다.");
    } catch (err) {
      alert("비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // 휴대폰 번호 포맷팅 함수 (하이픈 자동 추가)
  const formatPhoneNumber = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/\D/g, "");
    // 11자리 제한
    const limited = numbers.slice(0, 11);

    // 하이픈 자동 추가
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 7) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(
        7,
      )}`;
    }
  };

  // 휴대폰 번호 변경 핸들러
  const handleRequestPhoneVerification = async () => {
    setPhoneChangeError("");
    setVerificationError("");

    if (!phoneChangeForm.phoneNumber) {
      setPhoneChangeError("휴대폰 번호를 입력해주세요.");
      return;
    }

    // Strip non-numeric characters from phoneNumber before sending
    const phoneNumberOnly = phoneChangeForm.phoneNumber.replace(/\D/g, "");

    // 숫자만으로 10자리 또는 11자리인지 확인
    if (phoneNumberOnly.length < 10 || phoneNumberOnly.length > 11) {
      setPhoneChangeError("올바른 휴대폰번호 양식을 입력해주세요.");
      return;
    }

    setIsRequestingVerification(true);
    try {
      const response = await post(API_ENDPOINTS.AUTH.PHONE_SEND, {
        phone: phoneNumberOnly,
      });

      if (response.error) {
        setPhoneChangeError(
          response.error || "인증번호 발송에 실패했습니다. 다시 시도해주세요.",
        );
        return;
      }

      // On send success: Start/reset 5-minute timer and move to verification step
      setIsVerificationRequested(true);
      setTimeLeft(300); // 5 minutes = 300 seconds
      setIsTimerActive(true);
      setVerificationCode(""); // Clear previous code
    } catch (err) {
      setPhoneChangeError("인증번호 발송에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsRequestingVerification(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    setVerificationError("");

    if (!verificationCode) {
      setVerificationError("인증번호를 입력해주세요.");
      return;
    }

    if (!phoneChangeForm.phoneNumber) {
      setVerificationError("휴대폰 번호를 먼저 입력해주세요.");
      return;
    }

    setIsVerifyingCode(true);
    try {
      // Strip non-numeric characters from phone number before sending
      const phoneNumberOnly = phoneChangeForm.phoneNumber.replace(/\D/g, "");

      const response = await post(API_ENDPOINTS.AUTH.PHONE_VERIFY, {
        phone: phoneNumberOnly,
        code: verificationCode,
      });

      if (response.error) {
        setVerificationError(response.error);
        return;
      }

      // On verify success: Mark phone as verified and allow change to proceed
      setIsCodeVerified(true);
      setIsTimerActive(false);
      setVerificationError("");
    } catch (err) {
      setVerificationError("인증에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleChangePhoneNumber = async () => {
    if (!isCodeVerified) {
      return;
    }

    setIsChangingPhone(true);
    try {
      const phoneNumberOnly = phoneChangeForm.phoneNumber.replace(/\D/g, "");

      // 프로필 수정 API 호출 (휴대폰 번호만 업데이트)
      const response = await patch(API_ENDPOINTS.AUTH.PROFILE, {
        phoneNumber: phoneNumberOnly,
      });

      if (response.error) {
        alert(response.error);
        return;
      }

      await fetchUserProfile();
      setShowChangePhoneForm(false);
      setIsPasswordVerified(false);
      setShowPasswordVerify(false);
      setPhoneChangeForm({ phoneNumber: "" });
      setVerificationCode("");
      setIsVerificationRequested(false);
      setIsCodeVerified(false);
      setIsTimerActive(false);
      setTimeLeft(0);
      alert("휴대폰 번호가 변경되었습니다.");
    } catch (err) {
      alert("휴대폰 번호 변경 중 오류가 발생했습니다.");
    } finally {
      setIsChangingPhone(false);
    }
  };

  const handleRequestPhoneVerificationAgain = async () => {
    await handleRequestPhoneVerification();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleConsultationClick = (consultation: ConsultationApplication) => {
    setSelectedConsultation(consultation);
    setIsDetailModalOpen(true);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "상담완료";
      case "received":
        return "접수완료";
      case "pending":
        return "대기중";
      case "waiting":
        return "세무사 승인 대기중";
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "completed":
        return styles.statusCompleted;
      case "received":
        return styles.statusReceived;
      case "pending":
        return styles.statusPending;
      case "waiting":
        return styles.statusWaiting;
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Header variant="transparent" onMenuClick={() => setIsMenuOpen(true)} />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  // userProfile이 없으면 로그인 페이지로 리다이렉트 (loading 중이 아닐 때만)
  if (!loading && !userProfile) {
    router.push("/login");
    return null;
  }

  const displayProfile = userProfile || {
    id: 0,
    loginId: "",
    name: "",
    phoneNumber: "",
    email: "",
    memberType: "",
    provider: undefined,
    newsletterSubscribed: false,
    isApproved: false,
  };

  // Mobile back handler
  const handleMobileBack = () => {
    if (
      showPasswordVerify ||
      isPasswordVerified ||
      showChangePasswordForm ||
      showChangePhoneForm
    ) {
      setShowPasswordVerify(false);
      setIsPasswordVerified(false);
      setShowChangePasswordForm(false);
      setShowChangePhoneForm(false);
      setPasswordVerify("");
      setPasswordVerifyError("");
    }
    setMobileView("main");
  };

  // Mobile menu item click handler
  const handleMobileMenuClick = (menu: "profile" | "applications") => {
    setMobileView(menu);
    setActiveTab(menu);
  };

  return (
    <div className={styles.page}>
      <Header variant="transparent" onMenuClick={() => setIsMenuOpen(true)} />
      <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Mobile Layout */}

      <div className="container">
        {mobileView === "main" && (
          <div className={styles.headerInfo}>
            <p>My page</p>
            <h2>마이페이지</h2>
          </div>
        )}

        <div className={styles.mobileMyPage}>
          {mobileView === "main" && (
            <>
              {/* Mobile Profile Card */}
              <div className={styles.mobileProfileCard}>
                <div className={styles.mobileProfileHeader}>
                  <div className={styles.mobileProfileAvatar}>
                    <img src="/images/logo/logo_small.svg" alt="프로필" />
                  </div>
                  <div className={styles.mobileProfileInfo}>
                    <div className={styles.mobileProfileGreeting}>
                      <p className={styles.mobileProfileName}>
                        {displayProfile.name}님,
                      </p>
                      <p className={styles.mobileProfileWelcome}>
                        방문을 환영합니다
                      </p>
                    </div>
                    <div
                      onClick={handleLogout}
                      className={styles.profileLogout}
                    >
                      로그아웃
                    </div>
                  </div>
                </div>
                <div className={styles.mobileProfileDivider} />
                <div className={styles.mobileMemberTypeCard}>
                  <div className={styles.mobileMemberTypeLabel}>
                    <img
                      src="/images/common/user-icon.svg"
                      alt="회원 유형"
                      className={styles.mobileMemberTypeIcon}
                    />
                    <p>회원 유형</p>
                  </div>
                  <div className={styles.mobileMemberTypeBadge}>
                    <p>
                      {displayProfile.memberType == MemberType.GENERAL
                        ? "일반"
                        : displayProfile.memberType == MemberType.INSURANCE
                          ? "세무사 "
                          : "기타"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile Menu List */}
              <div className={styles.mobileMenuList}>
                <button
                  className={styles.mobileMenuItem}
                  onClick={() => handleMobileMenuClick("profile")}
                >
                  <span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M3 6C3 2.691 5.691 0 9 0C12.309 0 15 2.691 15 6C15 9.309 12.309 12 9 12C5.691 12 3 9.309 3 6ZM21.724 18.567L23.565 19.627L22.567 21.36L20.727 20.3C20.021 21.096 19.081 21.678 18.001 21.898V23.999H16.001V21.898C14.921 21.678 13.98 21.096 13.275 20.3L11.435 21.36L10.437 19.627L12.278 18.567C12.113 18.071 12.002 17.551 12.002 17C12.002 16.449 12.113 15.929 12.278 15.433L10.437 14.373L11.435 12.64L13.275 13.7C13.981 12.904 14.921 12.322 16.001 12.102V10.001H18.001V12.102C19.081 12.322 20.022 12.904 20.727 13.7L22.567 12.64L23.565 14.373L21.724 15.433C21.889 15.929 22 16.449 22 17C22 17.551 21.889 18.071 21.724 18.567ZM18.5 17C18.5 16.173 17.827 15.5 17 15.5C16.173 15.5 15.5 16.173 15.5 17C15.5 17.827 16.173 18.5 17 18.5C17.827 18.5 18.5 17.827 18.5 17ZM8 17C8 15.946 8.19 14.94 8.523 14H5C2.243 14 0 16.243 0 19V24H11.349C9.308 22.35 8 19.829 8 17Z"
                        fill="#C6C6C6"
                      />
                    </svg>
                    회원 정보 관리
                  </span>
                  <img src="/images/common/arrow-right-gray.svg" alt="" />
                </button>
                <button
                  className={styles.mobileMenuItem}
                  onClick={() => handleMobileMenuClick("applications")}
                >
                  <span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <g clip-path="url(#clip0_38_116374)">
                        <path
                          d="M23.553 22.139L20.887 19.473C21.585 18.492 22 17.296 22 16C22 12.686 19.314 10 16 10C12.686 10 10 12.686 10 16C10 19.314 12.686 22 16 22C17.296 22 18.492 21.585 19.473 20.887L22.139 23.553L23.553 22.139ZM16.748 18.444C16.004 19.188 14.69 19.19 13.925 18.425L11.743 16.157L13.13 14.716L15.346 17.017L18.96 13.314L20.358 14.744L16.751 18.44L16.748 18.444ZM8 16.001C8 11.59 11.589 8.001 16 8.001C17.458 8.001 18.822 8.399 20 9.083V7.001V3C20 1.346 18.654 0 17 0H3C1.345 0 0 1.347 0 3.001V24H8V23.996L15.96 23.998C11.567 23.976 8 20.399 8 16.001ZM9 5.001H16V7.001H9V5.001ZM7 17.001H4V15.001H7V17.001ZM7 12.001H4V10.001H7V12.001ZM7 7.001H4V5.001H7V7.001Z"
                          fill="#C6C6C6"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_38_116374">
                          <rect width="24" height="24" fill="white" />
                        </clipPath>
                      </defs>
                    </svg>
                    신청 내역
                  </span>
                  <img src="/images/common/arrow-right-gray.svg" alt="" />
                </button>
              </div>
            </>
          )}

          {mobileView === "profile" && (
            <>
              {/* Mobile Header with Back Button */}
              <div className={styles.mobileHeader}>
                <button
                  className={styles.mobileBackButton}
                  onClick={handleMobileBack}
                >
                  <img src="/images/common/arrow-left-white.svg" alt="뒤로" />
                </button>
                <h1 className={styles.mobileTitle}>
                  {showChangePasswordForm
                    ? "비밀번호 변경"
                    : showChangePhoneForm
                      ? "휴대폰 번호 변경"
                      : showPasswordVerify || isPasswordVerified
                        ? "회원 정보 수정"
                        : "회원 정보 관리"}
                </h1>
              </div>

              {/* Mobile Profile Info Display */}
              {!showPasswordVerify &&
                !isPasswordVerified &&
                !showChangePasswordForm &&
                !showChangePhoneForm && (
                  <div className={styles.mobileProfileContent}>
                    <div className={styles.mobileProfileForm}>
                      <div className={styles.mobileFormRow}>
                        <p className={styles.mobileFormLabel}>아이디</p>
                        <p className={styles.mobileFormValue}>
                          {displayProfile.loginId}
                        </p>
                      </div>
                      <div className={styles.mobileFormRow}>
                        <p className={styles.mobileFormLabel}>비밀번호</p>
                        <p className={styles.mobileFormValue}>**********</p>
                      </div>
                      <div className={styles.mobileFormDivider} />
                      <div className={styles.mobileFormRow}>
                        <p className={styles.mobileFormLabel}>이름</p>
                        <p className={styles.mobileFormValue}>
                          {displayProfile.name}
                        </p>
                      </div>
                      <div className={styles.mobileFormRow}>
                        <p className={styles.mobileFormLabel}>휴대폰 번호</p>
                        <p className={styles.mobileFormValue}>
                          {displayProfile.phoneNumber || "-"}
                        </p>
                      </div>
                      <div className={styles.mobileFormRow}>
                        <p className={styles.mobileFormLabel}>이메일</p>
                        <p className={styles.mobileFormValue}>
                          {displayProfile.email || "-"}
                        </p>
                      </div>
                      <div className={styles.mobileFormRow}>
                        <p className={styles.mobileFormLabel}>간편 로그인</p>
                        <p className={styles.mobileFormValue}>
                          {displayProfile.provider
                            ? displayProfile.provider === "google"
                              ? "구글(Google)"
                              : displayProfile.provider === "kakao"
                                ? "카카오(Kakao)"
                                : displayProfile.provider === "naver"
                                  ? "네이버(Naver)"
                                  : displayProfile.provider
                            : "-"}
                        </p>
                      </div>
                      <div className={styles.mobileNewsletterRow}>
                        <div className={styles.mobileNewsletterRowContent}>
                        <p className={styles.mobileFormLabel}>뉴스레터 구독</p>
                        <div
                          className={`${styles.mobileNewsletterBadge} ${
                            newsletterSubscribed
                              ? styles.mobileNewsletterBadgeSubscribed
                              : ""
                          }`}
                        >
                          <p>{newsletterSubscribed ? "구독중" : "구독안함"}</p>
                        </div>
                        </div>
                        {newsletterSubscribed && (
                          <button
                            className={styles.mobileNewsletterUnsubscribeButton}
                            onClick={handleNewsletterUnsubscribe}
                            disabled={isUnsubscribing}
                          >
                            {isUnsubscribing ? "처리 중..." : "구독해제"}
                          </button>
                        )}
                      </div>
                      <button
                        className={styles.mobileWithdrawButton}
                        onClick={handleWithdrawClick}
                      >
                        탈퇴하기
                      </button>
                      <div className={styles.mobileFormFooterDivider} />
                      <button
                        className={styles.mobileEditButton}
                        onClick={() => {
                          setShowPasswordVerify(true);
                          setPasswordVerify("");
                          setPasswordVerifyError("");
                        }}
                      >
                        회원 정보 수정
                      </button>
                    </div>
                  </div>
                )}

              {/* Mobile Password Verify */}
              {showPasswordVerify && !isPasswordVerified && (
                <div className={styles.mobilePasswordVerifySection}>
                  <div className={styles.mobilePasswordVerifyBox}>
                    <p className={styles.mobilePasswordVerifyDescription}>
                      개인정보 보호를 위해
                      <br />
                      비밀번호를 입력해 주세요
                    </p>
                    <div className={styles.mobilePasswordVerifyField}>
                      <TextField
                        variant="line"
                        label="비밀번호"
                        required
                        type="password"
                        placeholder="비밀번호를 입력해주세요"
                        value={passwordVerify}
                        onChange={setPasswordVerify}
                        error={!!passwordVerifyError}
                        errorMessage={passwordVerifyError}
                        disabled={isVerifying}
                        fullWidth
                        showPasswordToggle
                      />
                    </div>
                  </div>
                  <button
                    className={`${styles.mobilePasswordVerifyButton} ${
                      passwordVerify
                        ? styles.mobilePasswordVerifyButtonActive
                        : ""
                    }`}
                    onClick={handlePasswordVerify}
                    disabled={!passwordVerify || isVerifying}
                  >
                    확인
                  </button>
                </div>
              )}

              {/* Mobile Edit Profile Form */}
              {isPasswordVerified &&
                !showChangePasswordForm &&
                !showChangePhoneForm &&
                mobileView === "profile" && (
                  <div className={styles.mobileEditProfileSection}>
                    <div className={styles.mobileEditProfileBox}>
                      {/* 아이디 */}
                      <div className={styles.mobileEditFormField}>
                        <TextField
                          variant="line"
                          label="아이디"
                          required
                          value={displayProfile.loginId}
                          readOnly
                          disabled
                          fullWidth
                        />
                      </div>

                      {/* 비밀번호 */}
                      <div className={styles.mobileEditFormField}>
                        <div className={styles.mobileEditFormFieldRow}>
                          <TextField
                            variant="line"
                            label="비밀번호"
                            required
                            type="password"
                            value="**********"
                            readOnly
                            disabled
                            fullWidth
                          />
                          <button
                            className={styles.mobileChangeButton}
                            onClick={() => setShowChangePasswordForm(true)}
                          >
                            비밀번호 변경
                          </button>
                        </div>
                      </div>

                      {/* 이름 */}
                      <div className={styles.mobileEditFormField}>
                        <TextField
                          variant="line"
                          label="이름"
                          required
                          placeholder="이름을 입력해주세요"
                          value={editForm.name}
                          onChange={(value) =>
                            setEditForm({ ...editForm, name: value })
                          }
                          fullWidth
                        />
                      </div>

                      {/* 이메일 */}
                      <div className={styles.mobileEditFormField}>
                        <div className={styles.mobileEmailRow}>
                          <TextField
                            variant="line"
                            label="이메일"
                            required
                            type="email"
                            placeholder="이메일"
                            value={editForm.email}
                            onChange={(value) =>
                              setEditForm({ ...editForm, email: value })
                            }
                            showClear={false}
                          />
                          <span className={styles.mobileEmailAt}>@</span>
                          <TextField
                            variant="line"
                            placeholder="naver.com"
                            value={editForm.emailDomain}
                            onChange={(value) =>
                              setEditForm({ ...editForm, emailDomain: value })
                            }
                            showClear={false}
                          />
                        </div>
                      </div>

                      {/* 이메일 선택 */}
                      <div className={styles.mobileEditFormField}>
                        <div className={styles.mobileDropdownWrapper}>
                          <button
                            className={styles.mobileEmailDomainSelect}
                            onClick={() =>
                              setIsEmailDomainDropdownOpen(
                                !isEmailDomainDropdownOpen,
                              )
                            }
                          >
                            <span>{editForm.emailDomain || "이메일 선택"}</span>
                            <img
                              src="/images/common/arrow-down.svg"
                              alt=""
                              style={{
                                width: 20,
                                height: 20,
                                transform: isEmailDomainDropdownOpen
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                                transition: "transform 0.2s ease",
                              }}
                            />
                          </button>
                          {isEmailDomainDropdownOpen && (
                            <div className={styles.mobileDropdownMenu}>
                              {[
                                "naver.com",
                                "gmail.com",
                                "daum.net",
                                "hanmail.net",
                                "nate.com",
                                "직접입력",
                              ].map((domain) => (
                                <button
                                  key={domain}
                                  className={styles.mobileDropdownItem}
                                  onClick={() => {
                                    if (domain === "직접입력") {
                                      setEditForm({
                                        ...editForm,
                                        emailDomain: "",
                                      });
                                    } else {
                                      setEditForm({
                                        ...editForm,
                                        emailDomain: domain,
                                      });
                                    }
                                    setIsEmailDomainDropdownOpen(false);
                                  }}
                                >
                                  {domain}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 휴대폰 번호 */}
                      <div className={styles.mobileEditFormField}>
                        <p className={styles.mobileFormLabel}>
                          휴대폰 번호{" "}
                          <span style={{ color: "#f35064" }}>*</span>
                        </p>
                        <div className={styles.mobilePhoneRow}>
                          <TextField
                            variant="line"
                            type="tel"
                            placeholder="010-0000-0000"
                            value={editForm.phoneNumber}
                            onChange={(value) =>
                              setEditForm({ ...editForm, phoneNumber: value })
                            }
                            fullWidth
                          />
                          <button
                            className={styles.mobileChangeButton}
                            onClick={() => {
                              setShowChangePhoneForm(true);
                              setPhoneChangeForm({
                                phoneNumber: editForm.phoneNumber,
                              });
                            }}
                          >
                            휴대폰 번호 변경
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      className={styles.mobileConfirmButton}
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                    >
                      확인
                    </button>
                  </div>
                )}

              {/* Mobile Password Change Form */}
              {showChangePasswordForm && (
                <div className={styles.mobilePasswordChangeSection}>
                  <div className={styles.mobilePasswordChangeBox}>
                    <div className={styles.mobilePasswordChangeField}>
                      <TextField
                        variant="line"
                        label="현재 비밀번호"
                        required
                        type="password"
                        placeholder="현재 비밀번호를 입력해주세요"
                        value={passwordForm.currentPassword}
                        onChange={(value) =>
                          setPasswordForm({
                            ...passwordForm,
                            currentPassword: value,
                          })
                        }
                        error={!!passwordErrors.currentPassword}
                        errorMessage={passwordErrors.currentPassword}
                        fullWidth
                        showPasswordToggle
                      />
                    </div>
                    <div className={styles.mobilePasswordChangeField}>
                      <TextField
                        variant="line"
                        label="새 비밀번호"
                        required
                        type="password"
                        placeholder="새로운 비밀번호를 입력해주세요"
                        value={passwordForm.newPassword}
                        onChange={(value) =>
                          setPasswordForm({
                            ...passwordForm,
                            newPassword: value,
                          })
                        }
                        error={!!passwordErrors.newPassword}
                        errorMessage={passwordErrors.newPassword}
                        fullWidth
                        showPasswordToggle
                      />
                    </div>
                    <div className={styles.mobilePasswordChangeField}>
                      <TextField
                        variant="line"
                        label="새 비밀번호 확인"
                        required
                        type="password"
                        placeholder="새로운 비밀번호를 다시 입력해주세요"
                        value={passwordForm.confirmPassword}
                        onChange={(value) =>
                          setPasswordForm({
                            ...passwordForm,
                            confirmPassword: value,
                          })
                        }
                        error={!!passwordErrors.confirmPassword}
                        errorMessage={passwordErrors.confirmPassword}
                        fullWidth
                        showPasswordToggle
                      />
                    </div>
                  </div>
                  <button
                    className={`${styles.mobilePasswordChangeButton} ${
                      passwordForm.currentPassword &&
                      passwordForm.newPassword &&
                      passwordForm.confirmPassword
                        ? styles.mobilePasswordChangeButtonActive
                        : ""
                    }`}
                    onClick={handleChangePassword}
                    disabled={
                      !passwordForm.currentPassword ||
                      !passwordForm.newPassword ||
                      !passwordForm.confirmPassword ||
                      isChangingPassword
                    }
                  >
                    비밀번호 변경
                  </button>
                </div>
              )}

              {/* Mobile Phone Change Form */}
              {showChangePhoneForm && (
                <div className={styles.mobilePhoneChangeSection}>
                  <div className={styles.mobilePhoneChangeBox}>
                    <div className={styles.mobilePhoneChangeField}>
                      <p className={styles.mobilePhoneChangeLabel}>
                        휴대폰 번호 <span style={{ color: "#f35064" }}>*</span>
                      </p>
                      <div className={styles.mobilePhoneInputRow}>
                        <TextField
                          variant="line"
                          type="tel"
                          placeholder="휴대폰 번호를 입력해주세요"
                          value={phoneChangeForm.phoneNumber}
                          onChange={(value) =>
                            setPhoneChangeForm({
                              ...phoneChangeForm,
                              phoneNumber: value,
                            })
                          }
                          error={!!phoneChangeError}
                          errorMessage={phoneChangeError}
                          fullWidth
                        />
                        <button
                          className={styles.mobileVerifyRequestButton}
                          onClick={handleRequestPhoneVerification}
                          disabled={
                            !phoneChangeForm.phoneNumber ||
                            isRequestingVerification
                          }
                        >
                          인증 요청
                        </button>
                      </div>
                    </div>
                    {isVerificationRequested && (
                      <div className={styles.mobileVerificationField}>
                        <p className={styles.mobilePhoneChangeLabel}>
                          인증번호 <span style={{ color: "#f35064" }}>*</span>
                        </p>
                        <div className={styles.mobileVerificationInputRow}>
                          <TextField
                            variant="line"
                            type="text"
                            placeholder="인증번호 입력"
                            value={verificationCode}
                            onChange={setVerificationCode}
                            fullWidth
                            className={styles.mobileVerificationInput}
                          />
                          {timeLeft > 0 && (
                            <span className={styles.mobileVerificationTimer}>
                              {String(Math.floor(timeLeft / 60)).padStart(
                                2,
                                "0",
                              )}
                              :{String(timeLeft % 60).padStart(2, "0")}
                            </span>
                          )}
                          <button
                            className={styles.mobileVerifyCodeButton}
                            onClick={handleVerifyPhoneCode}
                            disabled={!verificationCode || isVerifyingCode}
                          >
                            {isVerifyingCode ? "확인 중..." : "인증 확인"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    className={`${styles.mobilePhoneChangeButton} ${
                      isCodeVerified ? styles.mobilePhoneChangeButtonActive : ""
                    }`}
                    onClick={handleChangePhoneNumber}
                    disabled={!isCodeVerified || isChangingPhone}
                  >
                    휴대폰 번호 변경
                  </button>
                </div>
              )}
            </>
          )}

          {mobileView === "applications" && (
            <>
              {/* Mobile Header with Back Button */}
              <div className={styles.mobileHeader}>
                <button
                  className={styles.mobileBackButton}
                  onClick={handleMobileBack}
                >
                  <img src="/images/common/arrow-left-white.svg" alt="뒤로" />
                </button>
                <h1 className={styles.mobileTitle}>신청 내역</h1>
              </div>

              {/* Mobile Tab Buttons */}
              <div className={styles.mobileApplicationTabs}>
                <button
                  className={`${styles.mobileAppTab} ${
                    activeSubTab === "training" ? styles.mobileAppTabActive : ""
                  }`}
                  onClick={() => setActiveSubTab("training")}
                >
                  교육/세미나
                </button>
                <button
                  className={`${styles.mobileAppTab} ${
                    activeSubTab === "member" ? styles.mobileAppTabActive : ""
                  }`}
                  onClick={() => setActiveSubTab("member")}
                >
                  구성원
                </button>
              </div>

              {/* Divider below tabs */}
              <div className={styles.mobileTabDivider} />

              {activeSubTab === "training" && (
                <div className={styles.mobileTrainingContent}>
                  {/* Date Filter Section */}
                  <div className={styles.mobileDateFilter}>
                    <div className={styles.mobilePeriodRow}>
                      <span className={styles.mobilePeriodLabel}>조회기간</span>
                      <div className={styles.mobilePeriodTabs}>
                        {(
                          [
                            "today",
                            "7days",
                            "15days",
                            "1month",
                            "6months",
                          ] as const
                        ).map((period) => (
                          <button
                            key={period}
                            className={`${styles.mobilePeriodTab} ${
                              dateFilter === period
                                ? styles.mobilePeriodTabActive
                                : ""
                            }`}
                            onClick={() => setDateFilter(period)}
                          >
                            {period === "today"
                              ? "오늘"
                              : period === "7days"
                                ? "7일"
                                : period === "15days"
                                  ? "15일"
                                  : period === "1month"
                                    ? "1개월"
                                    : "6개월"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={styles.mobileDateInputRow}>
                      <div style={{ position: 'relative' }}>
                        <div
                          className={styles.mobileDateInputWrapper}
                          onClick={() => {
                            setIsDatePickerOpen(true);
                          }}
                        >
                          <input
                            type="text"
                            className={styles.mobileDateInput}
                            value={startDate || "2025. 05. 19"}
                            readOnly
                          />
                          <img
                            src="/images/common/calendar-icon.svg"
                            alt=""
                            className={styles.mobileDateIcon}
                          />
                        </div>
                        {isDatePickerOpen && (
                          <DateRangePickerModal
                            isOpen={isDatePickerOpen}
                            onClose={() => setIsDatePickerOpen(false)}
                            onConfirm={(start, end) => {
                              setStartDate(start);
                              setEndDate(end);
                              setIsDatePickerOpen(false);
                            }}
                            initialStartDate={startDate}
                            initialEndDate={endDate}
                          />
                        )}
                      </div>
                      <span className={styles.mobileDateSeparator}>~</span>
                      <div
                        className={`${styles.mobileDateInputWrapper} ${styles.mobileDateInputWrapperDisabled}`}
                      >
                        <input
                          type="text"
                          className={styles.mobileDateInput}
                          value={endDate || "2025. 05. 26"}
                          readOnly
                        />
                        <img
                          src="/images/common/calendar-icon.svg"
                          alt=""
                          className={styles.mobileDateIcon}
                        />
                      </div>
                      <button
                        className={styles.mobileSearchButton}
                        onClick={() => handleSearch("seminar")}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="17"
                          height="16"
                          viewBox="0 0 17 16"
                          fill="none"
                        >
                          <path
                            d="M6.58325 12.4975C9.85098 12.4975 12.5 9.84853 12.5 6.5808C12.5 3.31307 9.85098 0.664062 6.58325 0.664062C3.31552 0.664062 0.666504 3.31307 0.666504 6.5808C0.666504 9.84853 3.31552 12.4975 6.58325 12.4975Z"
                            stroke="white"
                            stroke-width="1.33333"
                            stroke-miterlimit="10"
                          />
                          <path
                            d="M15.2093 15.2815C15.4697 15.5419 15.8918 15.5419 16.1521 15.2815C16.4125 15.0212 16.4125 14.5991 16.1521 14.3387L15.6807 14.8101L15.2093 15.2815ZM10.9253 10.0547L10.4539 10.5261L15.2093 15.2815L15.6807 14.8101L16.1521 14.3387L11.3967 9.58328L10.9253 10.0547Z"
                            fill="white"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Results Summary */}
                  <div className={styles.mobileResultsSummary}>
                    <p className={styles.mobileResultsCount}>
                      총{" "}
                      <span className={styles.mobileCountHighlight}>
                        {trainingTotal}
                      </span>
                      건
                    </p>
                    <p className={styles.mobileResultsDate}>
                      {startDate || "2025. 05. 19"} - {endDate || "2025.05.26"}
                    </p>
                  </div>

                  {/* Card Grid */}
                  {trainingLoading ? (
                    <div className={styles.loading}>로딩 중...</div>
                  ) : trainingApplications.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>신청 내역이 없습니다.</p>
                    </div>
                  ) : (
                    <div className={styles.mobileCardGrid}>
                      {trainingApplications.map((item) => (
                        <div
                          key={item.id}
                          className={`${styles.mobileEducationCard} ${isDeadlinePassed(item) ? styles.mobileCardDimmed : ''}`}
                          onClick={() =>
                            router.push(`/education/${item.seminarId}`)
                          }
                        >
                          <div className={styles.mobileCardImage}>
                            <img
                              src={
                                item.image?.url ||
                                "/images/common/default-thumbnail.jpg"
                              }
                              alt={item.name}
                            />
                          </div>
                          <div className={styles.mobileCardContent}>
                            <div className={styles.mobileCardLabels}>
                              <span className={`${styles.mobileCardLabelStatus} ${isDeadlinePassed(item) ? styles.labelGray : styles.labelRed}`}>
                                {getDeadlineLabel(item)}
                              </span>
                              <span className={styles.mobileCardLabelType}>
                                {item.typeLabel}
                              </span>
                            </div>
                            <h3 className={styles.mobileCardTitle}>
                              {item.name}
                            </h3>
                            <p className={styles.mobileCardLocation}>
                              {item.location || "온라인"}
                            </p>
                            <div className={styles.mobileCardDate}>
                              <img
                                src="/images/common/calendar-icon.svg"
                                alt=""
                              />
                              <span>{item.participationDate} 종료</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSubTab === "member" && (
                <div className={styles.mobileTrainingContent}>
                  {/* Date Filter Section */}
                  <div className={styles.mobileDateFilter}>
                    <div className={styles.mobilePeriodRow}>
                      <span className={styles.mobilePeriodLabel}>조회기간</span>
                      <div className={styles.mobilePeriodTabs}>
                        {(
                          [
                            "today",
                            "7days",
                            "15days",
                            "1month",
                            "6months",
                          ] as const
                        ).map((period) => (
                          <button
                            key={period}
                            className={`${styles.mobilePeriodTab} ${
                              dateFilter === period
                                ? styles.mobilePeriodTabActive
                                : ""
                            }`}
                            onClick={() => setDateFilter(period)}
                          >
                            {period === "today"
                              ? "오늘"
                              : period === "7days"
                                ? "7일"
                                : period === "15days"
                                  ? "15일"
                                  : period === "1month"
                                    ? "1개월"
                                    : "6개월"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={styles.mobileDateInputRow}>
                      <div style={{ position: 'relative' }}>
                        <div
                          className={styles.mobileDateInputWrapper}
                          onClick={() => {
                            setIsDatePickerOpen(true);
                          }}
                        >
                          <input
                            type="text"
                            className={styles.mobileDateInput}
                            value={startDate || "2025. 05. 19"}
                            readOnly
                          />
                          <img
                            src="/images/common/calendar-icon.svg"
                            alt=""
                            className={styles.mobileDateIcon}
                          />
                        </div>
                        {isDatePickerOpen && (
                          <DateRangePickerModal
                            isOpen={isDatePickerOpen}
                            onClose={() => setIsDatePickerOpen(false)}
                            onConfirm={(start, end) => {
                              setStartDate(start);
                              setEndDate(end);
                              setIsDatePickerOpen(false);
                            }}
                            initialStartDate={startDate}
                            initialEndDate={endDate}
                          />
                        )}
                      </div>
                      <span className={styles.mobileDateSeparator}>~</span>
                      <div
                        className={`${styles.mobileDateInputWrapper} ${styles.mobileDateInputWrapperDisabled}`}
                      >
                        <input
                          type="text"
                          className={styles.mobileDateInput}
                          value={endDate || "2025. 05. 26"}
                          readOnly
                        />
                        <img
                          src="/images/common/calendar-icon.svg"
                          alt=""
                          className={styles.mobileDateIcon}
                        />
                      </div>
                      <button
                        className={styles.mobileSearchButton}
                        onClick={() => handleSearch("consultation")}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="17"
                          height="16"
                          viewBox="0 0 17 16"
                          fill="none"
                        >
                          <path
                            d="M6.58325 12.4975C9.85098 12.4975 12.5 9.84853 12.5 6.5808C12.5 3.31307 9.85098 0.664062 6.58325 0.664062C3.31552 0.664062 0.666504 3.31307 0.666504 6.5808C0.666504 9.84853 3.31552 12.4975 6.58325 12.4975Z"
                            stroke="white"
                            stroke-width="1.33333"
                            stroke-miterlimit="10"
                          />
                          <path
                            d="M15.2093 15.2815C15.4697 15.5419 15.8918 15.5419 16.1521 15.2815C16.4125 15.0212 16.4125 14.5991 16.1521 14.3387L15.6807 14.8101L15.2093 15.2815ZM10.9253 10.0547L10.4539 10.5261L15.2093 15.2815L15.6807 14.8101L16.1521 14.3387L11.3967 9.58328L10.9253 10.0547Z"
                            fill="white"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Results Summary */}
                  <div className={styles.mobileResultsSummary}>
                    <p className={styles.mobileResultsCount}>
                      총{" "}
                      <span className={styles.mobileCountHighlight}>
                        {consultationTotal}
                      </span>
                      건
                    </p>
                    <p className={styles.mobileResultsDate}>
                      {startDate || "2025. 05. 19"} - {endDate || "2025.05.26"}
                    </p>
                  </div>

                  {consultationLoading ? (
                    <div className={styles.loading}>로딩 중...</div>
                  ) : consultationApplications.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>상담 신청 내역이 없습니다.</p>
                    </div>
                  ) : (
                    <div className={styles.mobileMemberList}>
                      {consultationApplications.map((item, index) => (
                        <React.Fragment key={item.id}>
                          <div
                            className={styles.mobileMemberCard}
                            onClick={() => handleConsultationClick(item)}
                          >
                            <div className={styles.mobileMemberCardHeader}>
                              <span className={styles.mobileMemberCardField}>
                                기장
                              </span>
                              <span
                                className={`${styles.mobileMemberCardStatus} ${
                                  item.status === "completed"
                                    ? styles.mobileMemberCardStatusCompleted
                                    : item.status === "waiting" ||
                                        item.status === "pending"
                                      ? styles.mobileMemberCardStatusWaiting
                                      : styles.mobileMemberCardStatusReceived
                                }`}
                              >
                                {getStatusLabel(item.status)}
                              </span>
                            </div>
                            <p className={styles.mobileMemberCardContent}>
                              {item.content}
                            </p>
                            <div className={styles.mobileMemberCardTags}>
                              <span className={styles.mobileMemberCardTag}>
                                담당 세무사
                              </span>
                              <span
                                className={styles.mobileMemberCardTagDivider}
                              >
                                
                              </span>
                              <span className={styles.mobileMemberCardTagValue}>
                                {item.consultant}
                              </span>
                            </div>
                            <div className={styles.mobileMemberCardFooter}>
                              <span className={styles.mobileMemberCardNo}>
                                NO.{index + 1}
                              </span>
                              <span className={styles.mobileMemberCardDivider}>
                              </span>
                              <span className={styles.mobileMemberCardDate}>
                                {item.date}
                              </span>
                            </div>
                          </div>
                          {/* <div className={styles.mobileMemberCardSeparator} /> */}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 사용자 프로필 카드 및 신청 내역 요약 */}
        <div className={styles.profileSection}>
          <div className={styles.profileCard}>
            <div className={styles.profileHeader}>
              <div className={styles.profileAvatar}>
                <img
                  src="/images/logo/logo_small.svg"
                  alt="프로필"
                  className={styles.avatarImage}
                />
              </div>
              <div className={styles.profileInfo}>
                <div className={styles.profileGreeting}>
                  <p className={styles.profileName}>{displayProfile.name}님,</p>
                  <p className={styles.profileWelcome}>방문을 환영합니다</p>
                </div>
                <div onClick={handleLogout} className={styles.profileLogout}>
                  로그아웃
                </div>
              </div>
            </div>

            {/* <div className={styles.profileDivider} /> */}
            <div className={styles.memberTypeCard}>
              <div className={styles.memberTypeLabel}>
                <img
                  src="/images/common/user-icon.svg"
                  alt="회원 유형"
                  className={styles.memberTypeIcon}
                />
                <p>회원 유형</p>
              </div>
              <div
                className={`${styles.memberTypeBadge} ${displayProfile.memberType === MemberType.INSURANCE && !displayProfile.isApproved ? styles.memberTypeBadgePending : ""}`}
              >
                <p>
                  {displayProfile.memberType == MemberType.GENERAL
                    ? "일반"
                    : displayProfile.memberType == MemberType.OTHER
                      ? "기타"
                      : displayProfile.isApproved
                        ? "세무사"
                        : "세무사 (승인 대기 중)"}
                </p>
              </div>
            </div>
          </div>

          <div className={styles.applicationSummary}>
            <p className={styles.summaryTitle}>내 신청 현황</p>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryCards}>
              <div
                className={styles.summaryCard}
                onClick={() => handleSummaryCardClick("training")}
                style={{ cursor: "pointer" }}
              >
                <p className={styles.summaryCardTitle}>교육/세미나 신청</p>
                <div className={styles.summaryCardContent}>
                  <div className={styles.summaryCount}>
                    <p>{applicationSummary.seminarTotal}건</p>
                  </div>
                  <div className={styles.summaryLink}>
                    <p>자세히보기</p>
                  </div>
                </div>
              </div>
              <div
                className={styles.summaryCard}
                onClick={() => handleSummaryCardClick("member")}
                style={{ cursor: "pointer" }}
              >
                <p className={styles.summaryCardTitle}>상담 신청</p>
                <div className={styles.summaryCardContent}>
                  <div className={styles.summaryCount}>
                    <p>{applicationSummary.consultationTotal}건</p>
                  </div>
                  <div className={styles.summaryLink}>
                    <p>자세히보기</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className={styles.tabSection}>
          <div className={styles.sidebar}>
            <div className={styles.sidebarTabs}>
              <button
                className={`${styles.sidebarTab} ${
                  activeTab === "profile" ? styles.sidebarTabActive : ""
                }`}
                onClick={() => handleTabChange("profile")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M3 6C3 2.691 5.691 0 9 0C12.309 0 15 2.691 15 6C15 9.309 12.309 12 9 12C5.691 12 3 9.309 3 6ZM21.724 18.567L23.565 19.627L22.567 21.36L20.727 20.3C20.021 21.096 19.081 21.678 18.001 21.898V23.999H16.001V21.898C14.921 21.678 13.98 21.096 13.275 20.3L11.435 21.36L10.437 19.627L12.278 18.567C12.113 18.071 12.002 17.551 12.002 17C12.002 16.449 12.113 15.929 12.278 15.433L10.437 14.373L11.435 12.64L13.275 13.7C13.981 12.904 14.921 12.322 16.001 12.102V10.001H18.001V12.102C19.081 12.322 20.022 12.904 20.727 13.7L22.567 12.64L23.565 14.373L21.724 15.433C21.889 15.929 22 16.449 22 17C22 17.551 21.889 18.071 21.724 18.567ZM18.5 17C18.5 16.173 17.827 15.5 17 15.5C16.173 15.5 15.5 16.173 15.5 17C15.5 17.827 16.173 18.5 17 18.5C17.827 18.5 18.5 17.827 18.5 17ZM8 17C8 15.946 8.19 14.94 8.523 14H5C2.243 14 0 16.243 0 19V24H11.349C9.308 22.35 8 19.829 8 17Z"
                    fill="#C6C6C6"
                  />
                </svg>
                <span>회원 정보 관리</span>
                <svg
                  className={styles.arrowIcon}
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M7.25 15.25L12.75 10.25L7.25 5.25"
                    stroke="#1d1d1d"
                    stroke-width="1.3"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
              <button
                className={`${styles.sidebarTab} ${
                  activeTab === "applications" ? styles.sidebarTabActive : ""
                }`}
                onClick={() => handleTabChange("applications")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <g clip-path="url(#clip0_38_116374)">
                    <path
                      d="M23.553 22.139L20.887 19.473C21.585 18.492 22 17.296 22 16C22 12.686 19.314 10 16 10C12.686 10 10 12.686 10 16C10 19.314 12.686 22 16 22C17.296 22 18.492 21.585 19.473 20.887L22.139 23.553L23.553 22.139ZM16.748 18.444C16.004 19.188 14.69 19.19 13.925 18.425L11.743 16.157L13.13 14.716L15.346 17.017L18.96 13.314L20.358 14.744L16.751 18.44L16.748 18.444ZM8 16.001C8 11.59 11.589 8.001 16 8.001C17.458 8.001 18.822 8.399 20 9.083V7.001V3C20 1.346 18.654 0 17 0H3C1.345 0 0 1.347 0 3.001V24H8V23.996L15.96 23.998C11.567 23.976 8 20.399 8 16.001ZM9 5.001H16V7.001H9V5.001ZM7 17.001H4V15.001H7V17.001ZM7 12.001H4V10.001H7V12.001ZM7 7.001H4V5.001H7V7.001Z"
                      fill="#C6C6C6"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_38_116374">
                      <rect width="24" height="24" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
                <span>신청 내역</span>
                <svg
                  className={styles.arrowIcon}
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M7.25 15.25L12.75 10.25L7.25 5.25"
                    stroke="#1D1D1D"
                    stroke-width="1.3"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className={styles.content}>
            {activeTab === "profile" && (
              <div className={styles.profileContent}>
                {!showPasswordVerify &&
                  !isPasswordVerified &&
                  !showChangePasswordForm && (
                    <>
                      <h2 className={styles.contentTitle}>회원 정보 관리</h2>
                      <div className={styles.profileForm}>
                        <div className={styles.profileFormContent}>
                          <div className={styles.formRow}>
                            <p className={styles.formLabel}>아이디</p>
                            <p className={styles.formValue}>
                              {displayProfile.loginId}
                            </p>
                          </div>
                          <div className={styles.formRow}>
                            <p className={styles.formLabel}>비밀번호</p>
                            <p className={styles.formValue}>**********</p>
                          </div>
                          <div className={styles.formDivider} />
                          <div className={styles.formRow}>
                            <p className={styles.formLabel}>이름</p>
                            <p className={styles.formValue}>
                              {displayProfile.name}
                            </p>
                          </div>
                          <div className={styles.formRow}>
                            <p className={styles.formLabel}>휴대폰 번호</p>
                            <p className={styles.formValue}>
                              {displayProfile.phoneNumber || "-"}
                            </p>
                          </div>
                          <div className={styles.formRow}>
                            <p className={styles.formLabel}>이메일</p>
                            <p className={styles.formValue}>
                              {displayProfile.email || "-"}
                            </p>
                          </div>
                          <div className={styles.formRow}>
                            <p className={styles.formLabel}>간편 로그인</p>
                            <p className={styles.formValue}>
                              {displayProfile.provider
                                ? displayProfile.provider === "google"
                                  ? "구글(Google)"
                                  : displayProfile.provider === "kakao"
                                    ? "카카오(Kakao)"
                                    : displayProfile.provider === "naver"
                                      ? "네이버(Naver)"
                                      : displayProfile.provider
                                : "-"}
                            </p>
                          </div>
                          <div className={styles.newsletterRow}>
                            <p className={styles.formLabel}>뉴스레터 구독</p>
                            <div
                              className={`${styles.newsletterBadge} ${
                                newsletterSubscribed
                                  ? styles.newsletterBadgeSubscribed
                                  : ""
                              }`}
                            >
                              <p>
                                {newsletterSubscribed ? "구독중" : "구독안함"}
                              </p>
                            </div>
                            {newsletterSubscribed && (
                              <button
                                className={styles.newsletterUnsubscribeButton}
                                onClick={handleNewsletterUnsubscribe}
                                disabled={isUnsubscribing}
                              >
                                {isUnsubscribing ? "처리 중..." : "구독해제"}
                              </button>
                            )}
                          </div>
                          <button
                            className={styles.withdrawButton}
                            onClick={handleWithdrawClick}
                          >
                            탈퇴하기
                          </button>
                          <div className={styles.formDivider} />
                        </div>
                        <button
                          className={styles.editButton}
                          onClick={() => {
                            setShowPasswordVerify(true);
                            setPasswordVerify("");
                            setPasswordVerifyError("");
                          }}
                        >
                          회원 정보 수정
                        </button>
                      </div>
                    </>
                  )}

                {showPasswordVerify &&
                  !isPasswordVerified &&
                  !showChangePasswordForm &&
                  !showChangePhoneForm && (
                    <>
                      <h2 className={styles.contentTitle}>회원 정보 수정</h2>
                      <div className={styles.passwordVerifySection}>
                        <div className={styles.passwordVerifyForm}>
                          <p className={styles.passwordVerifyDescription}>
                            개인정보 보호를 위해
                            <br />
                            비밀번호를 입력해 주세요
                          </p>
                          <div className={styles.passwordVerifyField}>
                            <TextField
                              variant="line"
                              label="비밀번호"
                              required
                              type="password"
                              placeholder="비밀번호를 입력해주세요"
                              value={passwordVerify}
                              onChange={setPasswordVerify}
                              error={!!passwordVerifyError}
                              errorMessage={passwordVerifyError}
                              disabled={isVerifying}
                              fullWidth
                              showPasswordToggle
                            />
                          </div>
                        </div>

                        <button
                          className={`${styles.passwordVerifyButton} ${
                            passwordVerify
                              ? styles.passwordVerifyButtonActive
                              : ""
                          }`}
                          onClick={handlePasswordVerify}
                          disabled={!passwordVerify || isVerifying}
                        >
                          {isVerifying ? "확인 중..." : "확인"}
                        </button>
                      </div>
                    </>
                  )}

                {isPasswordVerified &&
                  !showChangePasswordForm &&
                  !showChangePhoneForm && (
                    <>
                      <h2 className={styles.contentTitle}>회원 정보 수정</h2>
                      <div className={styles.editProfileForm}>
                        {/* 아이디 */}
                        <div className={styles.editFormField}>
                          <TextField
                            variant="line"
                            label="아이디"
                            required
                            value={displayProfile.loginId}
                            readOnly
                            disabled
                            fullWidth
                          />
                        </div>

                        {/* 비밀번호 */}
                        <div className={styles.editFormField}>
                          <div className={styles.editFormFieldRow}>
                            <TextField
                              variant="line"
                              label="비밀번호"
                              required
                              type="password"
                              value="**********"
                              readOnly
                              disabled
                              fullWidth
                            />
                            <button
                              className={styles.changePasswordButton}
                              onClick={() => {
                                setShowChangePasswordForm(true);
                              }}
                            >
                              비밀번호 변경
                            </button>
                          </div>
                        </div>

                        {/* 이름 */}
                        <div className={styles.editFormField}>
                          <TextField
                            variant="line"
                            label="이름"
                            required
                            placeholder="이름을 입력해주세요"
                            value={editForm.name}
                            onChange={(value) =>
                              setEditForm({ ...editForm, name: value })
                            }
                            fullWidth
                          />
                        </div>

                        {/* 이메일 */}
                        <div className={styles.editFormField}>
                          <div className={styles.emailFieldRow}>
                            <TextField
                              variant="line"
                              label="이메일"
                              required
                              type="email"
                              placeholder="이메일을 입력해주세요"
                              value={editForm.email}
                              onChange={(value) =>
                                setEditForm({ ...editForm, email: value })
                              }
                              className={styles.emailInput}
                              showClear={false}
                            />
                            <span className={styles.emailAt}>@</span>
                            <TextField
                              variant="line"
                              type="email"
                              placeholder="이메일 도메인"
                              value={editForm.emailDomain}
                              onChange={(value) =>
                                setEditForm({ ...editForm, emailDomain: value })
                              }
                              className={styles.emailDomainInput}
                              showClear={false}
                            />
                            <div className={styles.emailDomainSelectWrapper}>
                              <button
                                className={styles.emailDomainSelect}
                                onClick={() =>
                                  setEmailDomainSelect(!emailDomainSelect)
                                }
                              >
                                {editForm.emailDomain || "이메일 선택"}
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className={`${styles.selectArrow} ${
                                    emailDomainSelect
                                      ? styles.selectArrowOpen
                                      : ""
                                  }`}
                                >
                                  <path
                                    d="M7.5 5L12.5 10L7.5 15"
                                    stroke="#F0F0F0"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                              {emailDomainSelect && (
                                <div className={styles.emailDomainDropdown}>
                                  {[
                                    "naver.com",
                                    "gmail.com",
                                    "daum.net",
                                    "kakao.com",
                                  ].map((domain) => (
                                    <button
                                      key={domain}
                                      className={styles.emailDomainOption}
                                      onClick={() => {
                                        setEditForm({
                                          ...editForm,
                                          emailDomain: domain,
                                        });
                                        setEmailDomainSelect(false);
                                      }}
                                    >
                                      {domain}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 휴대폰 번호 */}
                        <div className={styles.editFormField}>
                          <div className={styles.editFormFieldLabel}>
                            <p className={styles.formLabel}>휴대폰 번호</p>
                            <p className={styles.formRequired}>*</p>
                          </div>
                          <div className={styles.phoneFieldRow}>
                            <TextField
                              variant="line"
                              type="tel"
                              placeholder="010-0000-0000"
                              value={editForm.phoneNumber}
                              onChange={(value) =>
                                setEditForm({ ...editForm, phoneNumber: value })
                              }
                              className={styles.phoneNumberInput}
                              fullWidth
                            />
                            <button
                              className={styles.changePasswordButton}
                              onClick={() => {
                                setShowChangePhoneForm(true);
                                setPhoneChangeForm({
                                  phoneNumber: editForm.phoneNumber,
                                });
                                setPhoneChangeError("");
                                setIsVerificationRequested(false);
                                setVerificationCode("");
                                setIsCodeVerified(false);
                                setIsTimerActive(false);
                                setTimeLeft(0);
                              }}
                            >
                              휴대폰 번호 변경
                            </button>
                          </div>
                        </div>
                      </div>
                      <button
                        className={styles.passwordVerifyButton}
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                      >
                        {isSaving ? "저장 중..." : "확인"}
                      </button>
                    </>
                  )}

                {showChangePhoneForm && (
                  <>
                    <h2 className={styles.contentTitle}>휴대폰 번호 변경</h2>
                    <div className={styles.changePasswordSection}>
                      <div className={styles.changePasswordForm}>
                        {/* 휴대폰 번호 입력 */}
                        <div className={styles.phoneChangeField}>
                          <div className={styles.editFormFieldLabel}>
                            <p className={styles.formLabel}>휴대폰 번호</p>
                            <p className={styles.formRequired}>*</p>
                          </div>
                          <div className={styles.phoneChangeInputRow}>
                            <TextField
                              variant="line"
                              type="tel"
                              placeholder="010-1234-5678"
                              value={phoneChangeForm.phoneNumber}
                              onChange={(value) => {
                                const formatted = formatPhoneNumber(value);
                                setPhoneChangeForm({
                                  ...phoneChangeForm,
                                  phoneNumber: formatted,
                                });
                                setPhoneChangeError("");
                              }}
                              className={styles.phoneNumberInput}
                              disabled={isVerificationRequested}
                              error={!!phoneChangeError}
                              fullWidth
                            />
                            {!isVerificationRequested ? (
                              <button
                                className={`${styles.changePasswordButton} ${
                                  phoneChangeForm.phoneNumber &&
                                  !phoneChangeError
                                    ? styles.changePasswordButtonActive
                                    : ""
                                }`}
                                onClick={handleRequestPhoneVerification}
                                disabled={
                                  !phoneChangeForm.phoneNumber ||
                                  !!phoneChangeError ||
                                  isRequestingVerification
                                }
                              >
                                {isRequestingVerification
                                  ? "요청 중..."
                                  : "인증 요청"}
                              </button>
                            ) : (
                              <button
                                className={styles.changePasswordButton}
                                onClick={handleRequestPhoneVerificationAgain}
                                disabled={isRequestingVerification}
                              >
                                인증 재요청
                              </button>
                            )}
                          </div>
                          {phoneChangeError && (
                            <div className={styles.phoneChangeError}>
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
                                  stroke="#F35064"
                                  strokeMiterlimit="10"
                                />
                                <path
                                  d="M8 5V8.5"
                                  stroke="#F35064"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M8 11.5C8.41421 11.5 8.75 11.1642 8.75 10.75C8.75 10.3358 8.41421 10 8 10C7.58579 10 7.25 10.3358 7.25 10.75C7.25 11.1642 7.58579 11.5 8 11.5Z"
                                  fill="#F35064"
                                />
                              </svg>
                              {phoneChangeError}
                            </div>
                          )}
                        </div>

                        {/* 인증번호 입력 */}
                        {isVerificationRequested && (
                          <div className={styles.phoneChangeField}>
                            <div className={styles.editFormFieldLabel}>
                              <p className={styles.formLabel}>인증번호</p>
                              <p className={styles.formRequired}>*</p>
                            </div>
                            <div className={styles.verificationCodeRow}>
                              <TextField
                                variant="line"
                                type="text"
                                placeholder="인증번호 입력"
                                value={verificationCode}
                                onChange={(value) => {
                                  setVerificationCode(value);
                                  setVerificationError("");
                                }}
                                className={styles.verificationCodeInput}
                                error={!!verificationError}
                                disabled={isCodeVerified}
                                fullWidth
                              />
                              {isTimerActive && (
                                <span className={styles.timer}>
                                  {formatTime(timeLeft)}
                                </span>
                              )}
                              <button
                                className={`${styles.changePasswordButton} ${
                                  verificationCode && !isCodeVerified
                                    ? styles.verifyCodeButtonActive
                                    : ""
                                }`}
                                onClick={handleVerifyPhoneCode}
                                disabled={
                                  !verificationCode ||
                                  isCodeVerified ||
                                  isVerifyingCode ||
                                  !isTimerActive
                                }
                              >
                                {isVerifyingCode ? "확인 중..." : "인증 확인"}
                              </button>
                            </div>
                            {verificationError && (
                              <div className={styles.phoneChangeError}>
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
                                    stroke="#F35064"
                                    strokeMiterlimit="10"
                                  />
                                  <path
                                    d="M8 5V8.5"
                                    stroke="#F35064"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M8 11.5C8.41421 11.5 8.75 11.1642 8.75 10.75C8.75 10.3358 8.41421 10 8 10C7.58579 10 7.25 10.3358 7.25 10.75C7.25 11.1642 7.58579 11.5 8 11.5Z"
                                    fill="#F35064"
                                  />
                                </svg>
                                {verificationError}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        className={`${styles.passwordVerifyButton} ${
                          isCodeVerified
                            ? styles.passwordVerifyButtonActive
                            : ""
                        }`}
                        onClick={handleChangePhoneNumber}
                        disabled={!isCodeVerified || isChangingPhone}
                      >
                        {isChangingPhone ? "변경 중..." : "휴대폰 번호 변경"}
                      </button>
                    </div>
                  </>
                )}

                {showChangePasswordForm && (
                  <>
                    <h2 className={styles.contentTitle}>비밀번호 변경</h2>
                    <div className={styles.changePasswordSection}>
                      <div className={styles.changePasswordForm}>
                        <div className={styles.passwordField}>
                          <TextField
                            variant="line"
                            label="현재 비밀번호"
                            required
                            type="password"
                            placeholder="현재 비밀번호를 입력해주세요"
                            value={passwordForm.currentPassword}
                            onChange={(value) => {
                              setPasswordForm({
                                ...passwordForm,
                                currentPassword: value,
                              });
                              setPasswordErrors({
                                ...passwordErrors,
                                currentPassword: "",
                              });
                            }}
                            error={!!passwordErrors.currentPassword}
                            errorMessage={passwordErrors.currentPassword}
                            disabled={isChangingPassword}
                            fullWidth
                            showPasswordToggle
                          />
                        </div>
                        <div className={styles.passwordField}>
                          <TextField
                            variant="line"
                            label="새 비밀번호"
                            required
                            type="password"
                            placeholder="새로운 비밀번호를 입력해주세요"
                            value={passwordForm.newPassword}
                            onChange={(value) => {
                              setPasswordForm({
                                ...passwordForm,
                                newPassword: value,
                              });
                              setPasswordErrors({
                                ...passwordErrors,
                                newPassword: "",
                              });
                            }}
                            error={!!passwordErrors.newPassword}
                            errorMessage={passwordErrors.newPassword}
                            disabled={isChangingPassword}
                            fullWidth
                            showPasswordToggle
                          />
                        </div>
                        <div className={styles.passwordField}>
                          <TextField
                            variant="line"
                            label="새 비밀번호 확인"
                            required
                            type="password"
                            placeholder="새로운 비밀번호를 다시 입력해주세요"
                            value={passwordForm.confirmPassword}
                            onChange={(value) => {
                              setPasswordForm({
                                ...passwordForm,
                                confirmPassword: value,
                              });
                              setPasswordErrors({
                                ...passwordErrors,
                                confirmPassword: "",
                              });
                            }}
                            error={!!passwordErrors.confirmPassword}
                            errorMessage={passwordErrors.confirmPassword}
                            disabled={isChangingPassword}
                            fullWidth
                            showPasswordToggle
                          />
                        </div>
                      </div>
                      <button
                        className={`${styles.passwordVerifyButton} ${
                          passwordForm.currentPassword &&
                          passwordForm.newPassword &&
                          passwordForm.confirmPassword
                            ? styles.changePasswordSubmitButtonActive
                            : ""
                        }`}
                        onClick={handleChangePassword}
                        disabled={
                          !passwordForm.currentPassword ||
                          !passwordForm.newPassword ||
                          !passwordForm.confirmPassword ||
                          isChangingPassword
                        }
                      >
                        {isChangingPassword ? "변경 중..." : "비밀번호 변경"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "applications" && (
              <div className={styles.applicationsContent}>
                <h2 className={styles.contentTitle}>신청 내역</h2>
                <div className={styles.subTabSection}>
                  <div className={styles.subTabs}>
                    <button
                      className={`${styles.subTab} ${
                        activeSubTab === "training" ? styles.subTabActive : ""
                      }`}
                      onClick={() => setActiveSubTab("training")}
                    >
                      <span>교육/세미나</span>
                    </button>
                    <button
                      className={`${styles.subTab} ${
                        activeSubTab === "member" ? styles.subTabActive : ""
                      }`}
                      onClick={() => setActiveSubTab("member")}
                    >
                      <span>상담신청</span>
                    </button>
                  </div>
                  <div className={styles.subTabContent}>
                    {activeSubTab === "training" && (
                      <div className={styles.trainingContent}>
                        <div className={styles.filterSection}>
                          <div className={styles.filterRow}>
                            <div className={styles.filterLeft}>
                              <p className={styles.filterLabel}>조회기간</p>
                              <div className={styles.periodButtons}>
                                {(
                                  [
                                    "today",
                                    "7days",
                                    "15days",
                                    "1month",
                                    "6months",
                                  ] as const
                                ).map((period) => (
                                  <button
                                    key={period}
                                    className={`${styles.periodButton} ${
                                      dateFilter === period
                                        ? styles.periodButtonActive
                                        : ""
                                    }`}
                                    onClick={() => setDateFilter(period)}
                                  >
                                    {period === "today"
                                      ? "오늘"
                                      : period === "7days"
                                        ? "7일"
                                        : period === "15days"
                                          ? "15일"
                                          : period === "1month"
                                            ? "1개월"
                                            : "6개월"}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className={styles.filterRight}>
                              <div style={{ position: 'relative' }}>
                                <div
                                  className={styles.dateInput}
                                  onClick={() => {
                                    setIsDatePickerOpen(true);
                                  }}
                                >
                                  <p>{startDate || "2025. 05. 19"}</p>
                                  <img
                                    src="/images/common/calendar-icon.svg"
                                    alt="달력"
                                    className={styles.calendarIcon}
                                  />
                                </div>
                                {isDatePickerOpen && (
                                  <DateRangePickerModal
                                    isOpen={isDatePickerOpen}
                                    onClose={() => setIsDatePickerOpen(false)}
                                    onConfirm={(start, end) => {
                                      setStartDate(start);
                                      setEndDate(end);
                                      setIsDatePickerOpen(false);
                                    }}
                                    initialStartDate={startDate}
                                    initialEndDate={endDate}
                                  />
                                )}
                              </div>
                              <p className={styles.dateSeparator}>~</p>
                              <div
                                className={`${styles.dateInput} ${styles.dateInputDisabled}`}
                              >
                                <p>{endDate || "2025. 05. 26"}</p>
                                <img
                                  src="/images/common/calendar-icon.svg"
                                  alt="달력"
                                  className={styles.calendarIcon}
                                />
                              </div>
                              <button
                                className={styles.searchButton}
                                onClick={() => handleSearch("seminar")}
                              >
                                <img
                                  src="/images/common/search-icon.svg"
                                  alt="검색"
                                  className={styles.searchIcon}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className={styles.trainingList}>
                          <div className={styles.listHeader}>
                            <div className={styles.listHeaderLeft}>
                              <p>
                                총{" "}
                                <span className={styles.countHighlight}>
                                  {trainingTotal}
                                </span>
                                건
                              </p>
                            </div>
                            <div className={styles.listHeaderRight}>
                              <img
                                src="/images/common/calendar-icon.svg"
                                alt="달력"
                                className={styles.calendarIcon}
                              />
                              <p>
                                {startDate} - {endDate}
                              </p>
                            </div>
                          </div>
                          {trainingLoading ? (
                            <div className={styles.loading}>로딩 중...</div>
                          ) : trainingApplications.length === 0 ? (
                            <div className={styles.emptyState}>
                              <p>신청 내역이 없습니다.</p>
                            </div>
                          ) : (
                            <div className={styles.trainingGrid}>
                              {trainingApplications.map((item) => (
                                <div
                                  key={item.id}
                                  className={`${styles.educationCard} ${isDeadlinePassed(item) ? styles.cardDimmed : ''}`}
                                  onClick={() =>
                                    router.push(`/education/${item.seminarId}`)
                                  }
                                >
                                  <div className={styles.cardImage}>
                                    <img
                                      src={
                                        item.image?.url ||
                                        "/images/common/default-thumbnail.jpg"
                                      }
                                      alt={item.name}
                                    />
                                  </div>
                                  <div className={styles.cardContent}>
                                    <div className={styles.cardLabels}>
                                      <span className={`${styles.labelStatus} ${isDeadlinePassed(item) ? styles.labelGray : styles.labelRed}`}>
                                        {getDeadlineLabel(item)}
                                      </span>
                                      <span className={styles.labelType}>
                                        {item.typeLabel}
                                      </span>
                                    </div>
                                    <h3 className={styles.cardTitle}>
                                      {item.name}
                                    </h3>
                                    <div className={styles.cardInfo}>
                                      <p className={styles.cardLocation}>
                                        {item.location || "-"}
                                      </p>
                                      <div className={styles.cardDateWrapper}>
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="16"
                                          height="20"
                                          viewBox="0 0 16 20"
                                          fill="none"
                                        >
                                          <path
                                            d="M2.61621 10.2082V4.3087C2.61621 3.82755 3.00626 3.4375 3.48741 3.4375H12.833C13.3142 3.4375 13.7042 3.82755 13.7042 4.3087V16.1077C13.7042 16.5889 13.3142 16.9789 12.833 16.9789H3.48759C3.00637 16.9789 2.61629 16.5888 2.61639 16.1075L2.61781 9.15537"
                                            stroke="#555555"
                                            stroke-width="0.8"
                                            stroke-miterlimit="10"
                                          />
                                          <path
                                            d="M13.7042 7.53125H2.61621"
                                            stroke="#555555"
                                            stroke-width="0.8"
                                            stroke-miterlimit="10"
                                          />
                                          <path
                                            d="M5.61328 1.57812V5.10393"
                                            stroke="#555555"
                                            stroke-width="0.8"
                                            stroke-miterlimit="10"
                                          />
                                          <path
                                            d="M10.7041 1.57812V5.10393"
                                            stroke="#555555"
                                            stroke-width="0.8"
                                            stroke-miterlimit="10"
                                          />
                                        </svg>
                                        <p className={styles.cardDate}>
                                          {item.participationDate}{" "}
                                          {item.participationTime}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {activeSubTab === "member" && (
                      <div className={styles.memberContent}>
                        <div className={styles.filterSection}>
                          <div className={styles.filterRow}>
                            <div className={styles.filterLeft}>
                              <p className={styles.filterLabel}>조회기간</p>
                              <div className={styles.periodButtons}>
                                {(
                                  [
                                    "today",
                                    "7days",
                                    "15days",
                                    "1month",
                                    "6months",
                                  ] as const
                                ).map((period) => (
                                  <button
                                    key={period}
                                    className={`${styles.periodButton} ${
                                      dateFilter === period
                                        ? styles.periodButtonActive
                                        : ""
                                    }`}
                                    onClick={() => setDateFilter(period)}
                                  >
                                    {period === "today"
                                      ? "오늘"
                                      : period === "7days"
                                        ? "7일"
                                        : period === "15days"
                                          ? "15일"
                                          : period === "1month"
                                            ? "1개월"
                                            : "6개월"}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className={styles.filterRight}>
                              <div style={{ position: 'relative' }}>
                                <div
                                  className={styles.dateInput}
                                  onClick={() => {
                                    setIsDatePickerOpen(true);
                                  }}
                                >
                                  <p>{startDate || "2025. 05. 19"}</p>
                                  <img
                                    src="/images/common/calendar-icon.svg"
                                    alt="달력"
                                    className={styles.calendarIcon}
                                  />
                                </div>
                                {isDatePickerOpen && (
                                  <DateRangePickerModal
                                    isOpen={isDatePickerOpen}
                                    onClose={() => setIsDatePickerOpen(false)}
                                    onConfirm={(start, end) => {
                                      setStartDate(start);
                                      setEndDate(end);
                                      setIsDatePickerOpen(false);
                                    }}
                                    initialStartDate={startDate}
                                    initialEndDate={endDate}
                                  />
                                )}
                              </div>
                              <p className={styles.dateSeparator}>~</p>
                              <div
                                className={`${styles.dateInput} ${styles.dateInputDisabled}`}
                              >
                                <p>{endDate || "2025. 05. 26"}</p>
                                <img
                                  src="/images/common/calendar-icon.svg"
                                  alt="달력"
                                  className={styles.calendarIcon}
                                />
                              </div>
                              <button
                                className={styles.searchButton}
                                onClick={() => handleSearch("consultation")}
                              >
                                <img
                                  src="/images/common/search-icon.svg"
                                  alt="검색"
                                  className={styles.searchIcon}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className={styles.listHeader}>
                          <div className={styles.listHeaderLeft}>
                            <p>
                              총{" "}
                              <span className={styles.countHighlight}>
                                {consultationTotal}
                              </span>
                              건
                            </p>
                          </div>
                          <div className={styles.listHeaderRight}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
  <path d="M2.61621 8.51552V3.73839C2.61621 3.25724 3.00626 2.86719 3.48741 2.86719H12.833C13.3142 2.86719 13.7042 3.25724 13.7042 3.73839V13.2927C13.7042 13.7738 13.3142 14.1639 12.833 14.1639H3.48762C3.00639 14.1639 2.61631 13.7737 2.61643 13.2924L2.61781 7.63721" stroke="#555555" stroke-width="0.8" stroke-miterlimit="10"/>
  <path d="M13.7042 6.28125H2.61621" stroke="#555555" stroke-width="0.8" stroke-miterlimit="10"/>
  <path d="M5.61328 1.3125V4.25383" stroke="#555555" stroke-width="0.8" stroke-miterlimit="10"/>
  <path d="M10.7041 1.3125V4.25383" stroke="#555555" stroke-width="0.8" stroke-miterlimit="10"/>
</svg>
                            <p>
                              {startDate || "2025. 05. 19"} -{" "}
                              {endDate || "2025. 05. 26"}
                            </p>
                          </div>
                        </div>
                        <div className={styles.consultationTable}>
                          <div className={styles.tableHeader}>
                            <div className={styles.tableRow}>
                              <p
                                className={styles.tableCell}
                                style={{ width: "80px" }}
                              >
                                No.
                              </p>
                              <p
                                className={styles.tableCell}
                                style={{ width: "100px" }}
                              >
                                날짜
                              </p>
                              <p
                                className={styles.tableCell}
                                style={{ flex: 1 }}
                              >
                                내용
                              </p>
                              <p
                                className={styles.tableCell}
                                style={{ width: "80px" }}
                              >
                                분야
                              </p>
                              <p
                                className={styles.tableCell}
                                style={{ width: "80px" }}
                              >
                                담당 세무사
                              </p>
                              <p
                                className={styles.tableCell}
                                style={{ width: "80px" }}
                              >
                                진행상태
                              </p>
                            </div>
                          </div>
                          <div className={styles.tableBody}>
                            {consultationLoading ? (
                              <div className={styles.loading}>로딩 중...</div>
                            ) : consultationApplications.length === 0 ? (
                              <div className={styles.emptyState}>
                                <p>상담 신청 내역이 없습니다.</p>
                              </div>
                            ) : (
                              consultationApplications.map((item, index) => (
                                <React.Fragment key={item.id}>
                                  <div
                                    className={styles.tableRow}
                                    onClick={() =>
                                      handleConsultationClick(item)
                                    }
                                    style={{ cursor: "pointer" }}
                                  >
                                    <p
                                      className={styles.tableCell}
                                      style={{ width: "80px" }}
                                    >
                                      {String(index + 1).padStart(2, "0")}
                                    </p>
                                    <p
                                      className={styles.tableCell}
                                      style={{ width: "100px" }}
                                    >
                                      {item.date}
                                    </p>
                                    <p
                                      className={styles.tableCell}
                                      style={{ flex: 1 }}
                                    >
                                      {item.content}
                                    </p>
                                    <p
                                      className={styles.tableCell}
                                      style={{ width: "80px" }}
                                    >
                                      {item.field}
                                    </p>
                                    <p
                                      className={styles.tableCell}
                                      style={{ width: "80px" }}
                                    >
                                      {item.consultant}
                                    </p>
                                    <div
                                      className={styles.tableCell}
                                      style={{ width: "80px" }}
                                    >
                                      <span
                                        className={`${
                                          styles.statusBadge
                                        } ${getStatusClass(item.status)}`}
                                      >
                                        {getStatusLabel(item.status)}
                                      </span>
                                    </div>
                                  </div>
                                  {index <
                                    consultationApplications.length - 1 && (
                                    <div className={styles.tableDivider} />
                                  )}
                                </React.Fragment>
                              ))
                            )}
                          </div>
                        </div>
                        {consultationTotal > 0 && (
                          <div className={styles.pagination}>
                            <button
                              className={styles.paginationButton}
                              disabled={consultationPage === 1}
                            >
                              &lt;&lt;
                            </button>
                            <button
                              className={styles.paginationButton}
                              disabled={consultationPage === 1}
                            >
                              &lt;
                            </button>
                            <button
                              className={`${styles.paginationButton} ${styles.paginationButtonActive}`}
                            >
                              {consultationPage}
                            </button>
                            <button
                              className={styles.paginationButton}
                              disabled={
                                consultationTotal <= consultationPage * 10
                              }
                            >
                              &gt;
                            </button>
                            <button
                              className={styles.paginationButton}
                              disabled={
                                consultationTotal <= consultationPage * 10
                              }
                            >
                              &gt;&gt;
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 탈퇴 확인 모달 */}
      {showWithdrawConfirm && (
        <div className={styles.modalOverlay} onClick={handleWithdrawCancel}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <button
                className={styles.modalClose}
                onClick={handleWithdrawCancel}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.withdrawConfirmMessage}>
                정말로 탈퇴하시겠습니까?
                <br />
                탈퇴 시 계정은 복구할 수 없습니다.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.modalCancelButton}
                onClick={handleWithdrawCancel}
              >
                취소
              </button>
              <button
                className={styles.modalConfirmButton}
                onClick={handleWithdrawConfirm}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 탈퇴 비밀번호 입력 모달 */}
      {showWithdrawPassword && (
        <div className={styles.modalOverlay} onClick={handleWithdrawCancel}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <button
                className={styles.modalClose}
                onClick={handleWithdrawCancel}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.withdrawPasswordField}>
                <TextField
                  variant="line"
                  label="비밀번호 입력"
                  required
                  type="password"
                  placeholder="비밀번호를 입력해주세요"
                  value={withdrawPassword}
                  onChange={setWithdrawPassword}
                  error={!!withdrawPasswordError}
                  errorMessage={withdrawPasswordError}
                  disabled={isWithdrawing}
                  fullWidth
                  showPasswordToggle
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.modalCancelButton}
                onClick={handleWithdrawCancel}
                disabled={isWithdrawing}
              >
                취소
              </button>
              <button
                className={styles.modalConfirmButton}
                onClick={handleWithdrawSubmit}
                disabled={!withdrawPassword || isWithdrawing}
              >
                {isWithdrawing ? "처리 중..." : "확인"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />

      {/* 상담 상세보기 모달 */}
      {isDetailModalOpen && selectedConsultation && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <button
                className={styles.modalClose}
                onClick={() => setIsDetailModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalStatusRow}>
                <span className={styles.statusLeft}>기장</span>
                <p className={styles.modalDate}>{selectedConsultation.date}</p>
              </div>

              <div className={styles.modalStatusRow2}>
                <p className={styles.modalDateTitle}>
                  {selectedConsultation.date} 상담 신청 내용
                </p>

                <span
                  className={`${styles.statusBadge} ${getStatusClass(
                    selectedConsultation.status,
                  )}`}
                >
                  {getStatusLabel(selectedConsultation.status)}
                </span>
              </div>

              <div className={styles.modalMainContent}>
                <p className={styles.modalDescription}>
                  {selectedConsultation.content}
                </p>
              </div>
              <div className={styles.modalConsultantCard}>
                <div className={styles.consultantInfo}>
                  <p className={styles.consultantLabel}>담당 세무사</p>
                </div>
                <p className={styles.consultantName}>
                  {selectedConsultation.consultant}
                </p>
              </div>
              {selectedConsultation.reply && (
                <div className={styles.modalReplySection}>
                  <div className={styles.modalReplyHeader}>
                    <div className={styles.modalReplyHeaderImage}>
                      <img src="/images/logo/logo_small.svg" alt="" />
                    </div>
                    <h3 className={styles.modalReplyTitle}>답변</h3>
                  </div>
                  <div className={styles.modalReplyDivider} />

                  <p className={styles.modalReplyContent}>
                    {selectedConsultation.reply}
                  </p>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.modalConfirmButton}
                onClick={() => setIsDetailModalOpen(false)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default MyPage;
