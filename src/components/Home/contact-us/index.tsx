import React from "react";
import styles from "./style.module.scss";
import { useRouter } from "next/router";
import { ArrowForward } from "@mui/icons-material";

const ContactUs: React.FC = () => {
  const router = useRouter();
  return (
    <section className={styles["contact-us"]}>
      <div className="container">
        <video className={styles.video} autoPlay loop muted>
          <source src="./videos/home/contact.mp4" type="video/mp4" />
        </video>
        <div className={styles["contact-us__content"]}>
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
