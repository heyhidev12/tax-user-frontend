import React, { useState, useEffect } from 'react';
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

  // 연혁 노출 여부 및 자료실 목록에 따라 메뉴 아이템 동적 생성
  const menuItems: MenuItemConfig[] = MENU_ITEMS.map(item => {
    if (item.id === 'about') {
      return {
        ...item,
        subItems: historyExposed
          ? item.subItems
          : item.subItems.filter(sub => sub !== '연혁')
      };
    }
    if (item.id === 'insight') {
      // 자료실 목록을 동적으로 구성
      const exposedDataRooms = dataRooms.filter(dr => dr.isExposed);
      return {
        ...item,
        subItems: ['칼럼', ...exposedDataRooms.map(dr => dr.name)]
      };
    }
    return item;
  }).concat([
    // 신고 대리 항목 - 항상 표시되도록 추가
    { id: 'agency', title: '신고 대리', subItems: [] },
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
        setSelectedSubItem(null);
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
        // 업무분야 서브메뉴 선택
        const tab = query.tab as string;
        if (tab === 'consulting') {
          setSelectedSubItem(1); // 컨설팅
        } else {
          setSelectedSubItem(0); // 업종별 (기본값)
        }
      } else {
        // 기본값은 첫 번째 메뉴 항목
        setSelectedItem('services');
        setSelectedSubItem(null);
      }
    }
  }, [isOpen, router.pathname, router.query, historyExposed]);

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

  // 메뉴가 열릴 때 연혁 노출 여부 확인
  useEffect(() => {
    if (isOpen) {
      const checkHistoryExposed = async () => {
        try {
          const response = await get<HistoryResponse>(API_ENDPOINTS.HISTORY);
          if (response.data) {
            setHistoryExposed(response.data.isExposed);
          } else {
            setHistoryExposed(false);
          }
        } catch {
          setHistoryExposed(false);
        }
      };
      checkHistoryExposed();
    }
  }, [isOpen]);

  // 메뉴가 열릴 때 자료실 목록 확인
  useEffect(() => {
    if (isOpen) {
      const fetchDataRooms = async () => {
        try {
          const response = await get<DataRoomsResponse>(API_ENDPOINTS.DATA_ROOMS);
          if (response.data?.items) {
            setDataRooms(response.data.items);
          } else {
            setDataRooms([]);
          }
        } catch {
          setDataRooms([]);
        }
      };
      fetchDataRooms();
    }
  }, [isOpen]);

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
      
      // 페이지 라우팅 매핑
      const routeMap: { [key: string]: string } = {
        'experts': '/experts',
        'education': '/education',
        'insight': '/insights',
        'agency': '/consultation/apply',
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
      // 업무분야 서브메뉴
      if (subItem === '업종별') {
        setTimeout(() => router.push('/business-areas/hierarchical'), 500);
      } else if (subItem === '컨설팅') {
        // 컨설팅 탭으로 이동 - URL에 탭 정보를 포함할 수 있도록 처리
        setTimeout(() => router.push('/business-areas/hierarchical?tab=consulting'), 500);
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
      // 인사이트 서브메뉴
      if (subItem === '칼럼') {
        setTimeout(() => router.push('/insights?tab=column'), 500);
      } else {
        // 자료실 항목 - dataRooms에서 해당 이름의 자료실 찾기
        const dataRoom = dataRooms.find(dr => dr.name === subItem);
        if (dataRoom) {
          setTimeout(() => router.push(`/insights?tab=library&dataRoom=${dataRoom.id}`), 500);
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
      onConsultationClick={() => {
        handleClose();
        setTimeout(() => router.push('/consultation/apply'), 500);
      }}
    />
  );
};

export default Menu;
