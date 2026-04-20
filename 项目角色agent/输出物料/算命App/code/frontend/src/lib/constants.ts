/** 天干 */
export const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;

/** 地支 */
export const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

/** 天干五行映射 */
export const STEM_ELEMENTS: Record<string, string> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

/** 地支五行映射 */
export const BRANCH_ELEMENTS: Record<string, string> = {
  '子': '水', '丑': '土',
  '寅': '木', '卯': '木',
  '辰': '土', '巳': '火',
  '午': '火', '未': '土',
  '申': '金', '酉': '金',
  '戌': '土', '亥': '水',
};

/** 五行颜色映射 */
export const ELEMENT_COLORS: Record<string, string> = {
  '金': 'var(--color-accent-gold)',
  '木': 'var(--color-accent-green)',
  '水': 'var(--color-accent-teal)',
  '火': 'var(--color-accent-red)',
  '土': '#B8860B',
};

/** 农历月份名称 */
export const LUNAR_MONTHS = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月',
] as const;

/** 农历日期名称 */
export const LUNAR_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
] as const;

/** 十二时辰 */
export const SHICHEN = [
  { name: '子时', range: '23:00-01:00', index: 0 },
  { name: '丑时', range: '01:00-03:00', index: 1 },
  { name: '寅时', range: '03:00-05:00', index: 2 },
  { name: '卯时', range: '05:00-07:00', index: 3 },
  { name: '辰时', range: '07:00-09:00', index: 4 },
  { name: '巳时', range: '09:00-11:00', index: 5 },
  { name: '午时', range: '11:00-13:00', index: 6 },
  { name: '未时', range: '13:00-15:00', index: 7 },
  { name: '申时', range: '15:00-17:00', index: 8 },
  { name: '酉时', range: '17:00-19:00', index: 9 },
  { name: '戌时', range: '19:00-21:00', index: 10 },
  { name: '亥时', range: '21:00-23:00', index: 11 },
] as const;

/** 快捷追问标签 */
export const QUICK_TAGS = [
  '事业运详解',
  '感情运如何',
  '今年财运',
  '健康建议',
  '贵人方位',
  '适合的行业',
  '开运建议',
] as const;

/** 签文预设数据 */
export const FORTUNE_SIGNS = {
  'ink-gold': {
    style: 'ink-gold' as const,
    type: '上上签',
    keywords: ['木旺水相', '春风化雨', '前程似锦'],
    poem: '春风得意马蹄疾，一日看尽长安花',
    interpretation: '运势昌隆，诸事顺遂，宜进取求新',
  },
  'cinnabar': {
    style: 'cinnabar' as const,
    type: '上签',
    keywords: ['贵人相助', '否极泰来'],
    poem: '山重水复疑无路，柳暗花明又一村',
    interpretation: '虽有波折终化吉，守得云开见月明',
  },
  'ink-wash': {
    style: 'ink-wash' as const,
    type: '中上签',
    keywords: ['静水流深', '厚积薄发'],
    poem: '行到水穷处，坐看云起时',
    interpretation: '宜静不宜动，蓄势待发正当时',
  },
};
