import { GetServerSideProps } from 'next';
import Home, { BannerMedia } from '@/components/Home';
import SEO from '@/components/common/SEO';
import { get } from '@/lib/api-server';
import { API_ENDPOINTS } from '@/config/api';

// Type definitions for Home page data
interface HierarchicalData {
  majorCategory: {
    id: number;
    name: string;
    isExposed: boolean;
    displayOrder: number;
  };
  minorCategories: Array<{
    id: number;
    name: string;
    isMainExposed: boolean;
    image?: {
      id: number;
      url: string;
    };
    items: Array<{
      id: number;
      name: string;
      image?: {
        id: number;
        url: string;
      };
    }>;
  }>;
}

interface CategoryGroup {
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

interface Member {
  id: number;
  name: string;
  subPhoto: {
    id: number;
    url: string;
  };
  categories?: Array<{
    categoryId: number;
    categoryName: string;
    displayOrder: number;
  }>;
  oneLineIntro: string;
  displayOrder: number;
}

interface Award {
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

interface InsightItem {
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

interface KeyCustomer {
  id: number;
  logo: {
    id: number;
    url: string;
  };
  displayOrder: number;
  isMainExposed: boolean;
  isExposed: boolean;
  websiteUrl?: string | null;
}

interface HomePageProps {
  heroBanner: BannerMedia | null;
  serviceAreas: CategoryGroup[];
  experts: Member[];
  awards: Award[];
  awardsIsExposed: boolean;
  insights: InsightItem[];
  clients: KeyCustomer[];
}

export default function HomePage({
  heroBanner,
  serviceAreas,
  experts,
  awards,
  awardsIsExposed,
  insights,
  clients,
}: HomePageProps) {
  return (
    <>
      <SEO pageType="home" />
      <Home
        heroBanner={heroBanner}
        serviceAreas={serviceAreas}
        experts={experts}
        awards={awards}
        awardsIsExposed={awardsIsExposed}
        insights={insights}
        clients={clients}
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async () => {
  try {
    // Fetch all data in parallel for better performance
    const [
      bannersResponse,
      serviceAreasResponse,
      expertsResponse,
      awardsResponse,
      insightsResponse,
      clientsResponse,
    ] = await Promise.all([
      get<BannerMedia[]>(API_ENDPOINTS.BANNERS).catch(() => ({ data: [] })),
      get<HierarchicalData[]>(
        `${API_ENDPOINTS.BUSINESS_AREAS_HIERARCHICAL}?limit=20&page=1`
      ).catch(() => ({ data: [] })),
      get<{ items: Member[] }>(`${API_ENDPOINTS.MEMBERS_RANDOM}`).catch(() => ({
        data: { items: [] },
      })),
      get<{ items: Award[]; isExposed: boolean }>(
        `${API_ENDPOINTS.AWARDS}?page=1&limit=10&isMainExposed=true`
      ).catch(() => ({ data: { items: [], isExposed: false } })),
      get<{ items: InsightItem[] }>(`${API_ENDPOINTS.INSIGHTS}?page=1&limit=10`).catch(() => ({
        data: { items: [] },
      })),
      get<{ items: KeyCustomer[] }>(`${API_ENDPOINTS.KEY_CUSTOMERS}?page=1&limit=20&isMainExposed=true`).catch(() => ({
        data: { items: [] },
      })),
    ]);

    // Process hero banner
    let heroBanner: BannerMedia | null = null;
    if (bannersResponse.data && Array.isArray(bannersResponse.data) && bannersResponse.data.length > 0) {
      const sorted = [...bannersResponse.data].sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
      );
      heroBanner = sorted[0];
    }

    // Process service areas
    let serviceAreas: CategoryGroup[] = [];
    if (serviceAreasResponse.data && Array.isArray(serviceAreasResponse.data)) {
      const groupsMap = new Map<number, CategoryGroup>();

      serviceAreasResponse.data.forEach((hierarchicalItem) => {
        const majorCategoryId = hierarchicalItem.majorCategory.id;

        if (!groupsMap.has(majorCategoryId)) {
          groupsMap.set(majorCategoryId, {
            majorCategory: hierarchicalItem.majorCategory,
            cards: [],
          });
        }

        const group = groupsMap.get(majorCategoryId)!;

        hierarchicalItem.minorCategories.forEach((minorCategory) => {
          if (minorCategory.isMainExposed === true) {
            const tags = minorCategory.items.map((item) => item.name);
            const imageUrl =
              minorCategory.image?.url || minorCategory.items[0]?.image?.url || '';

            group.cards.push({
              id: minorCategory.id,
              title: minorCategory.name,
              tags,
              image: imageUrl,
            });
          }
        });
      });

      serviceAreas = Array.from(groupsMap.values());
    }

    // Process experts
    let experts: Member[] = [];
    if (expertsResponse.data) {
      // Handle different response formats: { items: Member[] } or Member[]
      let expertsList: Member[] = [];
      if (Array.isArray(expertsResponse.data)) {
        expertsList = expertsResponse.data;
      } else if (expertsResponse.data.items && Array.isArray(expertsResponse.data.items)) {
        expertsList = expertsResponse.data.items;
      }
      
      if (expertsList.length > 0) {
        experts = [...expertsList].sort(
          (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
        );
      }
    }

    // Process awards - backend filters by isMainExposed=true and isExposed=true
    let awards: Award[] = [];
    let awardsIsExposed = false;
    if (
      awardsResponse.data?.items &&
      Array.isArray(awardsResponse.data.items) &&
      awardsResponse.data.isExposed === true
    ) {
      // Backend already filtered by isMainExposed=true, just sort by displayOrder
      awards = [...awardsResponse.data.items].sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
      );
      awardsIsExposed = true;
    }

    // Process insights
    let insights: InsightItem[] = [];
    if (insightsResponse.data?.items && Array.isArray(insightsResponse.data.items)) {
      const exposedItems = insightsResponse.data.items.filter(
        (item) => item.isMainExposed === true
      );
      insights = exposedItems.filter(
        (item) => item.category?.targetMemberType === 'ALL'
      );
    }

    // Process clients - backend filters by isMainExposed=true
    let clients: KeyCustomer[] = [];
    if (clientsResponse.data?.items && Array.isArray(clientsResponse.data.items)) {
      clients = clientsResponse.data.items;
    }

    return {
      props: {
        heroBanner,
        serviceAreas,
        experts,
        awards,
        awardsIsExposed,
        insights,
        clients,
      },
    };
  } catch (error) {
    console.error('Failed to fetch home page data:', error);
    // Return empty data on error - page still renders
    return {
      props: {
        heroBanner: null,
        serviceAreas: [],
        experts: [],
        awards: [],
        awardsIsExposed: false,
        insights: [],
        clients: [],
      },
    };
  }
};
