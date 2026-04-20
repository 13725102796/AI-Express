import { describe, it, expect } from 'vitest';
import {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  STEM_ELEMENTS,
  BRANCH_ELEMENTS,
  LUNAR_MONTHS,
  LUNAR_DAYS,
  SHICHEN,
  QUICK_TAGS,
  FORTUNE_SIGNS,
} from '../src/lib/constants';

describe('Constants integrity', () => {
  it('should have 10 heavenly stems', () => {
    expect(HEAVENLY_STEMS).toHaveLength(10);
    expect(HEAVENLY_STEMS[0]).toBe('甲');
    expect(HEAVENLY_STEMS[9]).toBe('癸');
  });

  it('should have 12 earthly branches', () => {
    expect(EARTHLY_BRANCHES).toHaveLength(12);
    expect(EARTHLY_BRANCHES[0]).toBe('子');
    expect(EARTHLY_BRANCHES[11]).toBe('亥');
  });

  it('should map all stems to elements', () => {
    for (const stem of HEAVENLY_STEMS) {
      expect(STEM_ELEMENTS[stem]).toBeDefined();
      expect(['木', '火', '土', '金', '水']).toContain(STEM_ELEMENTS[stem]);
    }
  });

  it('should map all branches to elements', () => {
    for (const branch of EARTHLY_BRANCHES) {
      expect(BRANCH_ELEMENTS[branch]).toBeDefined();
      expect(['木', '火', '土', '金', '水']).toContain(BRANCH_ELEMENTS[branch]);
    }
  });

  it('should have 12 lunar months', () => {
    expect(LUNAR_MONTHS).toHaveLength(12);
    expect(LUNAR_MONTHS[0]).toBe('正月');
    expect(LUNAR_MONTHS[11]).toBe('腊月');
  });

  it('should have 30 lunar days', () => {
    expect(LUNAR_DAYS).toHaveLength(30);
    expect(LUNAR_DAYS[0]).toBe('初一');
    expect(LUNAR_DAYS[29]).toBe('三十');
  });

  it('should have 12 shichen entries', () => {
    expect(SHICHEN).toHaveLength(12);
    expect(SHICHEN[0].name).toBe('子时');
    expect(SHICHEN[11].name).toBe('亥时');
    // Each should have index 0-11
    SHICHEN.forEach((s, i) => {
      expect(s.index).toBe(i);
    });
  });

  it('should have quick tags array', () => {
    expect(QUICK_TAGS.length).toBeGreaterThan(0);
    expect(QUICK_TAGS).toContain('事业运详解');
    expect(QUICK_TAGS).toContain('感情运如何');
  });

  it('should have 3 fortune sign styles', () => {
    expect(FORTUNE_SIGNS['ink-gold']).toBeDefined();
    expect(FORTUNE_SIGNS['cinnabar']).toBeDefined();
    expect(FORTUNE_SIGNS['ink-wash']).toBeDefined();

    // Each should have required fields
    for (const [key, sign] of Object.entries(FORTUNE_SIGNS)) {
      expect(sign.style).toBe(key);
      expect(sign.type).toBeTruthy();
      expect(sign.keywords.length).toBeGreaterThan(0);
      expect(sign.poem).toBeTruthy();
      expect(sign.interpretation).toBeTruthy();
    }
  });
});
