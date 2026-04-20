'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@/hooks/useChat';
import type { BaziResult } from '@/lib/bazi';
import type { BirthInput } from '@/hooks/useBazi';

export default function ChatPage() {
  const router = useRouter();
  const [baziResult, setBaziResult] = useState<BaziResult | null>(null);
  const [birthInput, setBirthInput] = useState<BirthInput | null>(null);
  const [inputText, setInputText] = useState('');
  const chatListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      const storedBazi = sessionStorage.getItem('baziResult');
      const storedInput = sessionStorage.getItem('birthInput');
      if (storedBazi) setBaziResult(JSON.parse(storedBazi));
      if (storedInput) setBirthInput(JSON.parse(storedInput));
    }
  }, []);

  const { messages, isLoading, startFortune, sendMessage } = useChat(baziResult, birthInput?.gender ?? null);

  useEffect(() => {
    if (baziResult && messages.length === 0) {
      startFortune();
    }
  }, [baziResult]);

  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTo(0, chatListRef.current.scrollHeight);
    }
  }, [messages, isLoading]);

  const handleBack = useCallback(() => {
    router.push('/');
  }, [router]);

  const onSend = () => {
    if (!inputText.trim() || isLoading) return;
    sendMessage(inputText.trim());
    setInputText('');
  };

  if (!baziResult) {
    return (
      <div style={{ background: 'var(--bg-obsidian)', minHeight: '100dvh', color: 'var(--text-pure)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p>正在读取天机...</p>
        <button onClick={handleBack} style={{ marginTop: 16, color: 'var(--glow-gold)' }}>返回</button>
      </div>
    );
  }

  // Generate pillars display
  const pillars = [
    { name: '年', data: baziResult.yearPillar },
    { name: '月', data: baziResult.monthPillar },
    { name: '日', data: baziResult.dayPillar },
    { name: '时', data: baziResult.hourPillar || { stem: '?', branch: '?' } }
  ];

  return (
    <div style={{ background: 'var(--bg-obsidian)', color: 'var(--text-pure)', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Ambient background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'radial-gradient(circle at 50% 0%, oklch(0.2 0.05 280) 0%, transparent 60%)', opacity: 0.8, pointerEvents: 'none' }} />

      {/* Header */}
      <header style={{
        position: 'relative', zIndex: 10, height: '64px', padding: '0 16px', paddingTop: 'env(safe-area-inset-top)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'oklch(0.12 0.01 260 / 0.8)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid var(--glass-border)'
      }}>
        <button onClick={handleBack} style={{ background: 'none', border: 'none', color: 'var(--glow-gold)', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="font-display" style={{ fontSize: '1.2rem', letterSpacing: '0.1em', color: 'var(--glow-gold)' }}>天机测算</div>
        <div style={{ width: '40px' }} />
      </header>

      {/* Chat Area */}
      <div ref={chatListRef} className="chat-container" style={{
        flex: 1, position: 'relative', zIndex: 1, overflowY: 'auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px', scrollBehavior: 'smooth', paddingBottom: '120px'
      }}>
        {/* Bazi Summary Card */}
        <div style={{
          margin: '0 auto', background: 'oklch(0 0 0 / 0.3)', border: '1px solid oklch(0.85 0.16 85 / 0.2)',
          borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-around',
          fontFamily: 'var(--font-display)', color: 'var(--glow-gold)', fontSize: '1.1rem',
          boxShadow: '0 0 20px oklch(0.85 0.16 85 / 0.05)', marginBottom: '24px', width: '100%', maxWidth: '400px'
        }}>
          {pillars.map((p, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-pure)', marginBottom: '4px' }}>{p.data.stem}</span>
              <span style={{ fontWeight: 400, color: 'var(--glow-gold-dim)' }}>{p.data.branch}</span>
            </div>
          ))}
        </div>

        {/* Messages */}
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div key={idx} style={{
              display: 'flex', width: '100%', animation: 'slideUp 0.8s var(--ease-elastic) forwards',
              justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: isUser ? 'flex-start' : 'flex-end', gap: '8px'
            }}>
              {!isUser && (
                <div style={{
                  width: '32px', height: '32px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--glow-gold), var(--glow-gold-dim))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 16px oklch(0.85 0.16 85 / 0.3)', marginBottom: '4px'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bg-obsidian)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                </div>
              )}
              <div style={{
                maxWidth: '85%', padding: '12px 16px', fontSize: '0.95rem', lineHeight: '1.5', wordWrap: 'break-word',
                boxShadow: 'var(--shadow-glass)', position: 'relative',
                background: isUser ? 'var(--glow-gold)' : 'var(--glass-bg)',
                color: isUser ? 'var(--bg-obsidian)' : 'var(--text-pure)',
                borderRadius: isUser ? '20px 4px 20px 20px' : '20px 20px 20px 4px',
                fontWeight: isUser ? 500 : 400,
                backdropFilter: isUser ? 'none' : 'blur(12px)',
                WebkitBackdropFilter: isUser ? 'none' : 'blur(12px)',
                border: isUser ? 'none' : '1px solid var(--glass-border)'
              }}>
                <div dangerouslySetInnerHTML={{ __html: m.content.replace(/\n /g, '<br>').replace(/\*(.*?)\*/g, '<span style="color:var(--glow-gold);font-weight:bold;">$1</span>') }} />
                
                {/* For AI message that has full prediction, inject link to share page */}
                {!isUser && m.fortunes && (
                  <button 
                    onClick={() => router.push('/share')}
                    style={{
                      marginTop: '12px', width: '100%', padding: '10px', background: 'var(--glow-gold)',
                      color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
                    }}
                  >
                    获取完整运势法牌
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {isLoading && (
          <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
             <div style={{
                  width: '32px', height: '32px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--glow-gold), var(--glow-gold-dim))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 16px oklch(0.85 0.16 85 / 0.3)', marginBottom: '4px'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bg-obsidian)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                </div>
            <div style={{
               padding: '12px 16px', background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
               border: '1px solid var(--glass-border)', borderRadius: '20px 20px 20px 4px', display: 'flex', gap: '4px', alignItems: 'center', height: '42px'
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--glow-gold)', animation: 'bounceDot 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--glow-gold)', animation: 'bounceDot 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--glow-gold)', animation: 'bounceDot 1.4s infinite ease-in-out both' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        background: 'linear-gradient(to top, var(--bg-obsidian) 70%, transparent)',
        padding: '16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        display: 'flex', gap: '12px'
      }}>
        <div style={{
          flex: 1, background: 'oklch(0 0 0 / 0.4)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-full)',
          display: 'flex', alignItems: 'center', padding: '4px 16px', transition: 'border-color 0.4s var(--ease-elastic)'
        }}>
          <input 
            type="text" value={inputText} onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSend()} placeholder="输入你想测算的事项..."
            style={{
              flex: 1, background: 'transparent', border: 'none', color: 'var(--text-pure)', outline: 'none',
              minHeight: '48px', fontSize: '1rem'
            }}
          />
        </div>
        <button 
          onClick={onSend}
          style={{
            width: '56px', height: '56px', borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, var(--glow-gold), var(--glow-gold-dim))',
            border: 'none', color: 'var(--bg-obsidian)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px oklch(0.85 0.16 85 / 0.3)', cursor: 'pointer', transition: 'transform 0.4s var(--ease-elastic)'
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateX(-2px)' }}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>

    </div>
  );
}
