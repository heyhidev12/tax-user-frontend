"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import "swiper/css";
import styles from "./style.module.scss";
import ViewMore from "../../common/ViewMore";
import { get } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/api";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface InsightThumbnail {
  url: string;
}

interface InsightItem {
  id: number;
  title: string;
  thumbnail: InsightThumbnail;
  createdAt: string;
  isMainExposed: boolean;
  category?: {
    targetMemberType?: string;
  };
}

interface InsightsApiResponse {
  items: InsightItem[];
  total: number;
  page: number;
  limit: number;
}

const Insight: React.FC = () => {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [articles, setArticles] = useState<InsightItem[]>([]);
  const swiperRef = useRef<SwiperType | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(0);
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);
  const titleWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setIsMobile(width <= 768);
    };

    // Set initial value
    if (typeof window !== "undefined") {
      checkScreenSize();
      window.addEventListener("resize", checkScreenSize);
      return () => window.removeEventListener("resize", checkScreenSize);
    }
  }, []);
  // Format date from ISO string to YYYY.MM.DD
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await get<InsightsApiResponse>(
          `${API_ENDPOINTS.INSIGHTS}?page=1&limit=20`
        );

        if (
          response.data &&
          response.data.items &&
          response.data.items.length > 0
        ) {
          // Filter only items where isMainExposed === true
          const exposedItems = response.data.items.filter(
            (item) => item.isMainExposed === true
          );
          
          // Filter only items where category.targetMemberType === "ALL"
          // Exclude items if category is missing or targetMemberType is undefined
          const visibleItems = exposedItems.filter(
            (item) => item.category?.targetMemberType === "ALL"
          );
          
          setArticles(visibleItems);
        }
      } catch (error) {
        console.error("Failed to fetch insights:", error);
      }
    };

    fetchInsights();
  }, []);

  // GSAP Animation - Cards slide from RIGHT with stagger, scrub enabled
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (!sectionRef.current || articles.length === 0) {
      return;
    }

    const ctx = gsap.context(() => {
      const sliderElement = sectionRef.current?.querySelector(`.${styles["insight-slider"]}`);

      if (!sliderElement) return;

      const setupCards = () => {
        const cardElements = sectionRef.current?.querySelectorAll(`.${styles["insight-card"]}`) || [];
        
        if (cardElements.length === 0) {
          requestAnimationFrame(setupCards);
          return;
        }

        if (isMobile) {
          // Mobile: Simple fade up (no horizontal movement)
          gsap.set(cardElements, {
            opacity: 0,
            y: 40,
          });

          gsap.to(cardElements, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.12,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 80%",
            },
          });
        } else {
          // Desktop: Cards slide from RIGHT with stagger, scrub enabled
          gsap.set(cardElements, {
            opacity: 0,
            x: 100,
          });

          gsap.to(cardElements, {
            opacity: 1,
            x: 0,
            duration: 1,
            stagger: 0.15,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 75%",
              end: "top 35%",
              scrub: true,
            },
          });
        }
      };

      setupCards();
    }, sectionRef);

    return () => ctx.revert();
  }, [articles.length]);

  const handleProgress = (swiper: SwiperType, progressValue: number) => {
    setProgress(progressValue);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (swiperRef.current) {
      const bar = e.currentTarget;
      const rect = bar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const totalSlides = swiperRef.current.slides.length;
      const slidesPerView = swiperRef.current.params.slidesPerView as number;
      const maxIndex = Math.max(0, totalSlides - Math.floor(slidesPerView));
      const targetIndex = Math.round(percentage * maxIndex);
      swiperRef.current.slideTo(targetIndex);
    }
  };

  return (
    <section ref={sectionRef} className={styles["insight-section"]}>
      <div className={styles.back}></div>
      <div className={styles["insight-container"]}>
        <div ref={headerRef} className={styles["insight-header"]}>
          <div ref={numberRef} className={styles["insight-header__number"]}>03</div>
          <div ref={titleWrapperRef} className={styles["insight-header__title-wrapper"]}>
            <h2 className={styles["insight-header__title"]}>
              INSIGHT
              <span className={styles["insight-header__subtitle"]}>
                인사이트
              </span>
              <span className={styles["insight-header__dot"]}></span>
            </h2>
          </div>
        </div>
        {!isMobile && <ViewMore target="insights" />}
        <div className={styles["insight-slider"]}>
          <Swiper
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            onProgress={handleProgress}
            slidesPerView={1}
            spaceBetween={20}
            loop={false}
            grabCursor={true}
            breakpoints={{
              0: {
                slidesPerView: 1.2,
                spaceBetween: 16,
              },
              576: {
                slidesPerView: 2.8,
                spaceBetween: 18,
              },

              768: {
                slidesPerView: 3,
                spaceBetween: 22,
              },
              1280:{
                slidesPerView: 4,
                spaceBetween: 20,
              }
            }}
            className={styles["insight-swiper"]}
          >
            {articles.map((article) => (
              <SwiperSlide key={article.id}>
                <article
                  className={styles["insight-card"]}
                  onClick={() => router.push(`/insights/${article.id}`)}
                >
                  <div className={styles["insight-card__image"]}>
                    <img
                      src={article.thumbnail?.url || ""}
                      alt={article.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://via.placeholder.com/400x300/e8e8e8/999999?text=Insight";
                      }}
                    />
                  </div>
                  <div className={styles["insight-card__content"]}>
                    <h3 className={styles["insight-card__title"]}>
                      {article.title}
                    </h3>
                    <span className={styles["insight-card__date"]}>
                      {formatDate(article.createdAt)}
                    </span>
                  </div>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div
          className={styles["insight-progress"]}
          onClick={handleProgressBarClick}
        >
          <div className={styles["insight-progress__track"]}>
            <div
              className={styles["insight-progress__fill"]}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {isMobile && (
          <div className={styles["insight-footer"]}>
            <ViewMore target="insights" />
          </div>
        )}
      </div>
    </section>
  );
};

export default Insight;
