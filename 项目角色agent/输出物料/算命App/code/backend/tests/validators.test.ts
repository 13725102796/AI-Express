import { describe, it, expect } from 'vitest';
import { FortuneStartSchema, FortuneChatSchema } from '../src/validators/fortune.js';

describe('FortuneStartSchema', () => {
  const validPayload = {
    baziData: {
      yearPillar: { stem: '乙', branch: '亥', element: '木水' },
      monthPillar: { stem: '丙', branch: '寅', element: '火木' },
      dayPillar: { stem: '甲', branch: '子', element: '木水' },
      hourPillar: { stem: '甲', branch: '子', element: '木水' },
      fiveElements: { metal: 0, wood: 4, water: 3, fire: 1, earth: 0 },
      summary: '木旺水相，缺金缺土',
    },
    gender: 'male' as const,
  };

  it('should accept valid payload', () => {
    const result = FortuneStartSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should accept payload without gender', () => {
    const { gender, ...rest } = validPayload;
    const result = FortuneStartSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('should accept null hourPillar (unknown time)', () => {
    const payload = {
      ...validPayload,
      baziData: { ...validPayload.baziData, hourPillar: null },
    };
    const result = FortuneStartSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('should reject invalid stem (not single char)', () => {
    const payload = {
      ...validPayload,
      baziData: {
        ...validPayload.baziData,
        yearPillar: { stem: '乙木', branch: '亥', element: '木水' },
      },
    };
    const result = FortuneStartSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should reject missing baziData', () => {
    const result = FortuneStartSchema.safeParse({ gender: 'male' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid gender value', () => {
    const result = FortuneStartSchema.safeParse({
      ...validPayload,
      gender: 'other',
    });
    expect(result.success).toBe(false);
  });
});

describe('FortuneChatSchema', () => {
  const validChatPayload = {
    message: '我的事业运怎么样？',
    baziData: {
      yearPillar: { stem: '乙', branch: '亥', element: '木水' },
      monthPillar: { stem: '丙', branch: '寅', element: '火木' },
      dayPillar: { stem: '甲', branch: '子', element: '木水' },
      hourPillar: null,
      fiveElements: { metal: 0, wood: 4, water: 3, fire: 1, earth: 0 },
      summary: '木旺水相，缺金缺土',
    },
    history: [
      { role: 'assistant' as const, content: '施主有礼了...' },
    ],
    round: 2,
  };

  it('should accept valid chat payload', () => {
    const result = FortuneChatSchema.safeParse(validChatPayload);
    expect(result.success).toBe(true);
  });

  it('should reject empty message', () => {
    const result = FortuneChatSchema.safeParse({ ...validChatPayload, message: '' });
    expect(result.success).toBe(false);
  });

  it('should reject message over 500 chars', () => {
    const result = FortuneChatSchema.safeParse({
      ...validChatPayload,
      message: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('should reject round over 20', () => {
    const result = FortuneChatSchema.safeParse({ ...validChatPayload, round: 21 });
    expect(result.success).toBe(false);
  });

  it('should reject round under 1', () => {
    const result = FortuneChatSchema.safeParse({ ...validChatPayload, round: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject history with more than 40 messages', () => {
    const history = Array.from({ length: 41 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: 'test',
    }));
    const result = FortuneChatSchema.safeParse({ ...validChatPayload, history });
    expect(result.success).toBe(false);
  });
});
