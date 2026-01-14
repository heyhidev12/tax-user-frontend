import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import styles from "./style.module.scss";

import "swiper/css";
import "swiper/css/navigation";
import ViewMore from "../../common/ViewMore";
import { get } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/api";

interface SubPhoto {
  id: number;
  url: string;
}

interface WorkArea {
  id: number;
  value: string;
}

interface Member {
  id: number;
  name: string;
  subPhoto: SubPhoto;
  workAreas: WorkArea[];
  oneLineIntro: string;
  displayOrder: number;
}

interface MembersApiResponse {
  items: Member[];
  total: number;
  page: number;
  limit: number;
}

const TrustedExperts: React.FC = () => {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [experts, setExperts] = useState<Member[]>([]);
  const swiperRef = useRef<SwiperType | null>(null);
  const navigationPrevRef = useRef<HTMLButtonElement>(null);
  const navigationNextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await get<MembersApiResponse>(
          `${API_ENDPOINTS.MEMBERS}?page=1&limit=20`
        );

        if (
          response.data &&
          response.data.items &&
          response.data.items.length > 0
        ) {
          // Sort by displayOrder (ascending)
          const sortedMembers = [...response.data.items].sort(
            (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
          );
          setExperts(sortedMembers);
        }
      } catch (error) {
        console.error("Failed to fetch members:", error);
      }
    };

    fetchMembers();
  }, []);

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

  return (
    <section className={styles["trusted-experts"]}>
      
      <div className={styles["trusted-experts__header"]}>
        <div className={styles["trusted-experts__square"]}></div>

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
          modules={[Navigation]}
          spaceBetween={20}
          slidesPerView={4.5}
          loop={false}
          speed={600}
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
              slidesPerView: 1.2,
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
                  <span className={styles["expert-card__quote-mark"]}>"</span>
                  <p className={styles["expert-card__quote"]}>
                    {expert.oneLineIntro}
                  </p>
                  <div className={styles["expert-card__info"]}>
                    <span className={styles["expert-card__name"]}>
                      {expert.name}
                    </span>
                    {expert.workAreas && expert.workAreas.length > 0 && (
                      <>
                        <span className={styles["expert-card__divider"]}>
                          |
                        </span>
                        <span className={styles["expert-card__position"]}>
                          {expert.workAreas[0].value}
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
