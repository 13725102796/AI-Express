'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBazi } from '@/hooks/useBazi';
import { LUNAR_MONTHS, LUNAR_DAYS, SHICHEN } from '@/lib/constants';

// We import Disclaimer just for reuse, though we style it inline below
import Disclaimer from '@/components/ui/Disclaimer';

export default function HomePage() {
  const router = useRouter();
  const { input, updateField, baziResult } = useBazi();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Generate year options (1940-2026)
  const years = Array.from({ length: 2026 - 1940 + 1 }, (_, i) => 1940 + i);

  const handleSubmit = useCallback(() => {
    setIsSubmitting(true);
    setAnimating(true);
    
    // Store data for chat page
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('baziResult', JSON.stringify(baziResult));
      sessionStorage.setItem('birthInput', JSON.stringify(input));
    }
    
    setTimeout(() => {
      router.push('/chat');
    }, 1500); // Wait for the crazy animation
  }, [baziResult, input, router]);

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden' }}>
      
      {/* Background Mist */}
      <div 
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: `
            radial-gradient(circle at 50% 20%, oklch(0.25 0.12 260) 0%, transparent 50%),
            radial-gradient(circle at 80% 100%, oklch(0.35 0.1 20) 0%, transparent 40%),
            radial-gradient(circle at 10% 80%, oklch(0.20 0.1 280) 0%, transparent 40%)
          `,
          backgroundColor: 'var(--bg-obsidian)',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E\")",
          pointerEvents: 'none'
        }} />
      </div>

      {/* Hero Section */}
      <div style={{
        position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', 
        alignItems: 'center', justifyContent: 'center', padding: '24px', paddingBottom: '40vh',
        transition: 'transform 0.6s var(--ease-elastic)',
      }}>
        <svg 
          viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"
          style={{
            width: '140px', height: '140px', marginBottom: '24px', color: 'var(--glow-gold)',
            filter: animating ? 'drop-shadow(0 0 60px var(--glow-gold))' : 'drop-shadow(0 0 32px var(--glow-gold-dim))',
            animation: animating ? 'rotateSlow 1s linear infinite, floatOrb 1s ease-in-out infinite' : 'floatOrb 6s ease-in-out infinite, rotateSlow 60s linear infinite',
            transition: 'all 0.4s var(--ease-elastic)'
          }}
        >
          <circle cx="60" cy="60" r="56" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
          <circle cx="60" cy="60" r="44" stroke="currentColor" strokeWidth="1" opacity="0.2"/>
          <path d="M60 16 A44 44 0 0 1 60 104 A22 22 0 0 1 60 60 A22 22 0 0 0 60 16Z" fill="currentColor" opacity="0.9"/>
          <path d="M60 16 A44 44 0 0 0 60 104 A22 22 0 0 0 60 60 A22 22 0 0 1 60 16Z" fill="currentColor" opacity="0.15"/>
          <circle cx="60" cy="38" r="6" fill="var(--bg-obsidian)" opacity="0.9"/>
          <circle cx="60" cy="82" r="6" fill="currentColor" opacity="0.9"/>
        </svg>

        <h1 className="font-display" style={{
          fontSize: '3rem', fontWeight: 400, letterSpacing: '0.15em', marginBottom: '4px',
          textShadow: '0 4px 24px oklch(0 0 0 / 0.8)', animation: 'fadeIn 1.2s var(--ease-smooth) forwards'
        }}>天 机</h1>
        <div className="font-magic" style={{
          fontSize: '1rem', color: 'var(--glow-gold)', textTransform: 'uppercase', opacity: 0.8,
          animation: 'fadeIn 1.5s var(--ease-smooth) forwards'
        }}>Celestial Oracle</div>
      </div>

      {/* Sticky Bottom Action Sheet */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        background: 'var(--glass-bg)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
        borderTop: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        boxShadow: 'var(--shadow-glass)', display: 'flex', flexDirection: 'column', gap: '20px',
        padding: '32px 24px calc(24px + env(safe-area-inset-bottom))',
        maxWidth: '500px', margin: '0 auto',
        animation: 'slideUp 1s var(--ease-elastic) 0.5s both',
      }}>
        <div style={{
          width: '48px', height: '4px', background: 'var(--glass-border)', borderRadius: 'var(--radius-full)', margin: '-16px auto 16px auto'
        }} />
        <div className="font-display" style={{ fontSize: '1.2rem', color: 'var(--text-pure)', textAlign: 'center', letterSpacing: '0.05em' }}>
          输入您的诞生时刻
        </div>

        {/* Gender Toggle */}
        <div style={{ display: 'flex', background: 'oklch(0 0 0 / 0.2)', border: `1px solid var(--glass-border)`, borderRadius: 'var(--radius-full)', height: '48px', padding: '4px', position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 4, bottom: 4, width: 'calc(33.33% - 4px)', background: 'var(--glow-gold)', borderRadius: 'var(--radius-full)',
            transition: 'transform var(--duration-base) var(--ease-elastic)', zIndex: 0,
            transform: input.gender === 'male' ? 'translateX(100%)' : input.gender === 'female' ? 'translateX(200%)' : 'translateX(0)',
          }} />
          {(['nil', 'male', 'female'] as const).map(g => {
            const mapped = g === 'nil' ? null : g;
            const checked = input.gender === mapped;
            return (
              <label key={g} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1 }}>
                <input type="radio" name="gender" disabled={isSubmitting} onChange={() => updateField('gender', mapped)} checked={checked} style={{ display: 'none' }} />
                <span style={{ fontSize: '0.9rem', transition: 'color var(--duration-base)', color: checked ? 'var(--bg-obsidian)' : 'var(--text-dim)' }}>
                  {g === 'male' ? '男' : g === 'female' ? '女' : '保密'}
                </span>
              </label>
            )
          })}
        </div>

        {/* Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="font-magic" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', paddingLeft: '4px' }}>Year</span>
            <select disabled={isSubmitting} value={input.year} onChange={(e) => updateField('year', Number(e.target.value))}
              style={{
                width: '100%', height: '52px', background: 'oklch(0 0 0 / 0.2)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)', color: 'var(--glow-gold)', padding: '0 16px', appearance: 'none',
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23d4a853' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px',
                outline: 'none', fontFamily: 'var(--font-body)', fontSize: '1rem',
              }}
            >
              {years.map(y => <option key={y} value={y} style={{background: 'var(--bg-obsidian-light)', color:'var(--text-pure)'}}>{y}年</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="font-magic" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', paddingLeft: '4px' }}>Month</span>
            <select disabled={isSubmitting} value={input.month} onChange={(e) => updateField('month', Number(e.target.value))}
              style={{
                width: '100%', height: '52px', background: 'oklch(0 0 0 / 0.2)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)', color: 'var(--glow-gold)', padding: '0 16px', appearance: 'none',
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23d4a853' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px',
                outline: 'none', fontFamily: 'var(--font-body)', fontSize: '1rem',
              }}
            >
              {LUNAR_MONTHS.map((name, idx) => (
                <option key={idx} value={idx + 1} style={{background: 'var(--bg-obsidian-light)', color:'var(--text-pure)'}}>{name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="font-magic" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', paddingLeft: '4px' }}>Day</span>
            <select disabled={isSubmitting} value={input.day} onChange={(e) => updateField('day', Number(e.target.value))}
              style={{
                width: '100%', height: '52px', background: 'oklch(0 0 0 / 0.2)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)', color: 'var(--glow-gold)', padding: '0 16px', appearance: 'none',
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23d4a853' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px',
                outline: 'none', fontFamily: 'var(--font-body)', fontSize: '1rem',
              }}
            >
              {LUNAR_DAYS.map((name, idx) => (
                <option key={idx} value={idx + 1} style={{background: 'var(--bg-obsidian-light)', color:'var(--text-pure)'}}>{name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="font-magic" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', paddingLeft: '4px' }}>Hour</span>
            <select disabled={isSubmitting} value={input.shichenIndex} onChange={(e) => updateField('shichenIndex', Number(e.target.value))}
              style={{
                width: '100%', height: '52px', background: 'oklch(0 0 0 / 0.2)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)', color: 'var(--glow-gold)', padding: '0 16px', appearance: 'none',
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23d4a853' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px',
                outline: 'none', fontFamily: 'var(--font-body)', fontSize: '1rem',
              }}
            >
              {SHICHEN.map(s => <option key={s.index} value={s.index} style={{background: 'var(--bg-obsidian-light)', color:'var(--text-pure)'}}>{s.name} ({s.range})</option>)}
              <option value={-1} style={{background: 'var(--bg-obsidian-light)', color:'var(--text-pure)'}}>不确定时辰</option>
            </select>
          </div>
        </div>

        {/* Custom Submit Button matching WOW animation */}
        <button 
          disabled={isSubmitting}
          onClick={handleSubmit}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '56px',
            borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--glow-gold), var(--glow-gold-dim))',
            color: 'var(--bg-obsidian)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700,
            letterSpacing: '0.1em', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-luminous)',
            transition: 'all var(--duration-base) var(--ease-elastic)', marginTop: '8px', position: 'relative', overflow: 'hidden',
            pointerEvents: isSubmitting ? 'none' : 'auto'
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isSubmitting ? (
             <div style={{
                width: '24px', height: '24px', border: '3px solid oklch(0.12 0.01 260 / 0.3)',
                borderTopColor: 'var(--bg-obsidian)', borderRadius: '50%', animation: 'spin 1s linear infinite'
              }} />
          ) : (
            <>
              <span className="btn-text">立 即 排 盘</span>
              <svg style={{ marginLeft: '8px' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </>
          )}
        </button>

      </div>
    </div>
  );
}
