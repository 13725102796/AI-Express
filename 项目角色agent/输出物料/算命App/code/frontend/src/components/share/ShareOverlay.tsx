'use client';

import { useState, useCallback, useRef } from 'react';
import { toPng } from 'html-to-image';
import { FORTUNE_SIGNS } from '@/lib/constants';
import Toast from '@/components/ui/Toast';
import type { FortuneItem } from '@/hooks/useChat';

type CardStyle = 'ink-gold' | 'cinnabar' | 'ink-wash';

interface ShareOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  fortunes?: FortuneItem[];
  baziSummary?: string;
}

const STYLE_CONFIGS: Record<CardStyle, {
  name: string;
  bg: string;
  borderColor: string;
  accentColor: string;
  textColor: string;
}> = {
  'ink-gold': {
    name: '墨金经典',
    bg: 'linear-gradient(135deg, #1C1917 0%, #292524 50%, #1C1917 100%)',
    borderColor: 'var(--color-accent-gold-dim)',
    accentColor: 'var(--color-accent-gold)',
    textColor: 'var(--color-text-primary)',
  },
  'cinnabar': {
    name: '朱砂吉祥',
    bg: 'linear-gradient(135deg, #1C1917 0%, #2A1A1A 50%, #1C1917 100%)',
    borderColor: 'var(--color-accent-red)',
    accentColor: 'var(--color-accent-red)',
    textColor: 'var(--color-text-primary)',
  },
  'ink-wash': {
    name: '水墨淡雅',
    bg: 'linear-gradient(135deg, #1C1917 0%, #1E2124 50%, #1C1917 100%)',
    borderColor: 'var(--color-text-muted)',
    accentColor: 'var(--color-text-secondary)',
    textColor: 'var(--color-text-primary)',
  },
};

