import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Header from "@/components/common/Header";
import Menu from "@/components/Menu";
import Footer from "@/components/Footer";
import SEO from "@/components/common/SEO";
import { useFooter, FooterPolicy } from "@/context/FooterContext";
import styles from "./policy.module.scss";

const PolicyPage: React.FC = () => {
  const router = useRouter();
  const { type } = router.query;
  const { fetchPolicy, policyLoading, policyError } = useFooter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [policy, setPolicy] = useState<FooterPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validate and normalize type
  const policyType =
    type === "TERMS" || type === "PRIVACY" ? type : null;

  useEffect(() => {
    const loadPolicy = async () => {
      if (!policyType) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetchPolicy(policyType);
        setPolicy(result);
      } catch (err) {
        setError("정책 정보를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    // Only fetch when router is ready and type is available
    if (router.isReady) {
      loadPolicy();
    }
  }, [policyType, fetchPolicy, router.isReady]);

  const handleRetry = async () => {
    if (!policyType) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchPolicy(policyType);
      setPolicy(result);
    } catch (err) {
      setError("정책 정보를 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const getPageTitle = () => {
    if (policyType === "TERMS") return "서비스이용약관";
    if (policyType === "PRIVACY") return "개인정보처리방침";
    return "정책";
  };

  // Invalid type
  if (router.isReady && !policyType) {
    return (
      <>
        <SEO title="정책 | 세무법인 함께" />
        <div className={styles.page}>
          <Header
            variant="transparent"
            onMenuClick={() => setIsMenuOpen(true)}
          />
          <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
          <main className={styles.main}>
            <div className={styles.container}>
              <div className={styles.errorState}>
                <p>잘못된 접근입니다.</p>
                <button
                  className={styles.retryButton}
                  onClick={() => router.push("/")}
                >
                  홈으로 이동
                </button>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title={`${getPageTitle()} | 세무법인 함께`} />
      <div className={styles.page}>
        <Header variant="transparent" onMenuClick={() => setIsMenuOpen(true)} />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        <main className={styles.main}>
          <div className={styles.container}>
            <h1 className={styles.title}>{getPageTitle()}</h1>

            {/* Loading State */}
            {loading && (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>로딩 중...</p>
              </div>
            )}

            {/* Error State */}
            {!loading && (error || policyError) && (
              <div className={styles.errorState}>
                <p>{error || policyError}</p>
                <button className={styles.retryButton} onClick={handleRetry}>
                  다시 시도
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && !policyError && !policy && (
              <div className={styles.emptyState}>
                <p>등록된 정보가 없습니다.</p>
              </div>
            )}

            {/* Content */}
            {!loading && !error && !policyError && policy && (
              <div className={styles.content}>
                <div
                  className={styles.policyContent}
                  dangerouslySetInnerHTML={{ __html: policy.content }}
                />
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PolicyPage;
