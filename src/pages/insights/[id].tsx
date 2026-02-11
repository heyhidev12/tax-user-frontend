import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import "@toast-ui/editor/dist/toastui-editor-viewer.css";
import Header from "@/components/common/Header";
import Menu from "@/components/Menu";
import Footer from "@/components/Footer";
import FloatingButton from "@/components/common/FloatingButton";
import Button from "@/components/common/Button";
import Icon from "@/components/common/Icon";
import SEO from "@/components/common/SEO";
import { SEO_CONFIG } from "@/lib/seo";
import { get as getClient, post, del } from "@/lib/api";
import { get } from "@/lib/api-server";
import { API_ENDPOINTS, API_BASE_URL } from "@/config/api";
import styles from "./detail.module.scss";

const Viewer = dynamic(
  () => import("@toast-ui/react-editor").then((mod) => mod.Viewer),
  { ssr: false },
);

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

interface Attachment {
  id: number;
  name: string;
  originalName: string;
  url?: string;
}

interface PdfFile {
  url: string;
}

export interface InsightDetail {
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
  viewCount?: number;
  attachments?: Attachment[];
  files?: any[];
  authorName?: string;
  subMinorCategory?: { id: number; name: string };
}

interface InsightNavigation {
  id: number;
  title: string;
}

interface CommentMember {
  id: number;
  name?: string;
  loginId?: string;
}

interface Comment {
  id: number;
  body: string;
  authorName?: string;
  memberId?: number;
  authorId?: number;
  userId?: number;
  member?: CommentMember;
  createdAt: string;
  createdAtFormatted?: string;
  isHidden?: boolean;
  isReported?: boolean;
  isMine?: boolean;
}

interface CommentsResponse {
  items: Comment[];
  total: number;
}

interface InsightDetailPageProps {
  insight: InsightDetail | null;
  error: string | null;
}

