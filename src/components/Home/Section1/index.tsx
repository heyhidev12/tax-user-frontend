"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import styles from "../styles.module.scss";
import ViewMore from "../../common/ViewMore";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Section1() {
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const h3Ref = useRef<HTMLHeadingElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const leftTitleRef = useRef<HTMLHeadingElement>(null);
  const rightContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    const ctx = gsap.context(() => {
      if (isMobile) {
        // Mobile: Simple fade up (no horizontal movement)
        gsap.set([lineRef.current, h3Ref.current, imageRef.current, leftTitleRef.current, rightContentRef.current], {
          opacity: 0,
          y: 30,
        });

        gsap.to([lineRef.current, h3Ref.current, imageRef.current, leftTitleRef.current, rightContentRef.current], {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
          },
        });
      } else {
        // Desktop: Slow scroll-controlled animations with scrub
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
            end: "top 35%",
            scrub: true,
          },
        });

        // Line flows from top
        gsap.set(lineRef.current, {
          opacity: 0,
          y: -30,
        });

        // Text flows from bottom
        gsap.set(h3Ref.current, {
          opacity: 0,
          y: 50,
        });

        // Image flows from right - SLOW
        gsap.set(imageRef.current, {
          opacity: 0,
          x: 80,
        });

        // Left title flows from left - SLOW
        gsap.set(leftTitleRef.current, {
          opacity: 0,
          x: -60,
        });

        // Right content flows from right - SLOW
        gsap.set(rightContentRef.current, {
          opacity: 0,
          x: 60,
        });

        tl.to(lineRef.current, {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "power2.out",
        })
        .to(h3Ref.current, {
          opacity: 1,
          y: 0,
          duration: 1.5,
          ease: "power2.out",
        }, "-=0.5")
        .to(imageRef.current, {
          opacity: 1,
          x: 0,
          duration: 1.8,
          ease: "power2.out",
        }, "-=0.6")
        .to(leftTitleRef.current, {
          opacity: 1,
          x: 0,
          duration: 1.8,
          ease: "power2.out",
        }, "-=0.8")
        .to(rightContentRef.current, {
          opacity: 1,
          x: 0,
          duration: 1.8,
          ease: "power2.out",
        }, "-=0.8");
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className={styles["section-1"]}>
      <div className={styles["line-center"]}>
        <span ref={lineRef} className={styles.line}></span>
        <h3 ref={h3Ref}>
          우리는 단순한 숫자 관리에 <br className={styles.mobileBr} /> 그치지 않고, <br /> 상황과 목표를 깊이
          이해하여 <br className={styles.mobileBr} /> 가장 적합한 해결책을 제시합니다.
        </h3>
      </div>

      <div ref={imageRef} className={styles["main-image"]}>
        <img src="./images/home/section1.png" alt="" />
      </div>
      <div className="container">
        <div className={styles["trust-partner"]}>
          <div className={styles.left}>
            <h1 ref={leftTitleRef}>
              Your <br /> Trusted Partner
            </h1>
            <ViewMore target="about-intro" />
          </div>

          <div ref={rightContentRef} className={styles.right}>
            <h4>
              <span>세무법인 함께</span>는 변화의 흐름 속에서도 <br /> 고객의
              목표를 함께 바라봅니다.{" "}
            </h4>

            <p>
              고객의 소리를 진심으로 듣고, 고민하며, <br className={styles.mobileBr} />  가장 현명한 길을
              제시합니다.{" "}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
