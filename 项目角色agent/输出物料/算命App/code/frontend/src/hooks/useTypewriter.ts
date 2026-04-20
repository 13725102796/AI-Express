'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Hook for typewriter text effect.
 * Progressively reveals text character by character.
 */
export function useTypewriter(
  text: string,
  speed = 30,
  enabled = true
): { displayed: string; isComplete: boolean } {
  const [displayed, setDisplayed] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const prevTextRef = useRef('');

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text);
      setIsComplete(true);
      return;
    }

    // If text grows (streaming), just append new chars
    if (text.startsWith(prevTextRef.current) && prevTextRef.current.length > 0) {
      const startIndex = prevTextRef.current.length;
      let i = startIndex;

      const timer = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, ++i));
        } else {
          clearInterval(timer);
          setIsComplete(true);
        }
      }, speed);

      prevTextRef.current = text;

      return () => clearInterval(timer);
    }

    // Fresh text - start from beginning
    setDisplayed('');
    setIsComplete(false);
    let i = 0;

    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, ++i));
      } else {
        clearInterval(timer);
        setIsComplete(true);
      }
    }, speed);

    prevTextRef.current = text;

    return () => clearInterval(timer);
  }, [text, speed, enabled]);

  return { displayed, isComplete };
}
