export const categoryTabs = [
  { id: "industry", label: "업종별 업무분야" },
  { id: "consulting", label: "컨설팅 업무분야" }
];

export interface ServiceCard {
  id: number;
  title: string;
  tags: string[];
  image: string;
}

// Default tags that appear on hover (12 labels)
export const defaultTags = ["라벨", "라벨", "라벨", "라벨", "라벨", "라벨", "라벨", "라벨", "라벨", "라벨", "라벨", "라벨", "라벨", "라벨", "라벨"];

// 업종별 업무분야 - 10 cards total
export const industryCards: ServiceCard[] = [
  {
    id: 1,
    title: "제조업",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
  },
  {
    id: 2,
    title: "도·소매업",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80",
  },
  {
    id: 3,
    title: "운수·물류업",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&q=80",
  },
  {
    id: 4,
    title: "건설·부동산업",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80",
  },
  {
    id: 5,
    title: "서비스업",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&q=80",
  },
  {
    id: 6,
    title: "정보통신업",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80",
  },
  {
    id: 7,
    title: "의료·헬스케어",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=600&q=80",
  },
  {
    id: 8,
    title: "교육·학원업",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80",
  },
  {
    id: 9,
    title: "숙박·관광업",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80",
  },
  {
    id: 10,
    title: "음식·외식업",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80",
  },
];

// 컨설팅 업무분야 - 10 cards total
export const consultingCards: ServiceCard[] = [
  {
    id: 1,
    title: "전문직·서비스업",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80",
  },
  {
    id: 2,
    title: "농·축·수산업",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80",
  },
  {
    id: 3,
    title: "금융·보험업",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80",
  },
  {
    id: 4,
    title: "기타 업종",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&q=80",
  },
  {
    id: 5,
    title: "가업승계·상속증여",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80",
  },
  {
    id: 6,
    title: "세무조사·분쟁대응",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80",
  },
  {
    id: 7,
    title: "국제조세",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  },
  {
    id: 8,
    title: "공익법인·비영리",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=80",
  },
  {
    id: 9,
    title: "자본거래·M&A",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80",
  },
  {
    id: 10,
    title: "부동산세무",
    tags: defaultTags,
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80",
  },
];
