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
import { useThrottledResize } from "@/hooks/useThrottledResize";
import type { InsightItem } from "../index";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface InsightProps {
  articles: InsightItem[];
}

const Insight: React.FC<InsightProps> = React.memo(({ articles }) => {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const swiperRef = useRef<SwiperType | null>(null);
  const { isMobile, windowWidth } = useThrottledResize();
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);
  const titleWrapperRef = useRef<HTMLDivElement>(null);

  // Format date from ISO string to YYYY.MM.DD
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  // Update swiper after articles load
  useEffect(() => {
    if (!swiperRef.current) return;

    setTimeout(() => {
      swiperRef.current?.update();
    }, 100);
  }, [articles]);

  // GSAP Animation - Cards slide from RIGHT with stagger, scrub enabled
  useEffect(() => {
    if (!sectionRef.current || articles.length === 0) return;
  
    const isMobile = window.innerWidth < 768;
  
    const ctx = gsap.context(() => {
  
      const header = headerRef.current;
      const slider = sectionRef.current!.querySelector(
        `.${styles["insight-slider"]}`
      );
  
      const cards = sectionRef.current!.querySelectorAll(
        `.${styles["insight-card"]}`
      );
  
      // ========== MOBILE ==========
      if (isMobile) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.12,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: {
              trigger: slider,
              start: "top 85%",
            },
          }
        );
        return;
      }
  
      // ========== DESKTOP HEADER ==========
      if (header) {
        gsap.fromTo(
          header,
          {
            opacity: 0,
            y: 80,
          },
          {
            opacity: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: header,
              start: "top 80%",
              end: "+=300",
              scrub: 0.8,
            },
          }
        );
      }
  
      // ========== DESKTOP CARDS ==========
      gsap.fromTo(
        cards,
        {
          opacity: 0,
          y: 60
        },
        {
          opacity: 1,
          y: 0,
          stagger: 0.12,
          scrollTrigger: {
            trigger: slider,
            start: "top 80%",
          }
        }
      );
      
      
  
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
            watchOverflow={true}
            normalizeSlideIndex={true}
            centeredSlides={false}
            slidesOffsetAfter={40} 
            breakpoints={{
              0: {
                slidesPerView: 1.2,
                spaceBetween: 16,
              },
              576: {
                slidesPerView: 1.8,
                spaceBetween: 18,
              },
              768: {
                slidesPerView: 2.4,
                spaceBetween: 22,
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 22,
              },
              1280: {
                slidesPerView: 3.2,
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
});

export default Insight;
