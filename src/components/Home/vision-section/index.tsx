import { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import styles from "./vision.module.scss";

export default function VisionSections() {
  const [active, setActive] = useState<null | number>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const videos = [
    "/videos/home/expertise.mp4",
    "/videos/home/consulting.mp4",
    "/videos/home/trust.mp4",
  ];

  const contents = [
    {
      title: "전문성",
      subtitle: "Expertise",
      text: (
        <>
          깊이 있는 세무 지식과
          <br className={styles.mobileBr} />
          풍부한 실무 경험을 바탕으로
          <br className={styles.mobileBr} />
          복잡한 세무 환경에서도 정확하고
          <br className={styles.mobileBr} />
          신뢰할 수 있는 해답을 제공합니다.
        </>
      ),
      text2: "전문가는 복잡함 속에서도 명확함을 제시합니다.",
    },
    {
      title: "통합컨설팅",
      subtitle: "Integrated Consulting",
      text: (
        <>
          세무, 회계, 재무, 경영을 하나로 연결한
          <br className={styles.mobileBr} />
          통합 솔루션을 제공합니다.
          <br className={styles.mobileBr} />
          단순한 신고와 계산을 넘어, 비즈니스 전반의
          <br className={styles.mobileBr} />
          방향성과 성장을 함께 설계합니다.
        </>
      ),
      text2: "숫자 이상의 가치를 제안합니다.",
    },
    {
      title: "동행과 신뢰",
      subtitle: "Partnership & Trust",
      text: (
        <>
          고객의 현재를 이해하고
          <br className={styles.mobileBr} />
          미래를 함께 고민하는 든든한 파트너로서,
          <br className={styles.mobileBr} />
          장기적 신뢰 관계를 바탕으로
          <br className={styles.mobileBr} />
          꾸준히 함께 나아갑니다.
        </>
      ),
      text2: "언제나 곁에서 함께하는 세무법인.",
    },
  ];

  // Mobile Swiper View
  if (isMobile) {
    return (
      <div
        className={`${styles["vision-container"]} ${styles["vision-container--mobile"]}`}
      >
        <Swiper
          modules={[Pagination]}
          slidesPerView={1}
          spaceBetween={0}
          pagination={{
            clickable: true,
            el: `.${styles["vision-pagination"]}`,
          }}
          className={styles["vision-swiper"]}
        >
          {contents.map((item, index) => (
            <SwiperSlide key={index}>
              <div className={styles["vision-slide"]}>
                {/* Video Background */}
                <video
                  className={styles["vision-slide__video"]}
                  src={videos[index]}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
                <div className={styles["vision-slide__overlay"]} />
                <div className={styles["vision-slide__content"]}>
                  <h2 className={styles["vision-slide__main-title"]}>
                    Our Vision
                  </h2>
                  <p className={styles["vision-slide__desc"]}>
                    체계적인 세무관리와 맞춤형 전략으로,
                    <br />
                    함께할 수 있는 우리의 가치를 소개합니다.
                  </p>

                  <div className={styles["vision-slide__card"]}>
                    <h3 className={styles["vision-slide__title"]}>
                      {item.title}
                    </h3>
                    <span className={styles["vision-slide__subtitle"]}>
                      {item.subtitle}
                    </span>
                    <p className={styles["vision-slide__text"]}>{item.text}</p>
                    <div className={styles["vision-slide__divider"]} />
                    <p className={styles["vision-slide__text2"]}>
                      {item.text2}
                    </p>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        <div className={styles["vision-pagination"]} />
      </div>
    );
  }

  // Desktop View
  return (
    <div className={styles["vision-container"]}>
      {active === null ? (
        <img
          src="./images/home/vision.png"
          alt=""
          className={styles["background-img"]}
        />
      ) : (
        <video
          key={active}
          className={styles["background-video"]}
          src={videos[active]}
          autoPlay
          muted
          loop
        />
      )}

      <div className={styles.overlay}>
        <h2 className={styles["section-title"]}>Our Vision</h2>
        <p className={styles["section-desc"]}>
          복잡한 세상과의 연결을 한결같고, 믿음직 할 수 있는 오래된 가치를
          소개합니다.
        </p>

        <div className={styles.grid} onMouseLeave={() => setActive(null)}>
          {contents.map((item, index) => (
            <div
              key={index}
              className={`${styles["grid-item"]} ${active === index ? styles.active : ""}`}
              onMouseEnter={() => setActive(index)}
            >
              <h3>{item.title}</h3>
              <span className={styles.subtitle}>{item.subtitle}</span>
              <p className={styles.text}>{item.text}</p>
              <span></span>
              <p className={styles.text}>{item.text2}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
