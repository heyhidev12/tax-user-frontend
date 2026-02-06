"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import styles from "./style.module.scss";

import "swiper/css";
import "swiper/css/navigation";
import ViewMore from "../../common/ViewMore";
import type { Member } from "../index";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface TrustedExpertsProps {
  experts: Member[];
}

const TrustedExperts: React.FC<TrustedExpertsProps> = ({ experts }) => {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const swiperRef = useRef<SwiperType | null>(null);
  const navigationPrevRef = useRef<HTMLButtonElement>(null);
  const navigationNextRef = useRef<HTMLButtonElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // GSAP Animation - RIGHT → CENTER with scrub
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (!sectionRef.current || experts.length === 0) {
      return;
    }

    const ctx = gsap.context(() => {
      const headerElement = sectionRef.current?.querySelector(
        `.${styles["trusted-experts__header"]}`,
      );
      const sliderElement = sectionRef.current?.querySelector(
        `.${styles["trusted-experts__slider"]}`,
      );

      if (isMobile) {
        // Mobile: Simple fade up (no horizontal movement)
        if (headerElement) {
          gsap.set(headerElement, {
            opacity: 0,
            y: 40,
          });

          gsap.to(headerElement, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 80%",
            },
          });
        }

        if (sliderElement) {
          gsap.set(sliderElement, {
            opacity: 0,
            y: 40,
          });

          gsap.to(sliderElement, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sliderElement,
              start: "top 80%",
            },
          });
        }
      } else {
        // Desktop: RIGHT → CENTER with scrub
        if (headerElement) {
          gsap.set(headerElement, {
            opacity: 0,
            y: 50,
          });

          gsap.to(headerElement, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 85%",
            },
          });
        }

        if (sliderElement) {
          gsap.set(sliderElement, {
            opacity: 0,
            x: 300,
          });

          gsap.to(sliderElement, {
            opacity: 1,
            x: 0,
            duration: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 75%",
              end: "+=700",
              scrub: 1.2,
            },
          });
        }
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [experts.length]);

  const handleProgress = (_swiper: SwiperType, progressValue: number) => {
    setProgress(progressValue);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (swiperRef.current) {
      const bar = e.currentTarget;
      const rect = bar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const totalSlides = experts.length;
      const slidesPerView = swiperRef.current.params.slidesPerView as number;
      const maxIndex = Math.max(0, totalSlides - Math.floor(slidesPerView));
      const targetIndex = Math.round(percentage * maxIndex);
      swiperRef.current.slideTo(targetIndex);
    }
  };

  // Don't render if no experts
  if (!experts || experts.length === 0) {
    return null;
  }

  return (
    <section ref={sectionRef} className={styles["trusted-experts"]}>
      <div className={styles["trusted-experts__square"]}></div>

      <div className={styles["trusted-experts__header"]}>
        <div className={styles["trusted-experts__title-area"]}>
          <span className={styles["trusted-experts__number"]}>02</span>
          <div className={styles["trusted-experts__title-content"]}>
            <span className={styles["trusted-experts__label"]}>
              <span className={styles.dot}></span>
              전문가 소개
            </span>
            <h2 className={styles["trusted-experts__title"]}>
              TRUSTED
              <br />
              EXPERTS
            </h2>
          </div>
          <div className={styles.viewMore}>
            <ViewMore target="experts" />
          </div>
        </div>
      </div>

      <div className={styles["trusted-experts__slider"]}>
        <Swiper
          modules={[Navigation, Autoplay]}
          spaceBetween={20}
          slidesPerView={4.5}
          speed={1500}
          loop={true}
          autoplay={{
            delay: 1000,
            disableOnInteraction: false,
          }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          onProgress={handleProgress}
          navigation={{
            prevEl: navigationPrevRef.current,
            nextEl: navigationNextRef.current,
          }}
          breakpoints={{
            0: {
              slidesPerView: 1.42,
              spaceBetween: 16,
            },
            576: {
              slidesPerView: 2,
              spaceBetween: 18,
            },
            768: {
              slidesPerView: 3,
              spaceBetween: 20,
            },
            1024: {
              slidesPerView: 3.5,
              spaceBetween: 20,
            },
            1280: {
              slidesPerView: 4.5,
              spaceBetween: 24,
            },
          }}
          onInit={(swiper) => {
            // @ts-ignore
            swiper.params.navigation.prevEl = navigationPrevRef.current;
            // @ts-ignore
            swiper.params.navigation.nextEl = navigationNextRef.current;
            swiper.navigation.init();
            swiper.navigation.update();
          }}
          className={styles["experts-swiper"]}
        >
          {experts.map((expert) => (
            <SwiperSlide key={expert.id}>
              <div
                className={styles["expert-card"]}
                onClick={() => router.push(`/experts/${expert.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div className={styles["expert-card__image"]}>
                  <img
                    src={expert.subPhoto?.url || ""}
                    alt={expert.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://via.placeholder.com/400x600/e8e8e8/999999?text=Expert";
                    }}
                  />
                </div>
                <div className={styles["expert-card__content"]}>
                  <span className={styles["expert-card__quote-mark"]}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="22"
                      viewBox="0 0 24 22"
                      fill="none"
                    >
                      <path
                        d="M10.0138 16.3862C10.0138 17.8428 9.5586 18.9352 8.6483 19.8455C7.73793 20.7559 6.64551 21.12 5.37103 21.12C3.73241 21.12 2.45793 20.4828 1.45655 19.2083C0.45517 17.9338 0 16.4772 0 14.6566C0 11.5614 0.72827 8.7393 2.36689 6.09931C4.00551 3.45931 6.09931 1.45655 8.6483 0L9.7407 1.45655C8.1931 2.45793 6.82758 3.82345 5.73517 5.46207C4.64276 7.19172 4.00551 8.8303 3.91448 10.469C3.55034 11.7435 3.82344 12.2897 4.73379 12.1076C5.00689 12.0166 5.28 11.9255 5.5531 11.9255H6.37241C7.37379 12.1076 8.1931 12.6538 8.9214 13.3821C9.6497 14.2014 10.0138 15.2028 10.0138 16.3862ZM23.669 16.3862C23.669 17.8428 23.2138 18.9352 22.3034 19.8455C21.3931 20.7559 20.3007 21.12 19.0262 21.12C17.3876 21.12 16.1131 20.4828 15.1117 19.2083C14.0193 17.9338 13.5641 16.4772 13.5641 14.6566C13.5641 11.6524 14.3834 8.8303 16.0221 6.09931C17.6607 3.45931 19.7545 1.45655 22.3034 0L23.3959 1.45655C21.8483 2.45793 20.4828 3.82345 19.3903 5.46207C18.2979 7.19172 17.6607 8.8303 17.4786 10.469C17.2055 11.6524 17.4786 12.1986 18.389 12.1076C18.571 12.0166 18.8441 11.9255 19.1172 11.9255H20.0276C21.029 12.1076 21.8483 12.6538 22.5766 13.3821C23.3048 14.2014 23.669 15.2028 23.669 16.3862Z"
                        fill="white"
                      />
                    </svg>
                  </span>
                  <p className={styles["expert-card__quote"]}>
                    {expert.oneLineIntro}
                  </p>
                  <div className={styles["expert-card__info"]}>
                    <span className={styles["expert-card__name"]}>
                      {expert.name}
                    </span>
                    {expert.categories && expert.categories.length > 0 && (
                      <>
                        <span className={styles["expert-card__divider"]}>
                          |
                        </span>
                        <span className={styles["expert-card__position"]}>
                          {expert.categories[0].categoryName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        <div className={styles["view-block"]}>
          <ViewMore target="experts" />
        </div>
      </div>

      {/* Continuous Progress Bar */}
      <div
        className={styles["trusted-experts__progress"]}
        onClick={handleProgressBarClick}
      >
        <div className={styles["trusted-experts__progress-track"]}>
          <div
            className={styles["trusted-experts__progress-fill"]}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </section>
  );
};

export default TrustedExperts;
