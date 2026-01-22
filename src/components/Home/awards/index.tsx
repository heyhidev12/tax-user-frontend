"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import styles from './style.module.scss';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { get } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface AwardImage {
  id: number;
  url: string;
}

interface Award {
  id: number;
  name: string;
  source: string;
  image: AwardImage;
  yearName: string;
  yearId: number;
  displayOrder: number;
  isMainExposed: boolean;
}

interface AwardsApiResponse {
  items: Award[];
  total: number;
  page: number;
  limit: number;
  isExposed: boolean;
}

const Awards: React.FC = () => {
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [isExposed, setIsExposed] = useState<boolean>(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const fetchAwards = async () => {
      try {
        const response = await get<AwardsApiResponse>(
          `${API_ENDPOINTS.AWARDS}?page=1&limit=20`
        );

        if (response.data) {
          const { items, isExposed: exposed } = response.data;

          if (exposed === true && items && items.length > 0) {
            // Sort by displayOrder (ascending)
            const sortedAwards = [...items].sort(
              (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
            );
            setAwards(sortedAwards);
            setIsExposed(true);
          } else {
            setAwards([]);
            setIsExposed(false);
          }
        }
      } catch (error) {
        console.error('Failed to fetch awards:', error);
        setAwards([]);
        setIsExposed(false);
      }
    };

    fetchAwards();
  }, []);

  // GSAP Animation - RIGHT slide with scale, scrub enabled
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (!sectionRef.current || awards.length === 0) {
      return;
    }

    const ctx = gsap.context(() => {
      const sliderElement = sectionRef.current?.querySelector(`.${styles['awards-slider']}`);

      if (!sliderElement) return;

      if (isMobile) {
        // Mobile: Simple fade up (no horizontal movement)
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
            trigger: sectionRef.current,
            start: "top 80%",
          },
        });
      } else {
        // Desktop: Slow slide from RIGHT with scale
        gsap.set(sliderElement, {
          opacity: 0,
          x: 80,
          scale: 0.95,
        });

        gsap.to(sliderElement, {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
            end: "top 35%",
            scrub: true,
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [awards.length]);

  // Do not render if not exposed or no items
  if (isExposed === false || awards.length === 0) {
    return null;
  }

  const handlePrev = () => {
    if (swiperInstance) {
      swiperInstance.slidePrev();
    }
  };

  const handleNext = () => {
    if (swiperInstance) {
      swiperInstance.slideNext();
    }
  };

  return (
    <section ref={sectionRef} className={styles['awards-section']}>
      <video className={styles.video} autoPlay loop muted>
          <source src="./videos/home/award.mp4" type="video/mp4" />
        </video>
      <div className={styles['awards-section__union']}>
        <img src="./images/home/union.png" alt="" />
        
      </div>

      <div className={styles['awards-section__content']}>
        <h2 className={styles['awards-section__title']}>AWARDS</h2>

        <div className={styles['awards-slider']}>
          <button
            className={`${styles['awards-slider__nav']} ${styles['awards-slider__nav--prev']}`}
            onClick={handlePrev}
            aria-label="이전"
            type="button"
          >
            <ArrowBack />
          </button>

          <div className={styles['awards-slider__container']}>
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              slidesPerView={1}
              spaceBetween={0}
              centeredSlides={true}
              loop={true}
              speed={500}
              autoplay={{
                delay: 5000,
                disableOnInteraction: false,
              }}
              pagination={{
                el: `.${styles['awards-pagination']}`,
                clickable: true,
                bulletClass: styles['awards-pagination__bullet'],
                bulletActiveClass: styles['awards-pagination__bullet--active'],
              }}
              onSwiper={(swiper) => setSwiperInstance(swiper)}
              className={styles['awards-swiper']}
            >
              {awards.map((award) => (
                <SwiperSlide key={award.id}>
                  <div className={styles['award-item']}>
                      <div className={styles['award-item__certificate']}>
                        <img src={award.image.url} alt={award.name} />
                      </div>
                    <div className={styles['award-item__info']}>
                      <span className={styles['award-item__year']}>
                        {award.yearName} {award.source}
                      </span>
                      <h3 className={styles['award-item__title']}>{award.name}</h3>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          <button
            className={`${styles['awards-slider__nav']} ${styles['awards-slider__nav--next']}`}
            onClick={handleNext}
            aria-label="다음"
            type="button"
          >
            <ArrowForward />
          </button>
        </div>

        <div className={styles['awards-pagination']}></div>
      </div>
    </section>
  );
};

export default Awards;