const InsightDetailPage: React.FC<InsightDetailPageProps> = ({
  insight: initialInsight,
  error: initialError,
}) => {
  const router = useRouter();
  const { id } = router.query;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [insight, setInsight] = useState<InsightDetail | null>(initialInsight);
  const [prevInsight, setPrevInsight] = useState<InsightNavigation | null>(null);
  const [nextInsight, setNextInsight] = useState<InsightNavigation | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentTotal, setCommentTotal] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id?: number;
    name?: string;
    loginId?: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchInsightData = async () => {
      try {
        const response = await getClient<InsightDetail>(
          `${API_ENDPOINTS.INSIGHTS}/${id}`
        );
        if (response.data) {
          setInsight(response.data);
          setError(null);
        }
      } catch (err) {
        setError('Failed to load insight');
      }
    };

    if (insight?.id !== Number(id)) {
      fetchInsightData();
    }
  }, [id]);

  useEffect(() => {
    if (!id || !insight) return;

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      setIsAuthenticated(!!token);

      if (token) {
        fetchCurrentUser();
      }
    }

    if (insight.enableComments) {
      const token = typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
      if (token) {
        fetchCurrentUser().then((user) => fetchComments(user));
      } else {
        fetchComments(null);
      }
    }

    if (typeof window !== "undefined") {
      post(`${API_ENDPOINTS.INSIGHTS}/${id}/increment-view`).catch(() => { });
    }

    setPrevInsight(null);
    setNextInsight(null);

    (async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('category');
        const subcategoryId = urlParams.get('sub');
        const subMinorCategoryId = urlParams.get('subMinor');
        const searchQuery = urlParams.get('search') || '';

        let memberType = null;
        let isApproved = null;
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem("accessToken");
          const userStr = localStorage.getItem("user");
          if (token && userStr) {
            try {
              const user = JSON.parse(userStr);
              memberType = user.memberType || null;
              if (memberType === 'INSURANCE') {
                isApproved = user.isApproved || null;
              }
            } catch (e) { }
          }
        }

        const params = new URLSearchParams();
        params.append('page', '1');
        params.append('limit', '1000');

        const targetCategoryId = categoryId || (insight?.category?.id ? String(insight.category.id) : '');
        if (targetCategoryId && targetCategoryId !== 'newsletter') {
          params.append('categoryId', targetCategoryId);
        }

        if (subcategoryId && subcategoryId !== '0') {
          params.append('subcategoryId', subcategoryId);
        }

        if (subMinorCategoryId) {
          params.append('subMinorCategoryId', subMinorCategoryId);
        }

        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim());
        }

        if (memberType) {
          params.append('memberType', memberType);
        } else {
          params.append('memberType', 'null');
        }

        if (isApproved !== null) {
          params.append('isApproved', String(isApproved));
        }

        const navResponse = await getClient<{ items: InsightDetail[]; total: number }>(
          `${API_ENDPOINTS.INSIGHTS}?${params.toString()}`,
        );

        if (navResponse.data && navResponse.data.items) {
          const items = navResponse.data.items;
          const currentIndex = items.findIndex(
            (item) => item.id === Number(id),
          );

          if (currentIndex >= 0) {
            if (currentIndex > 0) {
              setPrevInsight({
                id: items[currentIndex - 1].id,
                title: items[currentIndex - 1].title,
              });
            }

            if (currentIndex < items.length - 1) {
              setNextInsight({
                id: items[currentIndex + 1].id,
                title: items[currentIndex + 1].title,
              });
            }
          }
        }
      } catch (err) { }
    })();
  }, [id, insight]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  const formatDateTime = (
    dateString?: string,
    timeZone: string = "Asia/Seoul",
  ) => {
    if (!dateString) return "";

    const parts = new Intl.DateTimeFormat("ko-KR", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(dateString));

    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";

    return `${get("year")}.${get("month")}.${get("day")} ${get("hour")}:${get("minute")}`;
  };

  const handleBackToList = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const query: Record<string, string> = {};

    const category = urlParams.get('category');
    const sub = urlParams.get('sub');
    const search = urlParams.get('search');

    if (category) {
      query.category = category;
    } else if (insight?.category?.id) {
      query.category = String(insight.category.id);
    }

    // sub=0 bo'lsa ham qo'shamiz
    if (sub) {
      query.sub = sub;
    } else if (insight?.subcategory?.id !== undefined) {
      query.sub = String(insight.subcategory.id);
    }

    if (search) {
      query.search = search;
    }

    router.push({
      pathname: "/insights",
      query: query
    });
  };

  const handlePrevClick = () => {
    if (prevInsight && prevInsight.id) {
      const currentUrl = new URL(window.location.href);
      const queryParams = new URLSearchParams(currentUrl.search);
      const query: Record<string, string> = {};

      queryParams.forEach((value, key) => {
        query[key] = value;
      });

      router.push({
        pathname: `/insights/${prevInsight.id}`,
        query: query
      });
    }
  };

  const handleNextClick = () => {
    if (nextInsight && nextInsight.id) {
      const currentUrl = new URL(window.location.href);
      const queryParams = new URLSearchParams(currentUrl.search);
      const query: Record<string, string> = {};

      queryParams.forEach((value, key) => {
        query[key] = value;
      });

      router.push({
        pathname: `/insights/${nextInsight.id}`,
        query: query
      });
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
    const title = insight?.title || "인사이트";
    const text = `${title} - 세무 상담`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        return;
      } catch (err) { }
    }

    try {
      await navigator.clipboard.writeText(url);
      alert("링크가 클립보드에 복사되었습니다.");
    } catch (err) {
      alert("공유를 지원하지 않는 브라우저입니다.");
    }
  };

  const handleDownload = async (attachmentId: number, fileName: string) => {
    try {
      const headers: HeadersInit = {};
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const downloadUrl = `${API_BASE_URL}/attachments/${attachmentId}/download`;
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let finalFileName = fileName;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (fileNameMatch && fileNameMatch[1]) {
          finalFileName = fileNameMatch[1].replace(/['"]/g, '');
        }
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = finalFileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      alert("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  const fetchCurrentUser = async (): Promise<{
    id?: number;
    name?: string;
    loginId?: string;
  } | null> => {
    try {
      const response = await get<{ id: number; name: string; loginId: string }>(
        API_ENDPOINTS.AUTH.ME,
      );

      if (response.data) {
        setCurrentUser(response.data);
        return response.data;
      } else {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            const userInfo = {
              id: user.id,
              name: user.name,
              loginId: user.loginId,
            };
            setCurrentUser(userInfo);
            return userInfo;
          } catch (e) {
            return null;
          }
        }
        return null;
      }
    } catch (err) {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const userInfo = {
            id: user.id,
            name: user.name,
            loginId: user.loginId,
          };
          setCurrentUser(userInfo);
          return userInfo;
        } catch (e) {
          return null;
        }
      }
      return null;
    }
  };

  const fetchComments = async (
    user?: { id?: number; name?: string; loginId?: string } | null,
  ) => {
    if (!id) return;

    const userToCompare = user !== undefined ? user : currentUser;

    try {
      const response = await get<CommentsResponse>(
        `${API_ENDPOINTS.INSIGHTS}/${id}/comments`,
      );

      if (response.data) {
        const commentsWithIsMine = (response.data.items || []).map(
          (comment) => {
            if (comment.isMine === true) {
              return comment;
            }

            if (userToCompare && userToCompare.id) {
              let isMyComment = false;

              if (comment.member?.id) {
                isMyComment = comment.member.id === userToCompare.id;
              }

              if (!isMyComment && comment.memberId) {
                isMyComment = comment.memberId === userToCompare.id;
              }

              if (!isMyComment && (comment.authorId || comment.userId)) {
                isMyComment =
                  comment.authorId === userToCompare.id ||
                  comment.userId === userToCompare.id;
              }

              if (
                !isMyComment &&
                comment.authorName &&
                (userToCompare.name || userToCompare.loginId)
              ) {
                isMyComment =
                  comment.authorName === userToCompare.name ||
                  comment.authorName === userToCompare.loginId;
              }

              return { ...comment, isMine: isMyComment };
            }

            return { ...comment, isMine: false };
          },
        );

        setComments(commentsWithIsMine);
        setCommentTotal(response.data.total || 0);
      }
    } catch (err) { }
  };

  const handleSubmitComment = async () => {
    if (!id || !commentText.trim() || isSubmittingComment) return;

    if (!isAuthenticated) {
      if (
        confirm(
          "댓글을 작성하려면 로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?",
        )
      ) {
        router.push("/login");
      }
      return;
    }

    setIsSubmittingComment(true);
    try {
      const response = await post<Comment>(
        `${API_ENDPOINTS.INSIGHTS}/${id}/comments`,
        { body: commentText.trim() },
      );

      if (response.data) {
        const newComment = response.data;
        setCommentText("");

        const newCommentWithIsMine: Comment = {
          ...newComment,
          isMine: true,
        };

        setComments((prevComments) => [...prevComments, newCommentWithIsMine]);
        setCommentTotal((prevTotal) => prevTotal + 1);
      } else if (response.error) {
        if (response.status === 401) {
          alert("로그인이 필요합니다.");
          router.push("/login");
        } else {
          alert(response.error);
        }
      }
    } catch (err) {
      alert("댓글 작성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!id || !confirm("댓글을 삭제하시겠습니까?")) return;

    if (!isAuthenticated) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      const response = await del(
        `${API_ENDPOINTS.INSIGHTS}/${id}/comments/${commentId}`,
      );

      if (!response.error) {
        await fetchComments(currentUser);
      } else {
        if (response.status === 401) {
          alert("로그인이 필요합니다.");
          router.push("/login");
        } else if (response.status === 403) {
          alert("본인의 댓글만 삭제할 수 있습니다.");
        } else {
          alert(response.error);
        }
      }
    } catch (err) {
      alert("댓글 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleReportComment = async (commentId: number) => {
    if (!id || !confirm("이 댓글을 신고하시겠습니까?")) return;

    if (!isAuthenticated) {
      if (
        confirm(
          "댓글을 신고하려면 로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?",
        )
      ) {
        router.push("/login");
      }
      return;
    }

    try {
      const response = await post(
        `${API_ENDPOINTS.INSIGHTS}/${id}/comments/${commentId}/report`,
        {},
      );

      if (!response.error) {
        alert("신고가 접수되었습니다.");
      } else {
        if (response.status === 401) {
          alert("로그인이 필요합니다.");
          router.push("/login");
        } else if (response.status === 403) {
          alert("본인의 댓글은 신고할 수 없습니다.");
        } else {
          alert(response.error);
        }
      }
    } catch (err) {
      alert("댓글 신고 중 오류가 발생했습니다.");
    }
  };

  if (error || !insight) {
    return (
      <div className={styles.page}>
        <Header variant="transparent" onMenuClick={() => setIsMenuOpen(true)} />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className="container">
          <div className={styles.error}>
            <p>{error || "인사이트를 찾을 수 없습니다."}</p>
            <Button onClick={handleBackToList}>목록으로 돌아가기</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <SEO
        pageType="content"
        menuName="인사이트"
        postTitle={insight.title}
        description={insight.content?.substring(0, 160).replace(/<[^>]*>/g, '') || `${insight.title} - 세무법인 함께`}
        ogImage={insight.thumbnail?.url}
        ogType="article"
      />
      <div className={styles.page}>
        <Header
          variant="transparent"
          onMenuClick={() => setIsMenuOpen(true)}
          isFixed={true}
        />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        <div className={styles.floatingButtons}>
          <FloatingButton
            variant="consult"
            label="상담 신청하기"
            onClick={() => router.push("/consultation/apply")}
          />
        </div>

        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.headerSection}>
              <div className={styles.titleWrapper}>
                <div className={styles.category}>
                  {insight.subMinorCategory ? insight.subMinorCategory.name : "카테고리 명"}
                </div>
                <h1 className={styles.title}>{insight.title}</h1>
              </div>
              <div className={styles.meta}>
                <div className={styles.metaLeft}>
                  <span className={styles.author}>{insight.authorName || "작성자"}</span>
                  <span className={styles.divider}></span>
                  <span className={styles.date}>
                    {formatDate(insight.createdAt)}
                  </span>
                </div>
                <div className={styles.metaRight}>
                  <img
                    src="/images/common/print-icon.svg"
                    alt="프린트"
                    className={styles.icon}
                    onClick={handlePrint}
                  />
                  <span className={styles.iconDivider} />
                  <img
                    src="/images/common/share-icon.svg"
                    alt="공유"
                    className={styles.icon}
                    onClick={handleShare}
                  />
                </div>
              </div>
            </div>

            <div className={styles.bodySection}>
              {insight.thumbnail && (
                <div className={styles.imageSection}>
                  <img src={insight.thumbnail.url} alt={insight.title} />
                </div>
              )}
              <div className={styles.bodyContent}>
                <Viewer initialValue={insight.content.replace(/\*\*\*/g, "")} />
              </div>
            </div>

            {insight.files && insight.files.length > 0 && (
              <div className={styles.attachmentsSection}>
                <h2 className={styles.attachmentsTitle}>첨부파일</h2>
                <div className={styles.attachmentsList}>
                  {insight.files.map((file: any, index: number) => (
                    <div
                      key={file.id || index}
                      className={styles.attachmentItem}
                    >
                      <div className={styles.attachmentLeft}>
                        <div className={styles.attachmentLabel}>
                          {index + 1}
                        </div>
                        <div className={styles.attachmentInfo}>
                          <Icon
                            type="document"
                            size={24}
                            className={styles.attachmentIcon}
                          />
                          <span className={styles.attachmentName} onClick={() => {
                            if (file.id) {
                              const fileName =
                                file.name ||
                                file.originalName ||
                                file.url?.split("/").pop() ||
                                "첨부 파일";
                              handleDownload(file.id, fileName);
                            } else {
                              alert("파일 정보를 찾을 수 없습니다.");
                            }
                          }}>
                            {file.name ||
                              file.originalName ||
                              file.url?.split("/").pop() ||
                              "첨부 파일"}
                          </span>
                        </div>
                      </div>
                      <button
                        className={styles.downloadButton}
                        onClick={() => {
                          if (file.id) {
                            const fileName =
                              file.name ||
                              file.originalName ||
                              file.url?.split("/").pop() ||
                              "첨부 파일";
                            handleDownload(file.id, fileName);
                          } else {
                            alert("파일 정보를 찾을 수 없습니다.");
                          }
                        }}
                      >
                        <span className={styles.downloadButtonText}>
                          다운로드
                        </span>
                        <Icon
                          type="download-white"
                          size={20}
                          className={styles.downloadIcon}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insight.enableComments && (
              <div className={styles.commentsSection}>
                <div className={styles.commentsDivider} />
                <div className={styles.commentsContent}>
                  <div className={styles.commentsHeader}>
                    <h2 className={styles.commentsTitle}>댓글</h2>
                    <p className={styles.commentsDescription}>
                      칼럼을 읽고 댓글을 남겨주세요.
                    </p>
                  </div>

                  <div className={styles.commentForm}>
                    <div className={styles.commentFormHeader}>
                      <span className={styles.commentAuthor}>
                        {currentUser?.name}
                      </span>
                    </div>
                    <div className={styles.commentInputWrapper}>
                      <textarea
                        className={styles.commentInput}
                        placeholder="인물을 배려하는 마음을 담아 게시글을 작성해주세요
명예훼손, 개인정보 유출, 타인의 권리 침해 등은 이용약관 및 관련 법률에 의해 제재될 수 있습니다"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <button
                      className={styles.commentSubmitButton}
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim() || isSubmittingComment}
                    >
                      등록
                    </button>
                  </div>

                  <div className={styles.commentsListHeader}>
                    <h3 className={styles.commentsTotalTitle}>
                      총 댓글{" "}
                      <span className={styles.commentsTotalCount}>
                        {commentTotal}
                      </span>
                    </h3>
                  </div>

                  <div className={styles.commentsList}>
                    {comments.length > 0 ? (
                      comments.map((comment) => (
                        <>
                          <div
                            key={comment.id}
                            className={`${styles.commentItem} ${comment.isHidden ? styles.commentHidden : ""
                              }`}
                          >
                            <div className={styles.commentHeader}>
                              <span className={styles.commentAuthorName}>
                                {comment.authorName || ""}
                              </span>
                              {isAuthenticated && (
                                <>
                                  {comment.isMine ? (
                                    <button
                                      className={styles.commentAction}
                                      onClick={() =>
                                        handleDeleteComment(comment.id)
                                      }
                                    >
                                      삭제
                                    </button>
                                  ) : (
                                    <button
                                      className={styles.commentAction}
                                      onClick={() =>
                                        handleReportComment(comment.id)
                                      }
                                    >
                                      신고
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                            <p className={styles.commentContent}>
                              {comment.isHidden
                                ? "해당 댓글은 다수 사용자의 신고에 의해 가려졌습니다."
                                : comment.body}
                            </p>
                            <p className={styles.commentDate}>
                              {formatDateTime(comment.createdAt)}
                            </p>
                          </div>
                          <div className={styles.commentDivider} />
                        </>
                      ))
                    ) : (
                      <p className={styles.noComments}>아직 댓글이 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className={styles.navigationSection}>
              <div className={styles.dividerLine} />
              <div className={styles.navigation}>
                {prevInsight ? (
                  <div className={styles.navItem} onClick={handlePrevClick}>
                    <Icon
                      type="arrow-left-gray"
                      size={24}
                      className={styles.navIcon}
                    />
                    <span className={styles.navLabel}>이전 글</span>
                    <span className={styles.navTitle}>
                      {prevInsight.title}
                    </span>
                  </div>
                ) : (
                  <div className={styles.navPlaceholder} />
                )}
                <Button
                  type="line-white"
                  size="large"
                  onClick={handleBackToList}
                  leftIcon="list-white"
                  className={styles.backButton}
                >
                  목록보기
                </Button>
                {nextInsight ? (
                  <div
                    className={`${styles.navItem} ${styles.navItemNext}`}
                    onClick={handleNextClick}
                  >
                    <span className={styles.navLabel}>다음 글</span>
                    <span className={styles.navTitle}>
                      {nextInsight.title}
                    </span>
                    <Icon
                      type="arrow-right-gray"
                      size={24}
                      className={styles.navIcon}
                    />
                  </div>
                ) : (
                  <div className={styles.navPlaceholder} />
                )}
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<
  InsightDetailPageProps
> = async (context) => {
  const { id } = context.params!;

  try {
    const response = await get<InsightDetail>(
      `${API_ENDPOINTS.INSIGHTS}/${id}`,
    );

    if (response.data) {
      return {
        props: {
          insight: response.data,
          error: null,
        },
      };
    } else {
      return {
        props: {
          insight: null,
          error: response.error || "인사이트를 찾을 수 없습니다.",
        },
      };
    }
  } catch (err) {
    return {
      props: {
        insight: null,
        error: "데이터를 불러오는 중 오류가 발생했습니다.",
      },
    };
  }
};

export default InsightDetailPage;