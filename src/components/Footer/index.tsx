import React from "react";
import { useRouter } from "next/router";
import styles from "./styles.module.scss";

const Footer: React.FC = () => {
  const router = useRouter();

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footer__top}>
          <div className={styles.footer__logo}>
            <img src="/images/logo/logo.svg" alt="" />
          </div>
          <div className={styles.footer__links}>
            <div className={styles.footer__link}>
              <a>서비스이용약관</a>
              <a>개인정보처리방침</a>
            </div>

            <button className={styles["family-btn"]}>패밀리 사이트 →</button>
          </div>
        </div>

        <div className={styles.footer__bottom}>
          <p className={styles.copyright}>
            2025 TAX ACCOUNTING TOGETHER all rights reserved.
          </p>
          <nav className={styles.footer__menu}>
            <a onClick={() => router.push("/business-areas/hierarchical")}>
              업무분야
            </a>
            <a onClick={() => router.push("/experts")}>전문가 소개</a>
            <a onClick={() => router.push("/education")}>교육/세미나</a>
            <a onClick={() => router.push("/history?tab=intro")}>함께소개</a>
            <a onClick={() => router.push("/insights")}>인사이트</a>
            <a onClick={() => router.push("/report")}>신고 대리</a>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
