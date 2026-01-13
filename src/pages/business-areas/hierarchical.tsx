import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/common/Header';
import Menu from '@/components/Menu';
import Footer from '@/components/Footer';
import PageHeader from '@/components/common/PageHeader';
import FloatingButton from '@/components/common/FloatingButton';
import Icon from '@/components/common/Icon';
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

  // URL 쿼리 파라미터에서 탭 읽기 (대분류 ID 기반)
  const tabFromQuery = router.query.tab as string | undefined;
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set([1])); // 첫 번째 카테고리 기본 펼침

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await get<HierarchicalData[]>(
          `${API_ENDPOINTS.BUSINESS_AREAS_HIERARCHICAL}?limit=20&page=1`
        );

        if (response.error) {
          setError(response.error);
        } else if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          const apiData = response.data;
          setData(apiData);

          // 탭 목록에서 기본 활성 탭 결정 (URL 쿼리 우선)
          const tabIds = apiData.map((item) => String(item.majorCategory.id));
          let selectedTabId: string;
          if (tabFromQuery && tabIds.includes(tabFromQuery)) {
            selectedTabId = tabFromQuery;
            setActiveTab(tabFromQuery);
          } else {
            selectedTabId = tabIds[0];
            setActiveTab(tabIds[0]);
          }

          // 선택된 대분류의 첫 번째 소분류를 기본으로 펼침
          const selectedMajor = apiData.find(
            (item) => String(item.majorCategory.id) === selectedTabId
          );
          const firstMinorId = selectedMajor?.minorCategories?.[0]?.id;
          if (firstMinorId) {
            setExpandedCategories(new Set([firstMinorId]));
          }
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
  }, [tabFromQuery]);

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
    data.find((item) => String(item.majorCategory.id) === activeTab) ?? data[0];

  // 탭 데이터 (대분류 기준)
  const tabs = data.map((item) => ({
    id: String(item.majorCategory.id),
    label: item.majorCategory.name,
  }));

  return (
    <div className={styles.page}>
      <Header variant="white" onMenuClick={() => setIsMenuOpen(true)} isFixed={true} />
      <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <div className={styles.headerImage}>
      </div>
      <div className="container">
        <div className={styles.content}>
          <PageHeader
            title="업무분야"
            subtitle='Practice Areas'
            breadcrumbs={[{ label: '업무 분야' }]}
            tabs={tabs}
            activeTabId={activeTab || tabs[0]?.id}
            onTabChange={(id) => {
              setActiveTab(id);
              // URL 쿼리도 함께 업데이트 (히스토리는 유지)
              router.replace(
                {
                  pathname: router.pathname,
                  query: { ...router.query, tab: id },
                },
                undefined,
                { shallow: true }
              );
              // 선택된 대분류의 첫 번째 소분류를 자동으로 펼침
              const selectedMajor = data.find(
                (item) => String(item.majorCategory.id) === id
              );
              const firstMinorId = selectedMajor?.minorCategories?.[0]?.id;
              if (firstMinorId) {
                setExpandedCategories(new Set([firstMinorId]));
              }
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
        <FloatingButton
          variant="top"
          onClick={handleTopClick}
        />
      </div>
    </div>
  );
};

export default HierarchicalPage;

