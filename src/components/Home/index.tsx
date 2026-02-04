import React, { useState, useCallback } from "react";
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
import Header from "../common/Header";
import Menu from "@/components/Menu";

export interface BannerMedia {
  mediaType: "IMAGE" | "VIDEO";
  media: {
    url: string;
  };
  displayOrder: number;
}

export interface CategoryGroup {
  majorCategory: {
    id: number;
    name: string;
    isExposed: boolean;
    displayOrder: number;
  };
  cards: Array<{
    id: number;
    title: string;
    tags: string[];
    image: string;
  }>;
}

export interface Member {
  id: number;
  name: string;
  subPhoto: {
    id: number;
    url: string;
  };
  workAreas: Array<{
    id: number;
    value: string;
  }>;
  oneLineIntro: string;
  displayOrder: number;
}

export interface Award {
  id: number;
  name: string;
  source: string;
  image: {
    id: number;
    url: string;
  };
  yearName: string;
  yearId: number;
  displayOrder: number;
  isMainExposed: boolean;
}

export interface InsightItem {
  id: number;
  title: string;
  thumbnail: {
    url: string;
  };
  createdAt: string;
  isMainExposed: boolean;
  category?: {
    targetMemberType?: string;
  };
}

export interface KeyCustomer {
  id: number;
  logo: {
    id: number;
    url: string;
  };
  displayOrder: number;
  isMainExposed: boolean;
  isExposed: boolean;
}

interface HomeProps {
  heroBanner: BannerMedia | null;
  serviceAreas: CategoryGroup[];
  experts: Member[];
  awards: Award[];
  awardsIsExposed: boolean;
  insights: InsightItem[];
  clients: KeyCustomer[];
}

export default function Home({
  heroBanner,
  serviceAreas,
  experts,
  awards,
  awardsIsExposed,
  insights,
  clients,
}: HomeProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const handleMenuOpen = useCallback(() => setIsMenuOpen(true), []);
  const handleMenuClose = useCallback(() => setIsMenuOpen(false), []);

  return (
    <div className={`page ${styles["home-page"]}`}>
      {/* <Navbar  /> */}
      <Header
          variant="white"
          onMenuClick={handleMenuOpen}
          isFixed={true}
        />
        <Menu isOpen={isMenuOpen} onClose={handleMenuClose} />
      <HeroSection heroBanner={heroBanner} />

      <Section1 />

      <Section2 />

      <VisionSections />

      <ServiceAreas initialData={serviceAreas} />

      <TrustedExperts experts={experts} />

      <Awards awards={awards} isExposed={awardsIsExposed} />

      <Insight articles={insights} />

      <Clients clients={clients} />

      <ContactUs />
       <div className={styles.floatingButtons}>
        <FloatingButton
          variant="consult"
          label="상담 신청하기"
          onClick={() => router.push("/consultation/apply")}
        />
      </div>

      <Footer />
    </div>
  );
}