"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { get } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/api";

// TypeScript interfaces
export interface FooterPolicy {
  id: number;
  type: "TERMS" | "PRIVACY";
  title: string;
  content: string; // HTML content
}

export interface FamilySite {
  id: number;
  name: string;
  url: string;
}

interface FooterContextType {
  // Family Sites
  familySites: FamilySite[];
  familySitesLoading: boolean;
  familySitesError: string | null;
  fetchFamilySites: () => Promise<void>;

  // Policies
  termsPolicy: FooterPolicy | null;
  privacyPolicy: FooterPolicy | null;
  policyLoading: boolean;
  policyError: string | null;
  fetchPolicy: (type: "TERMS" | "PRIVACY") => Promise<FooterPolicy | null>;

  // Initialization flag
  isInitialized: boolean;
}

const FooterContext = createContext<FooterContextType | undefined>(undefined);

interface FooterProviderProps {
  children: ReactNode;
}

export function FooterProvider({ children }: FooterProviderProps) {
  // Family Sites state
  const [familySites, setFamilySites] = useState<FamilySite[]>([]);
  const [familySitesLoading, setFamilySitesLoading] = useState(false);
  const [familySitesError, setFamilySitesError] = useState<string | null>(null);

  // Policies state
  const [termsPolicy, setTermsPolicy] = useState<FooterPolicy | null>(null);
  const [privacyPolicy, setPrivacyPolicy] = useState<FooterPolicy | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);

  // Initialization flag
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch family sites
  const fetchFamilySites = useCallback(async () => {
    // Check if already fetched
    if (familySites.length > 0 || familySitesLoading) return;

    setFamilySitesLoading(true);
    setFamilySitesError(null);

    try {
      const response = await get<FamilySite[]>(API_ENDPOINTS.FOOTER.FAMILY_SITES);

      if (response.error) {
        setFamilySitesError(response.error);
        return;
      }

      if (response.data) {
        setFamilySites(response.data);
      }
    } catch (err) {
      setFamilySitesError("패밀리 사이트를 불러오는 데 실패했습니다.");
    } finally {
      setFamilySitesLoading(false);
    }
  }, [familySites.length, familySitesLoading]);

  // Fetch policy (on-demand with caching)
  const fetchPolicy = useCallback(
    async (type: "TERMS" | "PRIVACY"): Promise<FooterPolicy | null> => {
      // Check cache first
      if (type === "TERMS" && termsPolicy) return termsPolicy;
      if (type === "PRIVACY" && privacyPolicy) return privacyPolicy;

      setPolicyLoading(true);
      setPolicyError(null);

      try {
        const response = await get<FooterPolicy[]>(
          `${API_ENDPOINTS.FOOTER.POLICIES}?type=${type}`
        );

        if (response.error) {
          setPolicyError(response.error);
          return null;
        }

        if (response.data && response.data.length > 0) {
          const policy = response.data[0];

          // Cache the result
          if (type === "TERMS") {
            setTermsPolicy(policy);
          } else {
            setPrivacyPolicy(policy);
          }

          return policy;
        }

        return null;
      } catch (err) {
        setPolicyError("정책 정보를 불러오는 데 실패했습니다.");
        return null;
      } finally {
        setPolicyLoading(false);
      }
    },
    [termsPolicy, privacyPolicy]
  );

  // Initialize on mount - fetch family sites automatically
  useEffect(() => {
    if (!isInitialized) {
      fetchFamilySites();
      setIsInitialized(true);
    }
  }, [isInitialized, fetchFamilySites]);

  const value: FooterContextType = {
    familySites,
    familySitesLoading,
    familySitesError,
    fetchFamilySites,
    termsPolicy,
    privacyPolicy,
    policyLoading,
    policyError,
    fetchPolicy,
    isInitialized,
  };

  return (
    <FooterContext.Provider value={value}>{children}</FooterContext.Provider>
  );
}

export function useFooter() {
  const context = useContext(FooterContext);
  if (context === undefined) {
    throw new Error("useFooter must be used within a FooterProvider");
  }
  return context;
}
