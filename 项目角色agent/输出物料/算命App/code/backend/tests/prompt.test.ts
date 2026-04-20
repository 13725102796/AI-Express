import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPT, buildFirstAnalysisPrompt, buildChatPrompt } from '../src/services/prompt.js';

describe('SYSTEM_PROMPT', () => {
  it('should contain role setup keywords', () => {
    expect(SYSTEM_PROMPT).toContain('施主');
    expect(SYSTEM_PROMPT).toContain('贫道');
    expect(SYSTEM_PROMPT).toContain('算命大师');
  });

  it('should contain safety rules', () => {
    expect(SYSTEM_PROMPT).toContain('绝对正面');
    expect(SYSTEM_PROMPT).toContain('娱乐性质');
    expect(SYSTEM_PROMPT).toContain('安全边界');
  });

  it('should contain format markers', () => {
    expect(SYSTEM_PROMPT).toContain('50-100 字');
    expect(SYSTEM_PROMPT).toContain('150-300 字');
  });
});

describe('buildFirstAnalysisPrompt', () => {
  const baziInfo = '年柱：乙亥（木水）\n月柱：丙寅（火木）\n日柱：甲子（木水）\n时柱：甲子（木水）\n五行统计：金0 木4 水3 火1 土0\n五行总结：木旺水相，缺金缺土';

  it('should include bazi data in prompt', () => {
    const prompt = buildFirstAnalysisPrompt(baziInfo);
    expect(prompt).toContain('乙亥');
    expect(prompt).toContain('木旺水相');
  });

  it('should include gender hint for male', () => {
    const prompt = buildFirstAnalysisPrompt(baziInfo, 'male');
    expect(prompt).toContain('男命');
  });

  it('should include gender hint for female', () => {
    const prompt = buildFirstAnalysisPrompt(baziInfo, 'female');
    expect(prompt).toContain('女命');
  });

  it('should not include gender hint when null', () => {
    const prompt = buildFirstAnalysisPrompt(baziInfo, null);
    expect(prompt).not.toContain('男命');
    expect(prompt).not.toContain('女命');
  });

  it('should include fortune format markers', () => {
    const prompt = buildFirstAnalysisPrompt(baziInfo);
    expect(prompt).toContain('---FORTUNE_START---');
    expect(prompt).toContain('---FORTUNE_SEP---');
    expect(prompt).toContain('---FORTUNE_END---');
  });

  it('should include all five dimensions', () => {
    const prompt = buildFirstAnalysisPrompt(baziInfo);
    expect(prompt).toContain('"overall"');
    expect(prompt).toContain('"personality"');
    expect(prompt).toContain('"career"');
    expect(prompt).toContain('"love"');
    expect(prompt).toContain('"wealth"');
  });
});

describe('buildChatPrompt', () => {
  it('should include round number', () => {
    const prompt = buildChatPrompt('test bazi info', 5);
    expect(prompt).toContain('5/20');
  });

  it('should include bazi info', () => {
    const prompt = buildChatPrompt('乙亥年 甲子日', 1);
    expect(prompt).toContain('乙亥年');
    expect(prompt).toContain('甲子日');
  });
});
