'use client';

import { useState, useCallback, useRef } from 'react';
import { streamFortuneStart, streamFortuneChat } from '@/lib/api';
import type { BaziResult } from '@/lib/bazi';

export interface FortuneItem {
  dimension: string;
  title: string;
  summary: string;
  detail: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  fortunes?: FortuneItem[];
  isStreaming?: boolean;
  timestamp: number;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Parse the structured fortune response from the LLM.
 * Format: greeting text + ---FORTUNE_START--- + JSON blocks separated by ---FORTUNE_SEP--- + ---FORTUNE_END---
 */
function parseFortuneResponse(content: string): { greeting: string; fortunes: FortuneItem[] } {
  const fortunes: FortuneItem[] = [];
  let greeting = content;

  const startMarker = '---FORTUNE_START---';
  const endMarker = '---FORTUNE_END---';
  const sepMarker = '---FORTUNE_SEP---';

  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  if (startIdx !== -1) {
    greeting = content.slice(0, startIdx).trim();

    if (endIdx !== -1) {
      const fortuneSection = content.slice(startIdx + startMarker.length, endIdx).trim();
      const blocks = fortuneSection.split(sepMarker);

      for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        try {
          // Find JSON object in the block
          const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.dimension && parsed.title) {
              fortunes.push(parsed as FortuneItem);
            }
          }
        } catch {
          // If JSON parsing fails, skip this block
        }
      }
    }
  }

  return { greeting, fortunes };
}

function loadChatState(): { messages: ChatMessage[]; round: number } {
  if (typeof sessionStorage === 'undefined') return { messages: [], round: 0 };
  try {
    const stored = sessionStorage.getItem('chatState');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { messages: parsed.messages || [], round: parsed.round || 0 };
    }
  } catch { /* ignore */ }
  return { messages: [], round: 0 };
}

function saveChatState(messages: ChatMessage[], round: number) {
  if (typeof sessionStorage === 'undefined') return;
  // Only save non-streaming messages
  const toSave = messages.map(m => ({ ...m, isStreaming: false }));
  sessionStorage.setItem('chatState', JSON.stringify({ messages: toSave, round }));
}

export function useChat(baziResult: BaziResult | null, gender: 'male' | 'female' | null) {
  const initial = loadChatState();
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages);
  const [isLoading, setIsLoading] = useState(false);
  const [round, setRound] = useState(initial.round);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  /**
   * Start the first fortune analysis.
   */
  const startFortune = useCallback(async () => {
    if (!baziResult) return;
    setIsLoading(true);
    setError(null);

    const aiMessageId = generateId();
    setMessages([{
      id: aiMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: Date.now(),
    }]);

    try {
      let fullContent = '';

      for await (const event of streamFortuneStart({
        baziData: baziResult,
        gender,
      })) {
        if (event.type === 'chunk' && event.content) {
          fullContent += event.content;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId ? { ...m, content: fullContent } : m
            )
          );
        } else if (event.type === 'complete' && event.content) {
          fullContent = event.content;
          const { greeting, fortunes } = parseFortuneResponse(fullContent);

          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId
                ? { ...m, content: greeting, fortunes, isStreaming: false }
                : m
            )
          );
        } else if (event.type === 'error') {
          throw new Error(event.message || '卜算失败');
        }
      }

      // If we never got a 'complete' event, parse what we have
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === aiMessageId && m.isStreaming) {
            const { greeting, fortunes } = parseFortuneResponse(m.content);
            return { ...m, content: greeting, fortunes, isStreaming: false };
          }
          return m;
        })
      );

      setRound(1);
      setRetryCount(0);
      // Persist chat state
      setMessages((prev) => { saveChatState(prev, 1); return prev; });
    } catch (err: any) {
      setError(err.message || '大师正在卜算中，请稍后再试');
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId ? { ...m, isStreaming: false } : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [baziResult, gender]);

  /**
   * Send a follow-up message.
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!baziResult || isLoading || round >= 20) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const aiMessageId = generateId();
    const aiMsg: ChatMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setIsLoading(true);
    setError(null);

    const history = messages
      .filter((m) => !m.isStreaming)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    try {
      let aiContent = '';

      for await (const event of streamFortuneChat({
        message: content,
        baziData: baziResult,
        history,
        round: round + 1,
      })) {
        if (event.type === 'chat' && event.content) {
          aiContent += event.content;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId ? { ...m, content: aiContent } : m
            )
          );
        } else if (event.type === 'error') {
          throw new Error(event.message || '卜算失败');
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId ? { ...m, isStreaming: false } : m
        )
      );

      setRound((prev) => {
        const newRound = prev + 1;
        setMessages((msgs) => { saveChatState(msgs, newRound); return msgs; });
        return newRound;
      });
      setRetryCount(0);
    } catch (err: any) {
      setError(err.message || '大师正在卜算中，请稍后再试');
      // Remove the failed AI message
      setMessages((prev) => prev.filter((m) => m.id !== aiMessageId));
    } finally {
      setIsLoading(false);
    }
  }, [baziResult, isLoading, round, messages]);

  /**
   * Retry the last failed request.
   */
  const retry = useCallback(() => {
    if (retryCount >= 2) {
      setError('天机不可再泄，请稍后再试');
      return;
    }
    setRetryCount((prev) => prev + 1);
    setError(null);

    if (messages.length === 0) {
      startFortune();
    } else {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUserMsg) {
        // Remove the last user message so sendMessage can re-add it
        setMessages((prev) => prev.filter((m) => m.id !== lastUserMsg.id));
        sendMessage(lastUserMsg.content);
      }
    }
  }, [retryCount, messages, startFortune, sendMessage]);

  /**
   * Reset the chat.
   */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setRound(0);
    setIsLoading(false);
    setError(null);
    setRetryCount(0);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('chatState');
    }
  }, []);

  return {
    messages,
    isLoading,
    round,
    error,
    retryCount,
    startFortune,
    sendMessage,
    retry,
    reset,
    isAtLimit: round >= 20,
  };
}
