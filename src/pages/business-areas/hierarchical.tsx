import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/common/Header';
import Menu from '@/components/Menu';
import Footer from '@/components/Footer';
import PageHeader from '@/components/common/PageHeader';
import FloatingButton from '@/components/common/FloatingButton';
import Icon from '@/components/common/Icon';
import SEO from '@/components/common/SEO';
import { get } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import styles from './hierarchical.module.scss';

interface SectionContent {
  content: string;
  section: string;
}

// 컨설팅 하드코딩 데이터
interface ConsultingSubItem {
  id: string;
  name: string;
  description: string;
}

interface BusinessItem {
  id: number;
  name: string;
  subDescription?: string;
  image?: {
    id: number;
    url: string;
  };
  overview?: string;
  sectionContents?: SectionContent[];
  youtubeUrls?: string[];
  youtubeCount?: number;
  isMainExposed?: boolean;
  isExposed?: boolean;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface MinorCategory {
  id: number;
  name: string;
  isExposed: boolean;
  items: BusinessItem[];
}

interface MajorCategory {
  id: number;
  name: string;
  sections: string[];
  isExposed: boolean;
  displayOrder: number;
}

interface HierarchicalData {
  majorCategory: MajorCategory;
  minorCategories: MinorCategory[];
}

const HierarchicalPage: React.FC = () => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // 전체 대분류 + 소분류 데이터 배열
  const [data, setData] = useState<HierarchicalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local cache to avoid refetching hierarchical data
  const categoryCacheRef = useRef<HierarchicalData[] | null>(null);

  // URL 쿼리 파라미터에서 탭/서브탭 읽기 (대분류/소분류 ID 기반)
  const tabFromQuery = router.query.tab as string | undefined;
  const subtabFromQuery = router.query.subtab as string | undefined;

  // 활성 대분류/소분류 상태 (숫자 ID 기반)
  const [activeMajorId, setActiveMajorId] = useState<number | null>(null);
  const [activeMinorId, setActiveMinorId] = useState<number | null>(null);

  // 펼쳐진 소분류 아코디언 (minorCategory.id)
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(
    () => new Set()
  );

  // Fetch hierarchical data once on mount (or reuse cache)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // If we already have cached data, reuse it and skip network call
        if (categoryCacheRef.current) {
          setData(categoryCacheRef.current);
          setLoading(false);
          return;
        }

        const response = await get<HierarchicalData[]>(
          `${API_ENDPOINTS.BUSINESS_AREAS_HIERARCHICAL}?limit=20&page=1`
        );

