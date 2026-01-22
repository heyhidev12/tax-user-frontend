import Navbar from "../common/Navbar/Navbar";
import Footer from "@/components/Footer";
import Awards from "./awards";
import Clients from "./clients";
import ContactUs from "./contact-us";
import Insight from "./insight";
import ServiceAreas from "./service-areas";
import TrustedExperts from "./trusted-experts";
import VisionSections from "./vision-section";
import HeroSection from "./HeroSection";
import Section1 from "./Section1";
import Section2 from "./Section2";
import styles from "./styles.module.scss";
import FloatingButton from "../common/FloatingButton";
import { useRouter } from "next/router";

export interface BannerMedia {
  mediaType: "IMAGE" | "VIDEO";
  media: {
    url: string;
  };
  displayOrder: number;
}

interface HomeProps {
  heroBanner: BannerMedia | null;
}

export default function Home({ heroBanner }: HomeProps) {
  const router = useRouter();

  return (
    <div className={`page ${styles["home-page"]}`}>
      <Navbar />
      <HeroSection heroBanner={heroBanner} />

      <Section1 />

      <Section2 />

      <VisionSections />

      <ServiceAreas />

      <TrustedExperts />

      <Awards />

      <Insight />

      <Clients />

      <ContactUs />
       <div className={styles.floatingButtons}>
        <FloatingButton
          variant="consult"
          label="상담 신청하기"
          onClick={() => router.push("/consultation/apply")}
        />
        <FloatingButton
          variant="top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        />
      </div>

      <Footer />
    </div>
  );
}