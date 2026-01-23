import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { get } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import ToggleMenu from '@/components/Home/toggle-menu';
import { MENU_ITEMS, MenuItemConfig } from './constants';

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HistoryResponse {
  isExposed: boolean;
  data: unknown[];
}

interface DataRoom {
  id: string;
  name: string;
  displayType: 'gallery' | 'snippet' | 'list';
  isExposed: boolean;
}

interface DataRoomsResponse {
  items: DataRoom[];
}

interface MajorCategory {
  id: number;
  name: string;
  isExposed: boolean;
  displayOrder: number;
}

interface HierarchicalData {
  majorCategory: MajorCategory;
  minorCategories: unknown[];
}

interface InsightCategory {
  id: number;
  name: string;
  isExposed?: boolean;
  displayOrder?: number;
  targetMemberType?: string; // "ALL", "GENERAL", "INSURANCE", "OTHER", etc.
}

interface InsightHierarchicalItem {
  category: InsightCategory;
  subcategories?: unknown[];
}

type InsightHierarchicalData = InsightHierarchicalItem[];

const Menu: React.FC<MenuProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<string>('services');
  const [selectedSubItem, setSelectedSubItem] = useState<number | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 연혁 탭 노출 여부
  const [historyExposed, setHistoryExposed] = useState(true);

  // 자료실 목록
  const [dataRooms, setDataRooms] = useState<DataRoom[]>([]);

  // Business Area categories from API
  const [businessAreaCategories, setBusinessAreaCategories] = useState<MajorCategory[]>([]);

  // Insights categories from API
  const [insightCategories, setInsightCategories] = useState<InsightCategory[]>([]);
  const [newsletterExposed, setNewsletterExposed] = useState(false);
  const [rawHierarchicalData, setRawHierarchicalData] = useState<InsightHierarchicalData>([]);

  // Cache flags to prevent redundant API calls
  const historyFetchedRef = useRef<boolean>(false);
  const dataRoomsFetchedRef = useRef<boolean>(false);
  const businessAreaCategoriesFetchedRef = useRef<boolean>(false);
  const insightCategoriesFetchedRef = useRef<boolean>(false);
  const newsletterExposedFetchedRef = useRef<boolean>(false);

  // 연혁 노출 여부 및 자료실 목록에 따라 메뉴 아이템 동적 생성
  const menuItems: MenuItemConfig[] = MENU_ITEMS.map(item => {
    if (item.id === 'services') {
      // Business Area categories from API
      const exposedCategories = businessAreaCategories
        .filter(cat => cat.isExposed)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      return {
        ...item,
        subItems: exposedCategories.map(cat => cat.name),
        subItemIds: exposedCategories.map(cat => cat.id),
      };
    }
    if (item.id === 'about') {
      return {
        ...item,
        subItems: historyExposed
          ? item.subItems
          : item.subItems.filter(sub => sub !== '연혁')
      };
    }
    if (item.id === 'insight') {
      // Insights categories from API - already filtered by targetMemberType
      // Add newsletter as last item ONLY if exposed
      const subItems = [...insightCategories.map(cat => cat.name)];
      const subItemIds: (string | number)[] = [...insightCategories.map(cat => cat.id)];
      
      if (newsletterExposed) {
        subItems.push('뉴스레터');
        subItemIds.push('newsletter');
      }
      
      return {
        ...item,
        subItems,
        subItemIds,
      };
    }
    return item;
  }).concat([
    // 상담 신청 항목 - 항상 표시되도록 추가
    { id: 'agency', title: '상담 신청', subItems: [] },
  ]);

  // 현재 경로에 따라 메뉴 항목 자동 선택
  useEffect(() => {
    if (isOpen) {
      const pathname = router.pathname;
      const query = router.query;
      
      // 경로에 따른 메뉴 ID 매핑
      if (pathname === '/experts') {
        setSelectedItem('experts');
        setSelectedSubItem(null);
      } else if (pathname === '/education') {
        setSelectedItem('education');
        setSelectedSubItem(null);
      } else if (pathname === '/insights' || pathname.startsWith('/insights/')) {
        setSelectedItem('insight');
        // Insights 서브메뉴 선택 - NEW FORMAT: use category param
        const category = query.category as string;
        const insightMenuItem = menuItems.find(item => item.id === 'insight');
        if (insightMenuItem && insightMenuItem.subItemIds) {
          let subItemIndex = -1;
          if (category === 'newsletter') {
            // Newsletter is always last item
            subItemIndex = insightMenuItem.subItemIds.length - 1;
          } else if (category) {
            // Numeric category
            const categoryId = parseInt(category, 10);
            if (!isNaN(categoryId)) {
              subItemIndex = insightMenuItem.subItemIds.findIndex(id => id === categoryId);
            }
          }
          if (subItemIndex !== -1) {
            setSelectedSubItem(subItemIndex);
          } else {
            setSelectedSubItem(null);
          }
        } else {
          setSelectedSubItem(null);
        }
      } else if (pathname === '/history' || pathname.startsWith('/history')) {
        setSelectedItem('about');
        // 함께소개 서브메뉴 선택 - 연혁 노출 여부에 따라 동적으로 인덱스 계산
        const aboutMenuItem = menuItems.find(item => item.id === 'about');
        if (aboutMenuItem) {
          const labelToTab: { [key: string]: string } = {
            '소개': 'intro',
            '연혁': 'history',
            '수상/인증': 'awards',
            '본점/지점 안내': 'branches',
            '주요 고객': 'customers',
            'CI가이드': 'ci',
          };
          const tab = query.tab as string;
          // 현재 서브메뉴에서 해당 탭의 인덱스 찾기
          const subItemIndex = aboutMenuItem.subItems.findIndex(subItem => labelToTab[subItem] === tab);
          if (subItemIndex !== -1) {
            setSelectedSubItem(subItemIndex);
          } else {
            setSelectedSubItem(null);
          }
        } else {
          setSelectedSubItem(null);
        }
      } else if (pathname === '/business-areas/hierarchical' || pathname.startsWith('/business-areas/')) {
        setSelectedItem('services');
        // 업무분야 서브메뉴 선택 - API 데이터 기반으로 동적 매칭
        const tab = query.tab as string;
        if (tab && businessAreaCategories.length > 0) {
          const categoryIndex = businessAreaCategories.findIndex(cat => String(cat.id) === tab);
          if (categoryIndex !== -1) {
            setSelectedSubItem(categoryIndex);
          } else {
            setSelectedSubItem(null);
          }
        } else {
          setSelectedSubItem(null);
        }
      } else {
        // 기본값은 첫 번째 메뉴 항목
        setSelectedItem('services');
        setSelectedSubItem(null);
      }
    }
  }, [isOpen, router.pathname, router.query, historyExposed, businessAreaCategories, dataRooms, insightCategories]);

  useEffect(() => {
    if (isOpen && !hasBeenOpened) {
      setHasBeenOpened(true);
    }
  }, [isOpen, hasBeenOpened]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 로그인 상태 확인
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        setIsAuthenticated(!!token);
      }
    };
    
    // 메뉴가 열릴 때마다 로그인 상태 확인
    if (isOpen) {
      checkAuth();
    }
    
    // storage 이벤트 리스너 (다른 탭에서 로그인/로그아웃 시)
    const handleStorageChange = () => {
      checkAuth();
    };
    window.addEventListener('storage', handleStorageChange);
    
    // 같은 탭에서의 변경 감지를 위한 주기적 확인
    let intervalId: NodeJS.Timeout | null = null;
    if (isOpen) {
      intervalId = setInterval(checkAuth, 500);
    }
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isOpen]);

  // 메뉴가 열릴 때 연혁 노출 여부 확인 (캐시된 경우 재요청하지 않음)
  useEffect(() => {
    if (isOpen && !historyFetchedRef.current) {
      console.log('[Menu] Fetching history exposed status (first time)');
      const checkHistoryExposed = async () => {
        try {
          const response = await get<HistoryResponse>(API_ENDPOINTS.HISTORY);
          if (response.data) {
            setHistoryExposed(response.data.isExposed);
          } else {
            setHistoryExposed(false);
          }
          historyFetchedRef.current = true; // 캐시 플래그 설정
        } catch {
          setHistoryExposed(false);
          historyFetchedRef.current = true; // 에러가 발생해도 재시도하지 않음
        }
      };
      checkHistoryExposed();
    } else if (isOpen && historyFetchedRef.current) {
      console.log('[Menu] History exposed status already cached, skipping API call');
    }
  }, [isOpen]);

  

  // 메뉴가 열릴 때 Business Area categories 확인 (캐시된 경우 재요청하지 않음)
  useEffect(() => {
    if (isOpen && !businessAreaCategoriesFetchedRef.current) {
      console.log('[Menu] Fetching business area categories (first time)');
      const fetchBusinessAreaCategories = async () => {
        try {
          const response = await get<HierarchicalData[]>(
            `${API_ENDPOINTS.BUSINESS_AREAS_HIERARCHICAL}?limit=20&page=1`
          );
          if (response.data && Array.isArray(response.data)) {
            const categories = response.data
              .map(item => item.majorCategory)
              .filter(cat => cat.isExposed)
              .sort((a, b) => a.displayOrder - b.displayOrder);
            setBusinessAreaCategories(categories);
          } else {
            setBusinessAreaCategories([]);
          }
          businessAreaCategoriesFetchedRef.current = true; // 캐시 플래그 설정
        } catch {
          setBusinessAreaCategories([]);
          businessAreaCategoriesFetchedRef.current = true; // 에러가 발생해도 재시도하지 않음
        }
      };
      fetchBusinessAreaCategories();
    } else if (isOpen && businessAreaCategoriesFetchedRef.current) {
      console.log('[Menu] Business area categories already cached, skipping API call');
    }
  }, [isOpen]);

  // Helper function to check if user is logged in and get memberType
  const getUserAuthState = () => {
    if (typeof window === 'undefined') {
      return { isLoggedIn: false, memberType: null };
    }
    
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      return { isLoggedIn: false, memberType: null };
    }
    
    try {
      const user = JSON.parse(userStr);
      return {
        isLoggedIn: true,
        memberType: user.memberType || null,
      };
    } catch {
      return { isLoggedIn: false, memberType: null };
    }
  };

  // Filter categories based on targetMemberType and login state
  const filterCategoriesByVisibility = (categories: InsightCategory[]): InsightCategory[] => {
    const { isLoggedIn, memberType } = getUserAuthState();
    
    return categories.filter((cat) => {
      // Always show if targetMemberType is "ALL"
      if (cat.targetMemberType === "ALL") {
        return true;
      }
      
      // If not logged in, hide non-ALL categories
      if (!isLoggedIn) {
        return false;
      }
      
      // If logged in, show if targetMemberType matches user's memberType
      return cat.targetMemberType === memberType;
    });
  };

  // 메뉴가 열릴 때 Newsletter 노출 여부 확인
  useEffect(() => {
    if (isOpen && !newsletterExposedFetchedRef.current) {
      const checkNewsletterExposed = async () => {
        try {
          const response = await get<{ isExposed: boolean }>(API_ENDPOINTS.NEWSLETTER.PAGE);
          if (response.data) {
            setNewsletterExposed(response.data.isExposed);
          } else {
            setNewsletterExposed(false);
          }
          newsletterExposedFetchedRef.current = true;
        } catch {
          setNewsletterExposed(false);
          newsletterExposedFetchedRef.current = true;
        }
      };
      checkNewsletterExposed();
    }
  }, [isOpen]);

  // 메뉴가 열릴 때 Insights categories 확인 (캐시된 경우 재요청하지 않음)
  useEffect(() => {
    if (isOpen && !insightCategoriesFetchedRef.current) {
      console.log('[Menu] Fetching insight categories (first time)');
      const fetchInsightCategories = async () => {
        try {
          const response = await get<InsightHierarchicalData>(
            `${API_ENDPOINTS.INSIGHTS}/hierarchical`
          );
          if (response.data && Array.isArray(response.data)) {
            // Store raw data for re-filtering
            setRawHierarchicalData(response.data);
            
            // Extract categories from hierarchical data - use category.name as label
            const allCategories = response.data
              .map(item => item.category)
              .filter(cat => cat.isExposed !== false) // API already returns only exposed, but filter for safety
              .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
            
            // Filter by targetMemberType BEFORE setting state
            const filteredCategories = filterCategoriesByVisibility(allCategories);
            setInsightCategories(filteredCategories);
          } else {
            setInsightCategories([]);
            setRawHierarchicalData([]);
          }
          insightCategoriesFetchedRef.current = true; // 캐시 플래그 설정
        } catch {
          setInsightCategories([]);
          setRawHierarchicalData([]);
          insightCategoriesFetchedRef.current = true; // 에러가 발생해도 재시도하지 않음
        }
      };
      fetchInsightCategories();
    }
  }, [isOpen]);

  // Re-filter categories when auth state changes (login/logout)
  useEffect(() => {
    if (insightCategoriesFetchedRef.current && rawHierarchicalData.length > 0) {
      // Re-filter when auth state might have changed
      const allCategories = rawHierarchicalData
        .map(item => item.category)
        .filter(cat => cat.isExposed !== false)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      const filteredCategories = filterCategoriesByVisibility(allCategories);
      setInsightCategories(filteredCategories);
    }
  }, [isAuthenticated]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 500);
  };

  const handleLoginClick = () => {
    handleClose();
    setTimeout(() => router.push('/login'), 500);
  };

  const handleSignupClick = () => {
    handleClose();
    setTimeout(() => router.push('/signup'), 500);
  };

  const handleMyPageClick = () => {
    handleClose();
    setTimeout(() => router.push('/my'), 500);
  };

  const handleItemClick = (id: string) => {
    const menuItem = menuItems.find(item => item.id === id);
    const hasSubItems = menuItem && menuItem.subItems && menuItem.subItems.length > 0;
    
    if (hasSubItems) {
      // 서브메뉴가 있는 경우 선택 상태만 변경
      setSelectedItem(id);
      setSelectedSubItem(null); // 메인 메뉴 변경 시 서브 메뉴 선택 초기화
    } else {
      // 서브메뉴가 없는 경우 즉시 페이지 이동
      handleClose();
      setSelectedSubItem(null);
      
      // 페이지 라우팅 매핑 (agency는 여기서 제외, ToggleMenu에서 직접 처리)
      const routeMap: { [key: string]: string } = {
        'experts': '/experts',
        'education': '/education',
        'insight': '/insights',
      };
      
      const route = routeMap[id];
      if (route) {
        setTimeout(() => router.push(route), 500);
      }
    }
  };

  const handleSubItemClick = (subItem: string, index: number) => {
    setSelectedSubItem(index);
    handleClose();
    
    if (selectedItem === 'services') {
      // 업무분야 서브메뉴 - API 데이터 기반으로 동적 라우팅
      const servicesMenuItem = menuItems.find(item => item.id === 'services');
      if (servicesMenuItem && servicesMenuItem.subItemIds) {
        const categoryIndex = servicesMenuItem.subItems.findIndex(name => name === subItem);
        if (categoryIndex !== -1 && servicesMenuItem.subItemIds[categoryIndex]) {
          const categoryId = servicesMenuItem.subItemIds[categoryIndex];
          // Navigate with category ID to auto-open the category
          setTimeout(() => router.push(`/business-areas/hierarchical?tab=${categoryId}`), 500);
        }
      }
    } else if (selectedItem === 'about') {
      // 함께소개 서브메뉴
      const tabMap: { [key: string]: string } = {
        '소개': 'intro',
        '연혁': 'history',
        '수상/인증': 'awards',
        '본점/지점 안내': 'branches',
        '주요 고객': 'customers',
        'CI가이드': 'ci',
      };

      const tab = tabMap[subItem];
      if (tab) {
        setTimeout(() => router.push(`/history?tab=${tab}`), 500);
      }
    } else if (selectedItem === 'insight') {
      // 인사이트 서브메뉴 - NEW FORMAT: use category param
      const insightMenuItem = menuItems.find(item => item.id === 'insight');
      if (insightMenuItem && insightMenuItem.subItemIds) {
        const categoryIndex = insightMenuItem.subItems.findIndex(name => name === subItem);
        if (categoryIndex !== -1 && insightMenuItem.subItemIds[categoryIndex]) {
          const categoryValue = insightMenuItem.subItemIds[categoryIndex];
          // Navigate to insights page with category param
          if (categoryValue === 'newsletter') {
            setTimeout(() => router.push(`/insights?category=newsletter`), 500);
          } else {
            setTimeout(() => router.push(`/insights?category=${categoryValue}&sub=0`), 500);
          }
        }
      }
    }
  };

  return (
    <ToggleMenu
      open={isOpen && !isClosing}
      onClose={handleClose}
      isLoggedIn={isAuthenticated}
      menuItems={menuItems}
      selectedItemId={selectedItem}
      selectedSubItemIndex={selectedSubItem}
      onMainItemClick={handleItemClick}
      onSubItemClick={handleSubItemClick}
      onLoginClick={handleLoginClick}
      onSignupClick={handleSignupClick}
      onMyPageClick={handleMyPageClick}
    />
  );
};

export default Menu;
