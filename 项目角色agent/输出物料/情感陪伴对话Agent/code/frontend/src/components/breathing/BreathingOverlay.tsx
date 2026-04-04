"use client";

import { useState, useEffect, useCallback } from "react";
import { useChatStore } from "@/stores/chatStore";

type Phase = "inhale" | "hold" | "exhale";
const PHASES: { phase: Phase; text: string; duration: number }[] = [
  { phase: "inhale", text: "吸...", duration: 4000 },
  { phase: "hold", text: "停...", duration: 4000 },
  { phase: "exhale", text: "呼...", duration: 6000 },
];

export function BreathingOverlay() {
  const { isBreathingMode, exitBreathingMode } = useChatStore();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [scale, setScale] = useState(0.6);

  const currentPhase = PHASES[phaseIndex];

  useEffect(() => {
    if (!isBreathingMode) return;

    // Set scale based on phase
    if (currentPhase.phase === "inhale") {
      setScale(1);
    } else if (currentPhase.phase === "hold") {
      setScale(1);
    } else {
      setScale(0.6);
    }

    const timer = setTimeout(() => {
      setPhaseIndex((prev) => (prev + 1) % PHASES.length);
    }, currentPhase.duration);

    return () => clearTimeout(timer);
  }, [isBreathingMode, phaseIndex, currentPhase]);

  const handleClose = useCallback(() => {
    exitBreathingMode();
    setPhaseIndex(0);
  }, [exitBreathingMode]);

  if (!isBreathingMode) return null;

  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-invert/80 backdrop-blur-md">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center
          text-text-on-dark/50 hover:text-text-on-dark transition-colors rounded-full"
        aria-label="退出呼吸模式"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Breathing circle */}
      <div className="relative flex items-center justify-center mb-12">
        {reducedMotion ? (
          // Reduced motion: color gradient instead of scale
          <div
            className="w-40 h-40 rounded-full transition-colors duration-[4000ms]"
            style={{
              backgroundColor:
                currentPhase.phase === "inhale"
                  ? "oklch(0.75 0.10 55 / 0.6)"
                  : currentPhase.phase === "hold"
                  ? "oklch(0.68 0.08 300 / 0.5)"
                  : "oklch(0.70 0.08 155 / 0.4)",
            }}
          />
        ) : (
          <div
            className="w-40 h-40 rounded-full bg-primary/40 backdrop-blur-sm"
            style={{
              transform: `scale(${scale})`,
              transition: `transform ${currentPhase.duration}ms var(--ease-out-quart)`,
              boxShadow: `0 0 ${scale * 60}px ${scale * 20}px oklch(0.75 0.10 55 / 0.2)`,
            }}
          />
        )}
      </div>

      {/* Phase text */}
      <p className="text-2xl text-text-on-dark/80 font-body font-light tracking-widest">
        {currentPhase.text}
      </p>

      {/* Cycle hint */}
      <p className="mt-8 text-sm text-text-on-dark/40">
        跟着这个节奏...再一次...
      </p>

      {/* Safety disclaimer */}
      <p className="absolute bottom-8 text-[10px] text-text-on-dark/30 text-center px-8">
        呼吸引导不替代专业心理咨询
      </p>
    </div>
  );
}
