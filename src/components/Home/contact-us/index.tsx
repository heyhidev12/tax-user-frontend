import React from "react";
import styles from "./style.module.scss";
import { useRouter } from "next/router";

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
            세무의 처음부터 끝까지, 믿을 수 있는 전문가가 직접 안내합니다
          </p>
          <button className={styles["contact-btn"]} onClick={()=>router.push("/consultation/apply")}>상담 신청하기</button>
        </div>
        <div className={styles["contact-us__image"]}></div>
      </div>
    </section>
  );
};

export default ContactUs;