export default function ShareOverlay({ isOpen, onClose, fortunes, baziSummary }: ShareOverlayProps) {
  const [currentStyle, setCurrentStyle] = useState<CardStyle>('ink-gold');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean; type: 'success' | 'error' }>({
    message: '', visible: false, type: 'success',
  });
  const cardRef = useRef<HTMLDivElement>(null);

  const signData = FORTUNE_SIGNS[currentStyle];
  const styleConfig = STYLE_CONFIGS[currentStyle];

  // Use fortune keywords if available
  const keywords = fortunes && fortunes.length > 0
    ? fortunes.slice(0, 3).map((f) => f.title)
    : signData.keywords;

  const handleSave = useCallback(async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        width: 280,
        height: 497,
      });
      // Create download link
      const link = document.createElement('a');
      link.download = `tianji-fortune-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setToast({ message: '已保存到相册', visible: true, type: 'success' });
    } catch {
      setToast({ message: '保存失败，请重试', visible: true, type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleRegenerate = useCallback(() => {
    // Cycle through styles
    const styles: CardStyle[] = ['ink-gold', 'cinnabar', 'ink-wash'];
    const currentIdx = styles.indexOf(currentStyle);
    setCurrentStyle(styles[(currentIdx + 1) % styles.length]);
  }, [currentStyle]);

  if (!isOpen) return null;

  const today = new Date();
  const dateSolar = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  return (
    <>
      {/* Overlay backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: 'oklch(0 0 0 / 0.6)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          maxHeight: '90dvh',
          background: 'var(--color-bg-primary)',
          borderRadius: '16px 16px 0 0',
          animation: 'slideUp 500ms var(--ease-out-expo) both',
        }}
      >
        <style jsx>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
          <h2
            className="font-display font-bold"
            style={{ fontSize: '1.5rem', color: 'var(--color-accent-gold)' }}
          >
            签文
          </h2>
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-bg-secondary)' }}
            onClick={onClose}
            aria-label="关闭"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card Preview */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <div className="flex justify-center mb-4">
            <div
              ref={cardRef}
              className="relative flex flex-col items-center justify-between p-6"
              style={{
                width: 280,
                height: 497,
                background: styleConfig.bg,
                border: `1px solid ${styleConfig.borderColor}`,
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-gold)',
              }}
            >
              {/* Top decorative pattern */}
              <svg width="100%" height="20" className="absolute top-4 left-0">
                <line x1="10%" y1="10" x2="90%" y2="10" stroke={styleConfig.accentColor} strokeWidth="0.5" opacity="0.4" />
                <rect x="40%" y="6" width="20%" height="8" rx="4" fill="none" stroke={styleConfig.accentColor} strokeWidth="0.5" opacity="0.3" />
              </svg>

              {/* Fortune type badge */}
              <div className="mt-8">
                <span
                  className="badge badge-gold text-sm"
                  style={{
                    color: styleConfig.accentColor,
                    borderColor: styleConfig.accentColor,
                    background: `color-mix(in oklch, ${styleConfig.accentColor} 10%, transparent)`,
                  }}
                >
                  {signData.type}
                </span>
              </div>

              {/* Keywords */}
              <div className="flex flex-col items-center gap-1 my-4">
                {keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="font-display font-bold"
                    style={{
                      fontSize: '1.4rem',
                      color: styleConfig.accentColor,
                      letterSpacing: '0.15em',
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>

              {/* Poem */}
              <div className="text-center mb-2">
                <p
                  className="font-display mb-2"
                  style={{
                    fontSize: '1rem',
                    color: styleConfig.textColor,
                    lineHeight: 2,
                  }}
                >
                  {signData.poem}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {signData.interpretation}
                </p>
              </div>

              {/* Bottom decoration */}
              <div className="w-full flex flex-col items-center gap-2 mt-auto">
                <hr
                  className="w-3/5 border-0 h-px"
                  style={{ background: styleConfig.accentColor, opacity: 0.3 }}
                />
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {dateSolar}
                </p>
                <div className="flex items-center gap-1">
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    天机 AI
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Style Switcher */}
          <div className="flex items-center justify-center gap-4 mb-4">
            {(Object.keys(STYLE_CONFIGS) as CardStyle[]).map((style) => (
              <button
                key={style}
                className="flex flex-col items-center gap-1"
                onClick={() => setCurrentStyle(style)}
              >
                <div
                  className="w-10 h-10 rounded-full border-2 transition-all"
                  style={{
                    background: STYLE_CONFIGS[style].bg,
                    borderColor: currentStyle === style
                      ? 'var(--color-accent-gold)'
                      : 'var(--color-bg-tertiary)',
                  }}
                />
                <span
                  className="text-xs font-display"
                  style={{
                    color: currentStyle === style
                      ? 'var(--color-accent-gold)'
                      : 'var(--color-text-muted)',
                  }}
                >
                  {STYLE_CONFIGS[style].name}
                </span>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 mb-3">
            <button
              className="btn-primary w-full"
              onClick={handleSave}
              disabled={isGenerating}
            >
              {isGenerating ? '保存中...' : '保存图片'}
            </button>
            <button
              className="btn-secondary w-full"
              onClick={() => setShowActionSheet(true)}
            >
              分享
            </button>
            <button
              className="btn-ghost w-full"
              onClick={handleRegenerate}
            >
              重新生成
            </button>
          </div>

          {/* Disclaimer */}
          <p
            className="text-center py-2"
            style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}
          >
            仅供娱乐参考，不构成任何现实决策依据
          </p>
        </div>
      </div>

      {/* Action Sheet */}
      {showActionSheet && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            style={{ background: 'oklch(0 0 0 / 0.3)' }}
            onClick={() => setShowActionSheet(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-[70] p-4 pb-8"
            style={{
              background: 'var(--color-bg-secondary)',
              borderRadius: '16px 16px 0 0',
            }}
          >
            <div className="grid grid-cols-4 gap-4 mb-4">
              {[
                { icon: '💬', label: '微信好友' },
                { icon: '🔵', label: '朋友圈' },
                { icon: '💾', label: '保存图片' },
                { icon: '🔗', label: '复制链接' },
              ].map((item) => (
                <button
                  key={item.label}
                  className="flex flex-col items-center gap-2"
                  onClick={() => {
                    setShowActionSheet(false);
                    setToast({ message: `已${item.label === '复制链接' ? '复制' : '分享'}`, visible: true, type: 'success' });
                  }}
                >
                  <span
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: 'var(--color-bg-tertiary)' }}
                  >
                    {item.icon}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
            <button
              className="btn-ghost w-full"
              onClick={() => setShowActionSheet(false)}
            >
              取消
            </button>
          </div>
        </>
      )}

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
        type={toast.type}
      />
    </>
  );
}
