/**
 * BaZi (Four Pillars) calculation using lunar-javascript library.
 *
 * Calculates heavenly stems and earthly branches for year, month, day, and hour
 * based on the Chinese lunar calendar.
 */
import { Solar } from 'lunar-javascript';
import { STEM_ELEMENTS, BRANCH_ELEMENTS } from './constants';

export interface Pillar {
  stem: string;
  branch: string;
  element: string;
}

export interface BaziResult {
  yearPillar: Pillar;
  monthPillar: Pillar;
  dayPillar: Pillar;
  hourPillar: Pillar | null;
  fiveElements: {
    metal: number;
    wood: number;
    water: number;
    fire: number;
    earth: number;
  };
  summary: string;
}

/**
 * Map shichen index (0-11) to a representative hour for Solar time.
 * 子时=0(23h), 丑时=1(1h), 寅时=2(3h), etc.
 */
function shichenToHour(shichenIndex: number): number {
  const hours = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
  return hours[shichenIndex] ?? 0;
}

/**
 * Count five elements from all pillars.
 */
function countElements(pillars: Pillar[]): BaziResult['fiveElements'] {
  const count = { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 };
  const elementMap: Record<string, keyof typeof count> = {
    '金': 'metal', '木': 'wood', '水': 'water', '火': 'fire', '土': 'earth',
  };

  for (const pillar of pillars) {
    const stemEl = STEM_ELEMENTS[pillar.stem];
    const branchEl = BRANCH_ELEMENTS[pillar.branch];
    if (stemEl && elementMap[stemEl]) count[elementMap[stemEl]]++;
    if (branchEl && elementMap[branchEl]) count[elementMap[branchEl]]++;
  }

  return count;
}

/**
 * Generate five-element summary string.
 */
function generateSummary(elements: BaziResult['fiveElements']): string {
  const names: Record<string, string> = {
    metal: '金', wood: '木', water: '水', fire: '火', earth: '土',
  };

  const sorted = Object.entries(elements).sort((a, b) => b[1] - a[1]);
  const strong = sorted.filter(([, v]) => v >= 2).map(([k]) => names[k]);
  const weak = sorted.filter(([, v]) => v === 0).map(([k]) => names[k]);

  const parts: string[] = [];
  if (strong.length > 0) parts.push(`${strong.join('')}旺`);
  if (weak.length > 0) parts.push(`缺${weak.join('')}`);

  return parts.join('，') || '五行均衡';
}

/**
 * Calculate BaZi (Four Pillars of Destiny) from birth date.
 *
 * @param year - Birth year (1940-2026)
 * @param month - Birth month (1-12, solar/gregorian)
 * @param day - Birth day (1-31, solar/gregorian)
 * @param shichenIndex - Hour index (0-11 for 12 shichen, -1 for unknown)
 */
export function calculateBazi(
  year: number,
  month: number,
  day: number,
  shichenIndex: number
): BaziResult {
  // Use lunar-javascript to get the Eight Characters
  const hour = shichenIndex >= 0 ? shichenToHour(shichenIndex) : 12;
  const solar = Solar.fromYmdHms(year, month, day, hour, 0, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  // Extract four pillars
  const yearPillar: Pillar = {
    stem: eightChar.getYearGan(),
    branch: eightChar.getYearZhi(),
    element: `${STEM_ELEMENTS[eightChar.getYearGan()] || ''}${BRANCH_ELEMENTS[eightChar.getYearZhi()] || ''}`,
  };

  const monthPillar: Pillar = {
    stem: eightChar.getMonthGan(),
    branch: eightChar.getMonthZhi(),
    element: `${STEM_ELEMENTS[eightChar.getMonthGan()] || ''}${BRANCH_ELEMENTS[eightChar.getMonthZhi()] || ''}`,
  };

  const dayPillar: Pillar = {
    stem: eightChar.getDayGan(),
    branch: eightChar.getDayZhi(),
    element: `${STEM_ELEMENTS[eightChar.getDayGan()] || ''}${BRANCH_ELEMENTS[eightChar.getDayZhi()] || ''}`,
  };

  const hourPillar: Pillar | null = shichenIndex >= 0
    ? {
        stem: eightChar.getTimeGan(),
        branch: eightChar.getTimeZhi(),
        element: `${STEM_ELEMENTS[eightChar.getTimeGan()] || ''}${BRANCH_ELEMENTS[eightChar.getTimeZhi()] || ''}`,
      }
    : null;

  const allPillars = [yearPillar, monthPillar, dayPillar];
  if (hourPillar) allPillars.push(hourPillar);

  const fiveElements = countElements(allPillars);
  const summary = generateSummary(fiveElements);

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    fiveElements,
    summary,
  };
}
