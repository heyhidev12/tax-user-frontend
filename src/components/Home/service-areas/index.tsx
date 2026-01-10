import { useState, useRef, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import styles from "./service.module.scss";

import { industryCards, consultingCards, categoryTabs } from "./data";
import type { ServiceCard } from "./data";
import ViewMore from "../../common/ViewMore";

export default function ServiceAreas() {
  const [activeTab, setActiveTab] = useState("industry");
  const [progress, setProgress] = useState(0.5);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const swiperRef = useRef<SwiperType | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const cards = activeTab === "industry" ? industryCards : consultingCards;

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

  const slides = isMobile ? getMobileSlides() : getDesktopSlides();

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
          {slideCards[3] && renderCard(slideCards[3])}
        </div>
        <div className={styles['cards-column']}>
          {slideCards[1] && renderCard(slideCards[1])}
          {slideCards[4] && renderCard(slideCards[4])}
        </div>
        <div className={`${styles['cards-column']} ${styles['cards-column--offset']}`}>
          {slideCards[2] && renderCard(slideCards[2])}
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
          {slideCards[2] && renderCard(slideCards[2])}
        </div>
        <div className={`${styles['cards-column']} ${styles['cards-column--offset']}`}>
          {slideCards[1] && renderCard(slideCards[1])}
          {slideCards[3] && renderCard(slideCards[3])}
        </div>
      </div>
    );
  };

  // Mobile: Render 4-card grid (2 columns with offset, 2 rows each)
  // If only 2 cards, render them vertically stacked
  const renderMobileGrid = (slideCards: ServiceCard[]) => {
    // If 2 or fewer cards, stack them vertically
    if (slideCards.length <= 2) {
      return (
        <div className={`${styles['cards-grid']} ${styles['cards-grid--mobile-vertical']}`}>
          <div className={styles['cards-column']}>
            {slideCards[0] && renderCard(slideCards[0])}
            {slideCards[1] && renderCard(slideCards[1])}
          </div>
        </div>
      );
    }

    return (
      <div className={`${styles['cards-grid']} ${styles['cards-grid--mobile']}`}>
        {/* Column 1 - offset down */}
        <div className={`${styles['cards-column']} ${styles['cards-column--offset']}`}>
          {slideCards[0] && renderCard(slideCards[0])}
          {slideCards[2] && renderCard(slideCards[2])}
        </div>
        {/* Column 2 - starts at top */}
        <div className={styles['cards-column']}>
          {slideCards[1] && renderCard(slideCards[1])}
          {slideCards[3] && renderCard(slideCards[3])}
        </div>
      </div>
    );
  };

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
          {!isMobile && <ViewMore />}
        </div>

        <div className={styles['service-content']}>
          {/* Left side - Tabs */}
          <div className={styles['service-left']}>
            <div className={styles['service-tabs']}>
              <span className={styles['service-tabs__point']} />
              {categoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`${styles['service-tabs__btn']} ${activeTab === tab.id ? styles.active : ""
                    }`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right side - Cards Swiper */}
          <div className={styles['service-right']}>
            <Swiper
              spaceBetween={isMobile ? 16 : 0}
              slidesPerView={isMobile ? "auto" : 1}
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
              }}
              onProgress={handleProgress}
              className={styles['service-swiper']}
            >
              {slides.map((slideCards, slideIndex) => (
                <SwiperSlide key={slideIndex}>
                  {isMobile
                    ? renderMobileGrid(slideCards)
                    : slideIndex === 0
                      ? renderSixCardGrid(slideCards)
                      : renderFourCardGrid(slideCards)}
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Progress Bar */}
            <div className={styles['service-progress']} onClick={handleProgressBarClick}>
              <div className={styles['service-progress__track']}>
                <div
                  className={styles['service-progress__fill']}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* View More button - moved to bottom for mobile */}
        {isMobile && (
          <div className={styles['service-view-more-mobile']}>
            <ViewMore />
          </div>
        )}


      </div>
    </div>
  );
}
