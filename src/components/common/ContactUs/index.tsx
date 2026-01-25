import React from "react";
import styles from "./style.module.scss";
import { useRouter } from "next/router";

interface ContactUsProps {
  categoryId?: number;
}

const ContactUs: React.FC<ContactUsProps> = ({ categoryId }) => {
  const router = useRouter();
  const handleConsultationClick = () => {
    if (categoryId) {
      router.push(`/consultation/apply?categoryId=${categoryId}`);
    } else {
      router.push("/consultation/apply");
    }
  };

  return (
    <section className={styles["contact-us"]}>
        <div className="container">
          {/* <img src="/images/pages/bg_img.png" alt="" /> */}

          <div className={styles["contact-us__content"]}>
            <h2>Contact</h2>
            <p className={styles.subtitle}>경험과 전문성을 바탕으로, <br />
맞춤형 세무 해답을 제시합니다</p>
            <button
              className={styles["contact-btn"]}
              onClick={handleConsultationClick}
            >
              상담 신청하기
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
