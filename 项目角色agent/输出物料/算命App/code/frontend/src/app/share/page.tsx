'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toPng } from 'html-to-image';
import { FORTUNE_SIGNS } from '@/lib/constants';
import Toast from '@/components/ui/Toast';
import type { BaziResult } from '@/lib/bazi';

type CardStyle = 'ink-gold' | 'cinnabar' | 'ink-wash';

const STYLE_CONFIGS: Record<CardStyle, {
  name: string;
  accentColor: string;
  accentDim: string;
  glowColor: string;
}> = {
  'ink-gold': {
    name: '墨金经典',
    accentColor: 'var(--glow-gold)',
    accentDim: 'var(--glow-gold-dim)',
    glowColor: 'oklch(0.85 0.16 85 / 0.15)',
  },
  'cinnabar': {
    name: '朱砂吉祥',
    accentColor: '#E25252',
    accentDim: '#E2525240',
    glowColor: 'oklch(0.6 0.2 25 / 0.15)',
  },
  'ink-wash': {
    name: '水墨淡雅',
    accentColor: '#A8A8A8',
    accentDim: '#A8A8A840',
    glowColor: 'oklch(0.5 0 0 / 0.1)',
  },
};

export default function SharePage() {
  const router = useRouter();
  const [baziResult, setBaziResult] = useState<BaziResult | null>(null);
  const [currentStyle, setCurrentStyle] = useState<CardStyle>('ink-gold');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean; type: 'success' | 'error' }>({
    message: '', visible: false, type: 'success',
  });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      const storedBazi = sessionStorage.getItem('baziResult');
      if (storedBazi) setBaziResult(JSON.parse(storedBazi));
    }
  }, []);

  const signData = FORTUNE_SIGNS[currentStyle];
  const styleConfig = STYLE_CONFIGS[currentStyle];

  const handleBack = () => {
    router.back();
  };

  const handleReset = () => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('baziResult');
      sessionStorage.removeItem('birthInput');
    }
    router.push('/');
  };

  const handleSave = useCallback(async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `tianji-fortune-${currentStyle}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setToast({ message: '已保存法牌', visible: true, type: 'success' });
    } catch {
      setToast({ message: '保存失败，请重试', visible: true, type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  }, [currentStyle]);

  const handleCycleStyle = useCallback(() => {
    const styles: CardStyle[] = ['ink-gold', 'cinnabar', 'ink-wash'];
    const currentIdx = styles.indexOf(currentStyle);
    setCurrentStyle(styles[(currentIdx + 1) % styles.length]);
  }, [currentStyle]);

  if (!baziResult) {
    return (
      <div style={{ background: 'var(--bg-obsidian)', minHeight: '100dvh', color: 'var(--text-pure)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p>法牌生成中...</p>
        <button onClick={() => router.push('/')} style={{ marginTop: 16, color: 'var(--glow-gold)' }}>返回</button>
      </div>
    );
  }

  const baziString = `${baziResult.yearPillar.stem}${baziResult.yearPillar.branch}・${baziResult.monthPillar.stem}${baziResult.monthPillar.branch}・${baziResult.dayPillar.stem}${baziResult.dayPillar.branch}${baziResult.hourPillar ? `・${baziResult.hourPillar.stem}${baziResult.hourPillar.branch}` : ''}`;

  const today = new Date();
  const dateSolar = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div style={{
      background: 'var(--bg-obsidian)', color: 'var(--text-pure)', minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', padding: '24px 0'
    }}>
      {/* Ambient backgrounds */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'radial-gradient(circle at 50% 50%, oklch(0.2 0.02 260) 0%, oklch(0.1 0.01 260) 100%)' }} />
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(var(--glow-gold-dim) 1px, transparent 1px)', backgroundSize: '40px 40px',
        opacity: 0.1, animation: 'bgDrift 20s linear infinite'
      }} />

      {/* Back button */}
      <button
        onClick={handleBack}
        style={{
          position: 'absolute', top: '16px', left: '16px', zIndex: 20, width: '40px', height: '40px',
          borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={styleConfig.accentColor} strokeWidth="2" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Main Card */}
      <div style={{ position: 'relative', zIndex: 10, width: 'calc(100% - 48px)', maxWidth: '400px', perspective: '1000px' }}>
        <div
          ref={cardRef}
          style={{
            width: '100%', aspectRatio: '3 / 4.5',
            background: 'linear-gradient(145deg, oklch(0 0 0 / 0.6) 0%, oklch(0 0 0 / 0.8) 100%)',
            borderRadius: '20px', border: `1px solid ${styleConfig.accentDim}`, position: 'relative', overflow: 'hidden',
            boxShadow: `0 0 60px ${styleConfig.glowColor}, 0 20px 40px oklch(0 0 0 / 0.6)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            animation: 'cardEnter 1s var(--ease-elastic) forwards', transform: 'translateY(100vh) rotateX(20deg)',
            transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
          }}
        >
          {/* Card Top Glow */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
            background: `radial-gradient(circle at 50% -20%, ${styleConfig.accentDim} 0%, transparent 70%)`, opacity: 0.3, pointerEvents: 'none',
            transition: 'background 0.5s ease',
          }} />

          {/* Magic Circle */}
          <div style={{
            position: 'absolute', top: '15%', width: '240px', height: '240px', borderRadius: '50%',
            border: `1px dashed ${styleConfig.accentDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'rotateSlow 30s linear infinite', opacity: 0.5,
            transition: 'border-color 0.5s ease',
          }}>
            <div style={{ position: 'absolute', inset: '10px', border: `1px solid ${styleConfig.accentColor}`, borderRadius: '50%', transition: 'border-color 0.5s ease' }} />
          </div>

          {/* Title + BaZi */}
          <div style={{ position: 'relative', zIndex: 2, marginTop: '32px', textAlign: 'center' }}>
            <div className="font-display" style={{
              fontSize: '1.8rem', color: styleConfig.accentColor, letterSpacing: '0.2rem', marginBottom: '8px',
              textShadow: `0 0 12px ${styleConfig.accentColor}`, transition: 'color 0.5s ease, text-shadow 0.5s ease',
            }}>吉 时 已 到</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-pure)', opacity: 0.8, letterSpacing: '0.1rem', fontFamily: 'var(--font-body)' }}>
              {baziString}
            </div>
          </div>

          {/* Sign Type */}
          <div className="font-display" style={{
            position: 'relative', zIndex: 2, marginTop: 'auto', marginBottom: '8px', fontSize: '4rem', fontWeight: 700,
            textShadow: `0 0 32px ${styleConfig.accentColor}`,
            letterSpacing: '0.3rem',
            backgroundImage: `linear-gradient(180deg, #FFFFFF 0%, ${styleConfig.accentColor} 100%)`,
            backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent',
            transition: 'text-shadow 0.5s ease',
          }}>
            {signData.type}
          </div>

          {/* Keywords */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: '12px', marginBottom: '8px' }}>
            {signData.keywords.map((kw, i) => (
              <span key={i} className="font-display" style={{
                fontSize: '0.85rem', color: styleConfig.accentColor, letterSpacing: '0.1em',
                transition: 'color 0.5s ease',
              }}>
                {kw}
              </span>
            ))}
          </div>

          {/* Bottom Section */}
          <div style={{
            position: 'relative', zIndex: 2, background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            width: '100%', padding: '24px', borderTop: `1px solid ${styleConfig.accentDim}`, textAlign: 'center',
            marginTop: 'auto', transition: 'border-color 0.5s ease',
          }}>
            <div className="font-display" style={{ fontSize: '1rem', lineHeight: 2, color: styleConfig.accentColor, marginBottom: '8px', transition: 'color 0.5s ease' }}>
              {signData.poem}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-pure)', opacity: 0.6, marginBottom: '16px' }}>
              {signData.interpretation}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-pure)', opacity: 0.4 }}>{dateSolar}</div>
              <div className="font-display" style={{ fontSize: '0.75rem', color: styleConfig.accentDim, letterSpacing: '0.1em' }}>天机 AI</div>
            </div>
          </div>
        </div>
      </div>

      {/* Style Switcher */}
      <div style={{
        display: 'flex', gap: '20px', marginTop: '24px', position: 'relative', zIndex: 10,
        animation: 'fadeIn 1s ease 0.8s both',
      }}>
        {(Object.keys(STYLE_CONFIGS) as CardStyle[]).map((style) => (
          <button
            key={style}
            onClick={() => setCurrentStyle(style)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              border: `2px solid ${currentStyle === style ? STYLE_CONFIGS[style].accentColor : 'var(--glass-border)'}`,
              background: 'var(--glass-bg)',
              transition: 'border-color 0.3s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%',
                background: STYLE_CONFIGS[style].accentColor,
                opacity: currentStyle === style ? 1 : 0.4,
                transition: 'opacity 0.3s ease',
              }} />
            </div>
            <span style={{
              fontSize: '0.7rem', fontFamily: 'var(--font-body)',
              color: currentStyle === style ? STYLE_CONFIGS[style].accentColor : 'var(--text-pure)',
              opacity: currentStyle === style ? 1 : 0.4,
              transition: 'color 0.3s ease, opacity 0.3s ease',
            }}>
              {STYLE_CONFIGS[style].name}
            </span>
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{
        marginTop: '20px', display: 'flex', gap: '12px', width: '100%', maxWidth: '400px', padding: '0 24px',
        position: 'relative', zIndex: 10, animation: 'fadeIn 1s ease 1s both',
      }}>
        <button
          onClick={handleReset}
          style={{
            flex: 1, height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer',
            border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: styleConfig.accentColor,
            transition: 'transform 0.2s, color 0.5s ease',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >重新测算</button>
        <button
          onClick={handleSave}
          disabled={isGenerating}
          style={{
            flex: 1, height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer',
            border: 'none', background: styleConfig.accentColor, color: '#000',
            boxShadow: `0 0 16px ${styleConfig.accentDim}`,
            transition: 'transform 0.2s, background 0.5s ease, box-shadow 0.5s ease',
            opacity: isGenerating ? 0.6 : 1,
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >{isGenerating ? '保存中...' : '保存法牌'}</button>
        <button
          onClick={() => setShowActionSheet(true)}
          style={{
            width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
            transition: 'transform 0.2s', flexShrink: 0,
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={styleConfig.accentColor} strokeWidth="2" strokeLinecap="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            <polyline points="16,6 12,2 8,6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
      </div>

      {/* Action Sheet */}
      {showActionSheet && (
        <>
          <div
            onClick={() => setShowActionSheet(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'oklch(0 0 0 / 0.5)' }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70, padding: '20px 20px 36px',
            background: 'var(--bg-obsidian)', borderRadius: '16px 16px 0 0', border: '1px solid var(--glass-border)', borderBottom: 'none',
            animation: 'sheetUp 0.3s ease both',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
              {[
                { icon: '💬', label: '微信好友' },
                { icon: '🔵', label: '朋友圈' },
                { icon: '💾', label: '保存图片', action: handleSave },
                { icon: '🔗', label: '复制链接' },
              ].map((item) => (
                <button
                  key={item.label}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => {
                    setShowActionSheet(false);
                    if (item.action) { item.action(); return; }
                    setToast({ message: `已${item.label === '复制链接' ? '复制' : '分享'}`, visible: true, type: 'success' });
                  }}
                >
                  <span style={{
                    width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.25rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                  }}>
                    {item.icon}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-pure)', opacity: 0.7 }}>{item.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowActionSheet(false)}
              style={{
                width: '100%', height: '44px', borderRadius: '22px', background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)', color: 'var(--text-pure)', opacity: 0.7,
                fontFamily: 'var(--font-body)', fontSize: '0.9rem', cursor: 'pointer',
              }}
            >取消</button>
          </div>
        </>
      )}

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
        type={toast.type}
      />

      <style>{`
        @keyframes bgDrift { from { transform: translateY(0); } to { transform: translateY(-40px); } }
        @keyframes cardEnter { to { transform: translateY(0) rotateX(0deg); } }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}
