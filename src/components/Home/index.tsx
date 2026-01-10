import { useEffect, useState } from "react";
import Navbar from "../common/Navbar/Navbar";
import ViewMore from "../common/ViewMore";
import Footer from "@/components/Footer";
// import Footer from "../Footer";
import Awards from "./awards";
import Clients from "./clients";
import ContactUs from "./contact-us";
import Insight from "./insight";
import ServiceAreas from "./service-areas";
import TrustedExperts from "./trusted-experts";
import VisionSections from "./vision-section";
import styles from "./styles.module.scss";
import { get } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/api";

interface BannerMedia {
  mediaType: "IMAGE" | "VIDEO";
  media: {
    url: string;
  };
  displayOrder: number;
}

type BannersApiResponse =
  | BannerMedia[]
  | {
    items?: BannerMedia[];
    data?: BannerMedia[] | { items?: BannerMedia[] };
  };

export default function Home() {
  const [heroBanner, setHeroBanner] = useState<BannerMedia | null>(null);

  useEffect(() => {
    const fetchBanners = async () => {
      const response = await get<BannerMedia[]>(API_ENDPOINTS.BANNERS);
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const sorted = [...response.data].sort(
          (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
        );
        setHeroBanner(response.data[0]);

      } else {
        setHeroBanner(null);
      }
    };

    fetchBanners();
  }, []);


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

  return (
    <div className={`page ${styles["home-page"]}`}>
      <Navbar />
      <main className={styles.main}>
        {renderHeroBackground()}
        <div className={styles["main-container"]}>
          <p>Tax Accounting Together</p>
          <h1>
            <span>고객이 걸어갈 길,</span> <br /> 세무법인 함께가 동행합니다
          </h1>
        </div>
      </main>

      <section className={styles["section-1"]}>
        <div className={styles["line-center"]}>
          <span className={styles.line}></span>
          <h3>
            우리는 단순한 숫자 관리에 그치지 않고, <br /> 상황과 목표를 깊이
            이해하여 가장 적합한 해결책을 제시합니다.
          </h3>
        </div>

        <div className={styles["main-image"]}>
          <img src="./images/home/section1.png" alt="" />
        </div>
        <div className="container">
          <div className={styles["trust-partner"]}>
            <div className={styles.left}>
              <h1>
                Your <br /> Trusted Partner
              </h1>
              <ViewMore />
            </div>

            <div className={styles.right}>
              <h4>
                <span>세무법인 함께</span>는 변화의 흐름 속에서도 <br /> 고객의
                목표를 함께 바라봅니다.{" "}
              </h4>

              <p>
                고객의 소리를 진심으로 듣고, 고민하며, 가장 현명한 길을
                제시합니다.{" "}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles["section-2"]}>
        <div className={styles["tax-account"]}>
          <div className={styles["left-img"]}>
            <img src="./images/home/tax-account.png" alt="" />
          </div>
          <h1>
            Tax Accounting <br />
            Together
          </h1>
        </div>

        <div className="container">
          <div className={styles["tax-account-text"]}>
<h3> 고객이<span> 믿고 맡길 수 있는 세무 파트너,</span>  <br /> 그 신뢰가 곧 우리가 지향하는 <br /> ‘세무법인 함께’의 가치입니다.</h3>
          <div className={styles["right-img"]}>
            <img src="./images/home/tax-account2.png" alt="" />
          </div>
          </div>
          
        </div>
      </section>

      <VisionSections />

      <ServiceAreas />

      <TrustedExperts />

      <Awards />

      <Insight />

      <Clients />

      <ContactUs />

      <Footer />
    </div>
  );
}