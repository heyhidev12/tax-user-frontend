import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import styles from "./style.module.scss";
import ViewMore from "../../common/ViewMore";
import { get } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/api";

interface InsightThumbnail {
  url: string;
}

interface InsightItem {
  id: number;
  title: string;
  thumbnail: InsightThumbnail;
  createdAt: string;
  isMainExposed: boolean;
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
          setArticles(exposedItems);
        }
      } catch (error) {
        console.error("Failed to fetch insights:", error);
      }
    };

    fetchInsights();
  }, []);

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
    <section className={styles["insight-section"]}>
      <div className={styles.back}></div>
      <div className="container">
        <div className={styles["insight-header"]}>
          <div className={styles["insight-header__number"]}>03</div>
          <div className={styles["insight-header__title-wrapper"]}>
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
                slidesPerView: 1.1,
                spaceBetween: 16,
              },
              576: {
                slidesPerView: 1.8,
                spaceBetween: 18,
              },

              768: {
                slidesPerView: 2.5,
                spaceBetween: 22,
              },
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
