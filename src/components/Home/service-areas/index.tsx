"use client";

import React, { useState, useRef, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import styles from "./service.module.scss";
import type { CategoryGroup } from "../index";
import ViewMore from "../../common/ViewMore";
import { useRouter } from "next/router";
import { useThrottledResize } from "@/hooks/useThrottledResize";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface ServiceAreasProps {
  initialData: CategoryGroup[];
}
interface ServiceCard {
  id: number;
  title: string;
  tags: string[];
  image: string;
}

const ServiceAreas = React.memo(function ServiceAreas({ initialData }: ServiceAreasProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [progress, setProgress] = useState(0.5);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const { isMobile, windowWidth } = useThrottledResize();
  const swiperRef = useRef<SwiperType | null>(null);
  const categoryGroups = initialData;
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Set active tab to first group if available and no tab is selected
  useEffect(() => {
    if (categoryGroups.length > 0 && activeTab === null) {
      setActiveTab(String(categoryGroups[0].majorCategory.id));
    }
  }, [categoryGroups, activeTab]);

  // Get cards for active tab
  const activeGroup = categoryGroups.find(
    (group) => String(group.majorCategory.id) === activeTab,
  );
  const cards = activeGroup?.cards || [];

  // GSAP Animation for Desktop - PIN + FLOW
  useEffect(() => {
    if (isMobile || !sectionRef.current || !titleRef.current || !cardsContainerRef.current || cards.length === 0) {
      return;
    }

    const ctx = gsap.context(() => {
      // Use requestAnimationFrame for immediate check, then retry if needed
      const setupAnimation = () => {
        // Get all card elements
        const cardElements = cardsContainerRef.current?.querySelectorAll(`.${styles["service-card"]}`);
        
        if (!cardElements || cardElements.length === 0) {
          // Retry once if cards not ready
          requestAnimationFrame(() => {
            const retryElements = cardsContainerRef.current?.querySelectorAll(`.${styles["service-card"]}`);
            if (retryElements && retryElements.length > 0) {
              gsap.set(retryElements, {
                opacity: 0,
                y: 40,
              });
              createTimeline(retryElements);
            }
          });
          return;
        }

        // Set initial state - title from RIGHT
        gsap.set(titleRef.current, {
          opacity: 0,
          x: 150,
        });

        // Set initial state - cards from bottom
        gsap.set(cardElements, {
          opacity: 0,
          y: 40,
        });

        createTimeline(cardElements);
      };

      const createTimeline = (cardElements: NodeListOf<Element>) => {
        // Create timeline with ScrollTrigger - PIN + SCRUB
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "+=120%",
            scrub: true,
            pin: true,
          },
        });

        // Step 1: Left title enters from RIGHT
        tl.to(titleRef.current, {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: "power2.out",
        });

        // Step 2: Cards animate after title (slow stagger)
        tl.to(cardElements, {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.15,
          ease: "power2.out",
        }, "-=0.3");
      };

      setupAnimation();
    }, sectionRef);

    return () => ctx.revert();
  }, [isMobile, cards.length, activeTab]);

  // Simple fade up animation for mobile (no horizontal movement, no pin)
  useEffect(() => {
    if (!isMobile || !sectionRef.current || !titleRef.current || !cardsContainerRef.current || cards.length === 0) {
      return;
    }

    const ctx = gsap.context(() => {
      const setupAnimation = () => {
        gsap.set([titleRef.current], {
          opacity: 0,
          y: 30,
        });

        const cardElements = cardsContainerRef.current?.querySelectorAll(`.${styles["service-card"]}`) || [];
        
        if (cardElements.length === 0) {
          requestAnimationFrame(setupAnimation);
          return;
        }

        gsap.set(cardElements, {
          opacity: 0,
          y: 30,
        });

        gsap.to([titleRef.current], {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
          },
        });

        gsap.to(cardElements, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: cardsContainerRef.current,
            start: "top 80%",
          },
        });
      };

      setupAnimation();
    }, sectionRef);

    return () => ctx.revert();
  }, [isMobile, cards.length, activeTab]);

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
    const majorId = activeGroup?.majorCategory?.id;

    const handleCardClick = () => {
      if (!majorId) return;
      router.push(`/business-areas/hierarchical?tab=${majorId}&subtab=${card.id}`);
    };

    return (
      <div
        key={card.id}
        className={`${styles["service-card"]} ${isHovered ? styles["service-card--hovered"] : ""}`}
        onMouseEnter={() => setHoveredCard(card.id)}
        onMouseLeave={() => setHoveredCard(null)}
        onClick={isMobile ? handleCardClick : undefined}
        style={isMobile ? { cursor: "pointer" } : undefined}
      >
        <div className={styles["service-card__image"]}>
          <img src={card.image} alt={card.title} />
        </div>
        <div className={styles["service-card__overlay"]}>
          <div className={styles["service-card__header"]}>
            <h3 className={styles["service-card__title"]}>{card.title}</h3>
            <button
              type="button"
              className={styles["service-card__arrow"]}
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
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
          <div
            className={`${styles["service-card__tags"]} ${isHovered ? styles.visible : ""}`}
          >
            {card.tags.map((tag, idx) => (
              <span key={idx} className={styles["service-card__tag"]}>
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
      <div className={`${styles["cards-grid"]} ${styles["cards-grid--six"]}`}>
        <div
          className={`${styles["cards-column"]} ${styles["cards-column--offset"]}`}
        >
          {slideCards[0] && renderCard(slideCards[0])}
          {slideCards[1] && renderCard(slideCards[1])}
        </div>
        <div className={styles["cards-column"]}>
          {slideCards[2] && renderCard(slideCards[2])}
          {slideCards[3] && renderCard(slideCards[3])}
        </div>
        <div
          className={`${styles["cards-column"]} ${styles["cards-column--offset"]}`}
        >
          {slideCards[4] && renderCard(slideCards[4])}
          {slideCards[5] && renderCard(slideCards[5])}
        </div>
      </div>
    );
  };

  // Desktop: Render 4-card grid (2 columns, 2 rows)
  const renderFourCardGrid = (slideCards: ServiceCard[]) => {
    return (
      <div className={`${styles["cards-grid"]} ${styles["cards-grid--four"]}`}>
        <div className={styles["cards-column"]}>
          {slideCards[0] && renderCard(slideCards[0])}
          {slideCards[1] && renderCard(slideCards[1])}
        </div>
        <div
          className={`${styles["cards-column"]} ${styles["cards-column--offset"]}`}
        >
          {slideCards[2] && renderCard(slideCards[2])}
          {slideCards[3] && renderCard(slideCards[3])}
        </div>
      </div>
    );
  };

  // Mobile: Render 4-card grid (2 columns x 2 rows)
  const renderMobileGrid = (slideCards: ServiceCard[]) => {
    return (
      <div
        className={`${styles["cards-grid"]} ${styles["cards-grid--mobile"]}`}
      >
        {slideCards.map((card) => renderCard(card))}
      </div>
    );
  };

  // Tablet: Render 6-card grid (3 columns x 2 rows)
  const renderTabletGrid = (slideCards: ServiceCard[]) => {
    return (
      <div
        className={`${styles["cards-grid"]} ${styles["cards-grid--tablet"]}`}
      >
        {slideCards.map((card) => renderCard(card))}
      </div>
    );
  };

  if (categoryGroups.length === 0) {
    return (
      <div className={styles["service-section"]}>
        <div className="container">
          <div className={styles["section-title-box"]}>
            <div className={styles["top-id"]}>01</div>
            <div className={styles["title-wrapper"]}>
              <h2 className={styles.title}>
                SERVICE <br /> AREAS
              </h2>
              <span className={styles.subtitle}>업무분야</span>
              <span className={styles.point}></span>
            </div>
          </div>
          <div style={{ padding: "100px 0", textAlign: "center" }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={sectionRef} className={styles["service-section"]}>
      <div className="container">
        <div className={styles["background-circle"]}>
          <h1>Areas of</h1>
          <h1>Expertise</h1>
        </div>

        <div ref={titleRef} className={styles["section-title-box"]}>
          <div className={styles["top-id"]}>01</div>
          <div className={styles["title-wrapper"]}>
            <h2 className={styles.title}>
              SERVICE <br /> AREAS
            </h2>
            <span className={styles.subtitle}>업무분야</span>
            <span className={styles.point}></span>
          </div>
          {/* View More only on desktop */}
          {!isMobile && <ViewMore target="services" />}
        </div>

        <div className={styles["service-content"]}>
          {/* Left side - Tabs */}
          <div className={styles["service-left"]}>
            <div className={styles["service-tabs"]}>
              {categoryGroups.map((group) => (
                <button
                  key={group.majorCategory.id}
                  className={`${styles["service-tabs__btn"]} ${
                    activeTab === String(group.majorCategory.id)
                      ? styles.active
                      : ""
                  }`}
                  onClick={() =>
                    handleTabChange(String(group.majorCategory.id))
                  }
                >
                  <span className={styles["service-tabs__point"]} />

                 <span className={styles["service-tabs__text"]}>{group.majorCategory.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right side - Cards Swiper */}
          <div ref={cardsContainerRef} className={styles["service-right"]}>
            {cards.length > 0 ? (
              <>
                <Swiper
                  breakpoints={{
                    0: {
                      slidesPerView: 1.1,
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
                  className={styles["service-swiper"]}
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
                  <div
                    className={styles["service-progress"]}
                    onClick={handleProgressBarClick}
                  >
                    <div className={styles["service-progress__track"]}>
                      <div
                        className={styles["service-progress__fill"]}
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
          <div className={styles["service-view-more-mobile"]}>
            <ViewMore target="services" />
          </div>
        )}
      </div>
    </div>
  );
});

export default ServiceAreas;