        if (response.error) {
          setError(response.error);
        } else if (
          response.data &&
          Array.isArray(response.data) &&
          response.data.length > 0
        ) {
          categoryCacheRef.current = response.data;
          setData(response.data);
        } else {
          setError('데이터를 불러올 수 없습니다.');
        }
      } catch (err) {
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Derive active major/minor and sync URL from loaded data + query
  useEffect(() => {
    if (!router.isReady || data.length === 0) return;

    // 전체 대분류 ID 목록
    const majorIds = data.map((item) => item.majorCategory.id);
    if (majorIds.length === 0) {
      setError('데이터를 불러올 수 없습니다.');
      return;
    }

    let targetMajorId: number | null = null;
    let targetMinorId: number | null = null;

    // subtab(소분류)이 있는 경우: 해당 소분류가 속한 대분류를 우선 사용
    const subtabId = subtabFromQuery ? Number(subtabFromQuery) : null;
    if (subtabId) {
      const groupContainingMinor = data.find((group) =>
        group.minorCategories?.some((minor) => minor.id === subtabId)
      );

      if (groupContainingMinor) {
        targetMajorId = groupContainingMinor.majorCategory.id;
        targetMinorId = subtabId;
      }
    }

    // subtab이 없거나, 해당 소분류를 찾지 못한 경우 tab 또는 첫 번째 대분류 사용
    if (targetMajorId === null) {
      const tabIdFromQuery = tabFromQuery ? Number(tabFromQuery) : null;
      if (tabIdFromQuery && majorIds.includes(tabIdFromQuery)) {
        targetMajorId = tabIdFromQuery;
      } else {
        targetMajorId = majorIds[0];
      }
    }

    // 소분류가 아직 정해지지 않았다면, 선택된 대분류의 첫 번째 소분류 사용
    const selectedMajor = data.find(
      (item) => item.majorCategory.id === targetMajorId
    );
    if (!selectedMajor) {
      setError('데이터를 불러올 수 없습니다.');
      return;
    }

    if (targetMinorId === null) {
      targetMinorId = selectedMajor.minorCategories?.[0]?.id ?? null;
    }

    // 상태 업데이트
    setActiveMajorId(targetMajorId);
    setActiveMinorId(targetMinorId);

    if (targetMinorId) {
      setExpandedCategories(new Set([targetMinorId]));
    } else {
      setExpandedCategories(new Set());
    }

    // URL 쿼리와 상태 동기화 (tab/subtab)
    const desiredTab = String(targetMajorId);
    const desiredSubtab = targetMinorId ? String(targetMinorId) : undefined;

    const currentTab = tabFromQuery;
    const currentSubtab = subtabFromQuery;

    const nextQuery: Record<string, any> = {
      ...router.query,
      tab: desiredTab,
    };
    if (desiredSubtab) {
      nextQuery.subtab = desiredSubtab;
    } else {
      delete nextQuery.subtab;
    }

    const needsUpdate =
      currentTab !== desiredTab ||
      (desiredSubtab ?? '') !== (currentSubtab ?? '');

    if (needsUpdate) {
      router.replace(
        { pathname: router.pathname, query: nextQuery },
        undefined,
        { shallow: true }
      );
    }
  }, [data, router.isReady, tabFromQuery, subtabFromQuery, router.query]);

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
    
    // Update URL when toggling category
    setActiveMinorId(categoryId);
    const nextQuery: Record<string, any> = {
      ...router.query,
      tab: String(activeMajorId),
      subtab: String(categoryId),
    };
    
    router.replace(
      { pathname: router.pathname, query: nextQuery },
      undefined,
      { shallow: true }
    );
  };

  const handleItemClick = (item: BusinessItem) => {
    router.push(`/business-areas/${item.id}`);
  };

  const handleTopClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConsultClick = () => {
    // 상담 신청하기 로직
    router.push('/consultation/apply');
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

  if (error || data.length === 0) {
    return (
      <div className={styles.page}>
        <Header variant="transparent" onMenuClick={() => setIsMenuOpen(true)} />
        <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className={styles.error}>{error || '데이터를 불러올 수 없습니다.'}</div>
      </div>
    );
  }

  // 현재 활성 대분류 데이터
  const activeMajor =
    data.find((item) => item.majorCategory.id === activeMajorId) ?? data[0];

  // 탭 데이터 (대분류 기준)
  const tabs = data.map((item) => ({
    id: String(item.majorCategory.id),
    label: item.majorCategory.name,
  }));

  return (
    <div className={styles.page}>
      <SEO pageType="menu" menuName="업무분야" />
      <Header variant="white" onMenuClick={() => setIsMenuOpen(true)} isFixed={true} />
      <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <div className={styles.headerImage}>
        <h1 className={styles.headerTitle}> PRACTICE AREAS</h1>
        <p className={styles.headerSubtitle}>업무분야</p>
      </div>
      <div className="container">
        <div className={styles.content}>
          <PageHeader
            title="업무분야"
            subtitle='Practice Areas'
            breadcrumbs={[{ label: '업무 분야' }]}
            tabs={tabs}
            activeTabId={
              activeMajorId !== null ? String(activeMajorId) : tabs[0]?.id
            }
            onTabChange={(id) => {
              const majorId = Number(id);
              setActiveMajorId(majorId);

              // 선택된 대분류의 첫 번째 소분류를 자동으로 선택 + 펼침
              const selectedMajor = data.find(
                (item) => item.majorCategory.id === majorId
              );
              const firstMinorId = selectedMajor?.minorCategories?.[0]?.id;

              if (firstMinorId) {
                setActiveMinorId(firstMinorId);
                setExpandedCategories(new Set([firstMinorId]));
              } else {
                setActiveMinorId(null);
                setExpandedCategories(new Set());
              }

              // URL 쿼리도 함께 업데이트 (히스토리는 유지)
              const nextQuery: Record<string, any> = {
                ...router.query,
                tab: id,
              };
              if (firstMinorId) {
                nextQuery.subtab = String(firstMinorId);
              } else {
                delete nextQuery.subtab;
              }

              router.replace(
                {
                  pathname: router.pathname,
                  query: nextQuery,
                },
                undefined,
                { shallow: true }
              );
            }}
          />

          {/* Categories List - 활성 대분류 기준으로 렌더링 */}
          {activeMajor && (
            <div className={styles.categoriesContainer}>
              <div className={styles.categoriesGrid}>
                {/* Left Column */}
                <div className={styles.leftColumn}>
                  {activeMajor.minorCategories.filter((_, index) => index % 2 === 0).map((minorCategory) => {
                    const isExpanded = expandedCategories.has(minorCategory.id);
                    const items = minorCategory.items || [];

                    return (
                      <div key={minorCategory.id} className={styles.categoryColumn}>
                        <div
                          className={`${styles.categoryHeader} ${isExpanded ? styles.categoryHeaderExpanded : ''}`}
                          onClick={() => toggleCategory(minorCategory.id)}
                        >
                          <span className={styles.categoryName}>{minorCategory.name}</span>
                          <button
                            type="button"
                            className={`${styles.categoryToggle} ${isExpanded ? styles.categoryToggleExpanded : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory(minorCategory.id);
                            }}
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              className={`${styles.chevronIcon} ${isExpanded ? styles.chevronIconRotated : ''}`}
                            >
                              <path
                                d="M6 9L12 15L18 9"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>

                        {isExpanded && items.length > 0 && (
                          <div className={styles.categoryItems}>
                            {items.map((item, index) => (
                              <div
                                key={item.id}
                                className={`${styles.categoryItem} ${index === 0 ? styles.categoryItemFirst : ''}`}
                                onClick={() => handleItemClick(item)}
                              >
                                <span className={styles.itemName}>{item.name}</span>
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  className={styles.arrowIcon}
                                >
                                  <path
                                    d="M6 9L12 15L18 9"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Right Column */}
                <div className={styles.rightColumn}>
                  {activeMajor.minorCategories.filter((_, index) => index % 2 === 1).map((minorCategory) => {
                    const isExpanded = expandedCategories.has(minorCategory.id);
                    const items = minorCategory.items || [];

                    return (
                      <div key={minorCategory.id} className={styles.categoryColumn}>
                        <div
                          className={`${styles.categoryHeader} ${isExpanded ? styles.categoryHeaderExpanded : ''}`}
                          onClick={() => toggleCategory(minorCategory.id)}
                        >
                          <span className={styles.categoryName}>{minorCategory.name}</span>
                          <button
                            type="button"
                            className={`${styles.categoryToggle} ${isExpanded ? styles.categoryToggleExpanded : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory(minorCategory.id);
                            }}
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              className={`${styles.chevronIcon} ${isExpanded ? styles.chevronIconRotated : ''}`}
                            >
                              <path
                                d="M6 9L12 15L18 9"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>

                        {isExpanded && items.length > 0 && (
                          <div className={styles.categoryItems}>
                            {items.map((item, index) => (
                              <div
                                key={item.id}
                                className={`${styles.categoryItem} ${index === 0 ? styles.categoryItemFirst : ''}`}
                                onClick={() => handleItemClick(item)}
                              >
                                <span className={styles.itemName}>{item.name}</span>
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  className={styles.arrowIcon}
                                >
                                  <path
                                    d="M6 9L12 15L18 9"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


      <Footer />

      {/* Floating Buttons */}
      <div className={styles.floatingButtons}>
        <FloatingButton
          variant="consult"
          label="상담 신청하기"
          onClick={handleConsultClick}
        />
      </div>
    </div>
  );
};

export default HierarchicalPage;

