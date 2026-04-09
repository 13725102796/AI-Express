"use client";

import { useState, useRef, useCallback } from "react";

export type TTSState = "idle" | "loading" | "playing" | "error";

const SAMPLE_RATE = 24000;

/**
 * 流式 PCM 音频播放 hook。
 * 从 /api/tts 获取 chunked PCM 流，用 Web Audio API 逐块播放。
 */
export function useTTSPlayback() {
  const [state, setState] = useState<TTSState>("idle");
  const ctxRef = useRef<AudioContext | null>(null);
  const nextTimeRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const getAudioContext = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const play = useCallback(
    async (text: string, emotion: string): Promise<void> => {
      // 中止上一次播放
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      const ctx = getAudioContext();
      nextTimeRef.current = ctx.currentTime;
      setState("loading");

      try {
        const resp = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, emotion }),
          signal: abort.signal,
        });

        if (!resp.ok || !resp.body) {
          setState("error");
          return;
        }

        const reader = resp.body.getReader();
        let isFirst = true;
        // 攒够一定字节再调度，避免太碎的 buffer 导致音频卡顿
        const MIN_CHUNK = SAMPLE_RATE * 2 * 0.05; // 50ms 最小块 = 2400 bytes
        let pendingBytes = new Uint8Array(0);

        while (true) {
          const { done, value } = await reader.read();
          if (abort.signal.aborted) return;

          if (value) {
            // 合并待处理字节
            const merged = new Uint8Array(pendingBytes.length + value.length);
            merged.set(pendingBytes);
            merged.set(value, pendingBytes.length);
            pendingBytes = merged;
          }

          // 当攒够了或者结束时，调度播放
          if (pendingBytes.length >= MIN_CHUNK || (done && pendingBytes.length > 0)) {
            // 对齐到 2 字节（Int16）
            const usable = pendingBytes.length - (pendingBytes.length % 2);
            if (usable > 0) {
              const chunk = pendingBytes.slice(0, usable);
              pendingBytes = pendingBytes.slice(usable);

              const int16 = new Int16Array(chunk.buffer, chunk.byteOffset, usable / 2);
              const float32 = new Float32Array(int16.length);
              for (let i = 0; i < int16.length; i++) {
                float32[i] = int16[i] / 32768;
              }

              const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
              buffer.getChannelData(0).set(float32);

              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);

              // 如果 nextTime 已经过去了（网络慢），重置到当前时间
              if (nextTimeRef.current < ctx.currentTime) {
                nextTimeRef.current = ctx.currentTime;
              }

              source.start(nextTimeRef.current);
              activeSourcesRef.current.add(source);
              source.onended = () => activeSourcesRef.current.delete(source);
              nextTimeRef.current += buffer.duration;

              if (isFirst) {
                setState("playing");
                isFirst = false;
              }
            }
          }

          if (done) break;
        }

        // 等所有块播完
        const remaining = nextTimeRef.current - ctx.currentTime;
        if (remaining > 0) {
          await new Promise((r) => setTimeout(r, remaining * 1000));
        }
        if (!abort.signal.aborted) setState("idle");
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setState("error");
        }
      }
    },
    [getAudioContext]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    activeSourcesRef.current.forEach((s) => {
      try { s.stop(); } catch {}
    });
    activeSourcesRef.current.clear();
    setState("idle");
  }, []);

  return { state, play, stop };
}
