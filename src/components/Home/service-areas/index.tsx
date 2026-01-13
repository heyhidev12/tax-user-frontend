import { useState, useRef, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import styles from "./service.module.scss";
import { get } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/api";

import type { ServiceCard } from "./data";
import ViewMore from "../../common/ViewMore";

interface BusinessItem {
  id: number;
  name: string;
  image?: {
    id: number;
    url: string;
  };
  isMainExposed?: boolean;
  isExposed?: boolean;
  displayOrder?: number;
}

interface MinorCategory {
  id: number;
  name: string;
  isMainExposed: boolean;
  image?: {
    id: number;
    url: string;
  };
  items: BusinessItem[];
  displayOrder?: number;
}

interface MajorCategory {
  id: number;
  name: string;
  isExposed: boolean;
  displayOrder: number;
}

interface HierarchicalData {
  majorCategory: MajorCategory;
  minorCategories: MinorCategory[];
}

interface CategoryGroup {
  majorCategory: MajorCategory;
  cards: ServiceCard[];
}

export default function ServiceAreas() {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [progress, setProgress] = useState(0.5);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(0);
  const swiperRef = useRef<SwiperType | null>(null);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setIsMobile(width <= 768);
    };
    
    // Set initial value
    if (typeof window !== 'undefined') {
      checkScreenSize();
      window.addEventListener("resize", checkScreenSize);
      return () => window.removeEventListener("resize", checkScreenSize);
    }
  }, []);

  // Fetch business areas data from API
  useEffect(() => {
    const fetchServiceAreas = async () => {
      try {
        setLoading(true);
        const response = await get<HierarchicalData[]>(
          `${API_ENDPOINTS.BUSINESS_AREAS_HIERARCHICAL}?limit=20&page=1`
        );

        if (response.data && Array.isArray(response.data)) {
          // Group by majorCategory.id - keep API order as-is
          const groupsMap = new Map<number, CategoryGroup>();

          response.data.forEach((hierarchicalItem) => {
            const majorCategoryId = hierarchicalItem.majorCategory.id;

            // Initialize group if it doesn't exist
            if (!groupsMap.has(majorCategoryId)) {
              groupsMap.set(majorCategoryId, {
                majorCategory: hierarchicalItem.majorCategory,
                cards: [],
              });
            }

            const group = groupsMap.get(majorCategoryId)!;

            // Process minorCategories - do NOT filter by isExposed (backend already filters)
            hierarchicalItem.minorCategories.forEach((minorCategory) => {
              // Only filter items by isMainExposed === true
              if (minorCategory.isMainExposed === true) {
                const tags = minorCategory.items.map(item => item.name);
              
                const imageUrl =
                  minorCategory.image?.url ||
                  minorCategory.items[0]?.image?.url ||
                  "";
              
                group.cards.push({
                  id: minorCategory.id,
                  title: minorCategory.name,
                  tags,
                  image: imageUrl,
                });
              }
            });
          });

          // Convert map to array - keep API order (first occurrence order)
          const groups: CategoryGroup[] = Array.from(groupsMap.values());

          setCategoryGroups(groups);

          // Set active tab to first group if available and no tab is selected
          if (groups.length > 0 && activeTab === null) {
            setActiveTab(String(groups[0].majorCategory.id));
          }
        } else {
          setCategoryGroups([]);
        }
      } catch (err) {
        console.error("Failed to fetch service areas:", err);
        setCategoryGroups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServiceAreas();
  }, []);

  // Get cards for active tab
  const activeGroup = categoryGroups.find(
    (group) => String(group.majorCategory.id) === activeTab
  );
  const cards = activeGroup?.cards || [];

  // Desktop: First slide has 6 cards, remaining slides have 4 cards each
  const getDesktopSlides = () => {
    const result = [];
    result.push(cards.slice(0, 6));
    for (let i = 6; i < cards.length; i += 4) {
      result.push(cards.slice(i, i + 4));
    }
    return result;
  };

  // Mobile: Each slide has 4 cards (2 columns x 2 rows)
  const getMobileSlides = () => {
    const result = [];
    for (let i = 0; i < cards.length; i += 4) {
      result.push(cards.slice(i, i + 4));
    }
    return result;
  };

  // Tablet: Each slide has 6 cards (3 columns x 2 rows)
  const getTabletSlides = () => {
    const result = [];
    for (let i = 0; i < cards.length; i += 6) {
      result.push(cards.slice(i, i + 6));
    }
    return result;
  };

  // Determine which slide structure to use based on screen size
  const getSlides = () => {
    if (windowWidth === 0) {
      // SSR or initial render - use mobile as default
      return getMobileSlides();
    }
    
    if (windowWidth < 768) {
      // Mobile: 4 cards per slide (2x2 grid)
      return getMobileSlides();
    } else if (windowWidth < 1350) {
      // Tablet: 6 cards per slide (3x2 grid)
      return getTabletSlides();
    } else {
      // Desktop: use grid-based slides
      return getDesktopSlides();
    }
  };

  const slides = getSlides();

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setProgress(0.5);
    if (swiperRef.current) {
      swiperRef.current.slideTo(0);
    }
  };

  const handleProgress = (_swiper: SwiperType, progressValue: number) => {
    if (!progressValue) setProgress(0.5);
    else setProgress(progressValue);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (swiperRef.current) {
      const bar = e.currentTarget;
      const rect = bar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const totalSlides = slides.length;
      const targetIndex = Math.round(percentage * (totalSlides - 1));
      swiperRef.current.slideTo(targetIndex);
    }
  };

  const renderCard = (card: ServiceCard) => {
    const isHovered = hoveredCard === card.id;

    return (
      <div
        key={card.id}
        className={`${styles['service-card']} ${isHovered ? styles['service-card--hovered'] : ""}`}
        onMouseEnter={() => setHoveredCard(card.id)}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div className={styles['service-card__image']}>
          <img src={card.image} alt={card.title} />
        </div>
        <div className={styles['service-card__overlay']}>
          <div className={styles['service-card__header']}>
            <h3 className={styles['service-card__title']}>{card.title}</h3>
            <button className={styles['service-card__arrow']}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 17L17 7M17 7H7M17 7V17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div className={`${styles['service-card__tags']} ${isHovered ? styles.visible : ""}`}>
            {card.tags.map((tag, idx) => (
              <span key={idx} className={styles['service-card__tag']}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Desktop: Render 6-card grid (3 columns, 2 rows)
  const renderSixCardGrid = (slideCards: ServiceCard[]) => {
    return (
      <div className={`${styles['cards-grid']} ${styles['cards-grid--six']}`}>
        <div className={`${styles['cards-column']} ${styles['cards-column--offset']}`}>
          {slideCards[0] && renderCard(slideCards[0])}
          {slideCards[1] && renderCard(slideCards[1])}
        </div>
        <div className={styles['cards-column']}>
          {slideCards[2] && renderCard(slideCards[2])}
          {slideCards[3] && renderCard(slideCards[3])}
        </div>
        <div className={`${styles['cards-column']} ${styles['cards-column--offset']}`}>
          {slideCards[4] && renderCard(slideCards[4])}
          {slideCards[5] && renderCard(slideCards[5])}
        </div>
      </div>
    );
  };

  // Desktop: Render 4-card grid (2 columns, 2 rows)
  const renderFourCardGrid = (slideCards: ServiceCard[]) => {
    return (
      <div className={`${styles['cards-grid']} ${styles['cards-grid--four']}`}>
        <div className={styles['cards-column']}>
          {slideCards[0] && renderCard(slideCards[0])}
          {slideCards[1] && renderCard(slideCards[1])}
        </div>
        <div className={`${styles['cards-column']} ${styles['cards-column--offset']}`}>
          {slideCards[2] && renderCard(slideCards[2])}
          {slideCards[3] && renderCard(slideCards[3])}
        </div>
      </div>
    );
  };

  // Mobile: Render 4-card grid (2 columns x 2 rows)
  const renderMobileGrid = (slideCards: ServiceCard[]) => {
    return (
      <div className={`${styles['cards-grid']} ${styles['cards-grid--mobile']}`}>
        {slideCards.map((card) => renderCard(card))}
      </div>
    );
  };

  // Tablet: Render 6-card grid (3 columns x 2 rows)
  const renderTabletGrid = (slideCards: ServiceCard[]) => {
    return (
      <div className={`${styles['cards-grid']} ${styles['cards-grid--tablet']}`}>
        {slideCards.map((card) => renderCard(card))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles['service-section']}>
        <div className="container">
          <div className={styles['section-title-box']}>
            <div className={styles['top-id']}>01</div>
            <div className={styles['title-wrapper']}>
              <h2 className={styles.title}>
                SERVICE <br /> AREAS
              </h2>
              <span className={styles.subtitle}>업무분야</span>
              <span className={styles.point}></span>
            </div>
          </div>
          <div style={{ padding: "100px 0", textAlign: "center" }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['service-section']}>
      <div className="container">
        <div className={styles['background-circle']}>
          <h1>Areas of</h1>
          <h1>Expertise</h1>
        </div>

        <div className={styles['section-title-box']}>
          <div className={styles['top-id']}>01</div>
          <div className={styles['title-wrapper']}>
            <h2 className={styles.title}>
              SERVICE <br /> AREAS
            </h2>
            <span className={styles.subtitle}>업무분야</span>
            <span className={styles.point}></span>
          </div>
          {/* View More only on desktop */}
          {!isMobile && <ViewMore target="services" />}
        </div>

        <div className={styles['service-content']}>
          {/* Left side - Tabs */}
          <div className={styles['service-left']}>
            <div className={styles['service-tabs']}>
              <span className={styles['service-tabs__point']} />
              {categoryGroups.map((group) => (
                <button
                  key={group.majorCategory.id}
                  className={`${styles['service-tabs__btn']} ${
                    activeTab === String(group.majorCategory.id) ? styles.active : ""
                  }`}
                  onClick={() => handleTabChange(String(group.majorCategory.id))}
                >
                  {group.majorCategory.name}
                </button>
              ))}
            </div>
          </div>

          {/* Right side - Cards Swiper */}
          <div className={styles['service-right']}>
            {cards.length > 0 ? (
              <>
                <Swiper
                  breakpoints={{
                    0: {
                      slidesPerView: 1,
                      spaceBetween: 16,
                    },
                    768: {
                      slidesPerView: 1,
                      spaceBetween: 24,
                    },
                    1350: {
                      slidesPerView: 1,
                      spaceBetween: 0,
                    },
                  }}
                  onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                  }}
                  onProgress={handleProgress}
                  className={styles['service-swiper']}
                >
                  {slides.map((slideCards, slideIndex) => {
                    // Determine which render function to use based on screen size
                    const renderContent = () => {
                      if (windowWidth === 0) {
                        // SSR or initial render - use mobile as default
                        return renderMobileGrid(slideCards);
                      }
                      
                      if (windowWidth < 768) {
                        // Mobile: 2x2 grid (4 cards)
                        return renderMobileGrid(slideCards);
                      } else if (windowWidth < 1350) {
                        // Tablet: 3x2 grid (6 cards)
                        return renderTabletGrid(slideCards);
                      } else {
                        // Desktop: use original grid layouts
                        return slideIndex === 0
                          ? renderSixCardGrid(slideCards)
                          : renderFourCardGrid(slideCards);
                      }
                    };

                    return (
                      <SwiperSlide key={slideIndex}>
                        {renderContent()}
                      </SwiperSlide>
                    );
                  })}
                </Swiper>

                {/* Progress Bar - show only when there are more than 6 cards (multiple slides) */}
                {cards.length > 6 && (
                  <div className={styles['service-progress']} onClick={handleProgressBarClick}>
                    <div className={styles['service-progress__track']}>
                      <div
                        className={styles['service-progress__fill']}
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: "100px 0", textAlign: "center" }}>
                No service areas available
              </div>
            )}
          </div>
        </div>

        {/* View More button - moved to bottom for mobile */}
        {isMobile && (
          <div className={styles['service-view-more-mobile']}>
            <ViewMore target="services" />
          </div>
        )}


      </div>
    </div>
  );
}
