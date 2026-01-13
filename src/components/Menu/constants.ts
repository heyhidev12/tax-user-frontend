export interface MenuItemConfig {
  id: string;
  title: string;
  subItems: string[];
  subItemIds?: (string | number)[]; // Store category IDs for navigation
}

// 공통 헤더 메뉴 구성 (라벨 및 서브메뉴 이름)
export const MENU_ITEMS: MenuItemConfig[] = [
  {
    id: 'services',
    title: '업무분야',
    subItems: [], // Will be populated from API
    subItemIds: [], // Will be populated from API
  },
  {
    id: 'experts',
    title: '전문가 소개',
    subItems: [],
  },
  {
    id: 'education',
    title: '교육/세미나',
    subItems: [],
  },
  {
    id: 'about',
    title: '함께소개',
    subItems: ['소개', '연혁', '수상/인증', '본점/지점 안내', '주요 고객', 'CI가이드'],
  },
  {
    id: 'insight',
    title: '인사이트',
    subItems: [],
  },
];


