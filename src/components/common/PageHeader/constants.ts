// Top-level pages for breadcrumb/select navigation
export interface TopLevelPage {
  label: string;
  value: string;
}

export const TOP_LEVEL_PAGES: TopLevelPage[] = [
  { label: '업무 분야', value: '/business-areas/hierarchical' },
  { label: '전문가 소개', value: '/experts' },
  { label: '교육/세미나', value: '/education' },
  { label: '함께 소개', value: '/history?tab=intro' },
  { label: '인사이트', value: '/insights' },
];

