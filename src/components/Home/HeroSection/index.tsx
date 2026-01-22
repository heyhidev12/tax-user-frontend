"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import styles from "../styles.module.scss";
import { BannerMedia } from "../index";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface HeroSectionProps {
  heroBanner: BannerMedia | null;
}

export default function HeroSection({ heroBanner }: HeroSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  const renderHeroBackground = () => {
    if (heroBanner?.mediaType === "VIDEO") {
      return (
        <video className={styles.videoTag} autoPlay loop muted playsInline>
          <source src={heroBanner.media.url} type="video/mp4" />
        </video>
      );
    }

    // IMAGE
    if (heroBanner?.mediaType === "IMAGE") {
      return (
        <div
          className={styles.videoTag}
          style={{
            backgroundImage: `url(${heroBanner?.media.url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      );
    }

    return (
      <video className={styles.videoTag} autoPlay loop muted>
        <source src="./videos/home/main.mp4" type="video/mp4" />
      </video>
    );
  };

  useEffect(() => {
    if (!containerRef.current || !titleRef.current || !subtitleRef.current) {
      return;
    }

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    const ctx = gsap.context(() => {
      if (isMobile) {
        // Mobile: Simple fade up
        gsap.set([titleRef.current, subtitleRef.current], {
          opacity: 0,
          y: 30,
        });

        gsap.to([titleRef.current, subtitleRef.current], {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
          },
        });
      } else {
        // Desktop: RIGHT → CENTER with scrub
        gsap.set([titleRef.current, subtitleRef.current], {
          opacity: 0,
          x: 120,
        });

        gsap.to([titleRef.current, subtitleRef.current], {
          opacity: 1,
          x: 0,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
            end: "top 40%",
            scrub: true,
          },
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={containerRef} className={styles.main}>
      {renderHeroBackground()}
      <div className={styles["main-container"]}>
        <p ref={subtitleRef}>Tax Accounting Together</p>
        <h1 ref={titleRef}>
          <span>고객이 걸어갈 길,</span> <br /> 세무법인 함께 <span>가 <br className={styles.mobileBr} /> 동행합니다</span>
        </h1>
      </div>
    </main>
  );
}
