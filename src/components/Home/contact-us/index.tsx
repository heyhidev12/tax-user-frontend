"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import styles from "./style.module.scss";
import { useRouter } from "next/router";
import { ArrowForward } from "@mui/icons-material";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const ContactUs: React.FC = () => {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !contentRef.current) return;

    const ctx = gsap.context(() => {
      gsap.set(contentRef.current, {
        opacity: 0,
        y: 30,
      });

      gsap.to(contentRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className={styles["contact-us"]}>
      <div className="container">
        <video className={styles.video} autoPlay loop muted>
          <source src="./videos/home/contact.mp4" type="video/mp4" />
        </video>
        <div ref={contentRef} className={styles["contact-us__content"]}>
          <h2>Contact Us</h2>
          <p className={styles.subtitle}>세무 전문가의 상담을 받아보세요</p>
          <p className={styles.description}>
            세무의 처음부터 끝까지, <br className={styles.mobileBr} /> 믿을 수
            있는 전문가가 직접 안내합니다
          </p>
          <button
            className={styles["contact-btn"]}
            onClick={() => router.push("/consultation/apply")}
          >
            상담 신청하기{" "}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <g clip-path="url(#clip0_1934_41253)">
                <path
                  d="M3.75 12L20.25 12"
                  stroke="white"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M13.5 5.25L20.25 12L13.5 18.75"
                  stroke="white"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
              <defs>
                <clipPath id="clip0_1934_41253">
                  <rect width="24" height="24" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </button>
        </div>
        <div className={styles["contact-us__image"]}></div>
      </div>
    </section>
  );
};

export default ContactUs;
