"use client";

import { useRef, useCallback, useState } from "react";

export type TTSState = "idle" | "loading" | "playing" | "error";

const SAMPLE_RATE = 24000;
// 主分句标点（语义完整的断句点）
const PRIMARY_PUNCT = /[。！？；…]/;
// 次要标点（仅在超长句时才拆）
const SECONDARY_PUNCT = /[，,、：]/;
const MAX_LEN = 50; // 超过此长度在次要标点处拆
const MERGE_LEN = 15; // 短于此长度的句子合并到上一句
const MIN_CHUNK_BYTES = SAMPLE_RATE * 2 * 0.05; // 50ms = 2400 bytes

/**
 * 逐句 TTS 调度 hook（串行请求，流式播放）。
 *
 * 每个句子：fetch → 边收流式 PCM 边调度 Web Audio 播放 → 句子播完 → 下一句
 * 用户体感：首块 PCM 到达即开始出声，不等整句合成完。
 */
export function useSentenceTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playbackState, setPlaybackState] = useState<TTSState>("idle");

  const processedLenRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const queueRef = useRef<Array<{ text: string; emotion: string }>>([]);
  const isPlayingRef = useRef(false);
  const sentenceCountRef = useRef(0); // 追踪已入队句子数，第一句特殊处理

  // AudioContext
  const ctxRef = useRef<AudioContext | null>(null);
  const nextTimeRef = useRef(0);

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  // 调度一块 PCM 到 Web Audio（立即排入播放队列，无缝衔接）
  const schedulePCM = useCallback(
    (pcmBytes: Uint8Array) => {
      const ctx = getCtx();
      const usable = pcmBytes.length - (pcmBytes.length % 2);
      if (usable === 0) return;

      const int16 = new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, usable / 2);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      if (nextTimeRef.current < ctx.currentTime) {
        nextTimeRef.current = ctx.currentTime;
      }
      source.start(nextTimeRef.current);
      nextTimeRef.current += buffer.duration;
    },
    [getCtx]
  );

  // 流式请求 TTS 并边收边播
  const streamAndPlay = useCallback(
    async (text: string, emotion: string, signal: AbortSignal): Promise<void> => {
      console.log("[TTS] 流式播放:", text);
      const resp = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, emotion }),
        signal,
      });
      if (!resp.ok || !resp.body) return;

      const reader = resp.body.getReader();
      let pending = new Uint8Array(0);
      let isFirst = true;

      while (true) {
        const { done, value } = await reader.read();
        if (signal.aborted) return;
        if (value) {
          const merged = new Uint8Array(pending.length + value.length);
          merged.set(pending);
          merged.set(value, pending.length);
          pending = merged;
        }
        if (pending.length >= MIN_CHUNK_BYTES || (done && pending.length > 0)) {
          const usable = pending.length - (pending.length % 2);
          if (usable > 0) {
            schedulePCM(pending.slice(0, usable));
            pending = pending.slice(usable);
            if (isFirst) {
              console.log("[TTS] 首块出声:", text.slice(0, 20));
              setPlaybackState("playing");
              isFirst = false;
            }
          }
        }
        if (done) break;
      }
    },
    [schedulePCM]
  );

  // 预下载 TTS（不播放，返回完整 PCM）
  const prefetchTTS = useCallback(
    async (text: string, emotion: string, signal: AbortSignal): Promise<Uint8Array | null> => {
      console.log("[TTS] 预下载:", text);
      try {
        const resp = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, emotion }),
          signal,
        });
        if (!resp.ok || !resp.body) return null;
        const reader = resp.body.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        const total = chunks.reduce((s, c) => s + c.length, 0);
        const merged = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { merged.set(c, off); off += c.length; }
        console.log("[TTS] 预下载完成:", text.slice(0, 20), `${total}b`);
        return merged;
      } catch { return null; }
    },
    []
  );

  // 播放预下载的 PCM 数据
  const playBuffer = useCallback(
    (pcm: Uint8Array) => {
      const usable = pcm.length - (pcm.length % 2);
      if (usable > 0) schedulePCM(pcm.slice(0, usable));
    },
    [schedulePCM]
  );

  // 核心调度：第一句流式播放，后续并行预下载 + 顺序播放
  const drainQueue = useCallback(async () => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    setIsSpeaking(true);

    const ctx = getCtx();
    nextTimeRef.current = ctx.currentTime;

    if (!abortRef.current) abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    let isFirstSentence = true;

    while (queueRef.current.length > 0) {
      if (signal.aborted) break;

      if (isFirstSentence) {
        // 第一句：流式播放（边下边播，最快出声）
        const item = queueRef.current.shift()!;
        setPlaybackState("loading");
        await streamAndPlay(item.text, item.emotion, signal);
        isFirstSentence = false;

        // 第一句发出后，立即并行预下载队列中所有剩余句子
        const remaining = queueRef.current.splice(0);
        if (remaining.length > 0) {
          console.log("[TTS] 并行预下载", remaining.length, "句");
          const prefetches = remaining.map((r) => prefetchTTS(r.text, r.emotion, signal));

          // 按顺序等待并播放
          for (const pf of prefetches) {
            if (signal.aborted) break;
            const pcm = await pf;
            if (pcm && pcm.length > 0) {
              playBuffer(pcm);
            }
          }
        }
      } else {
        // 后续新到的句子（LLM 还在输出时追加的），也流式播放
        const item = queueRef.current.shift()!;
        await streamAndPlay(item.text, item.emotion, signal);
      }
    }

    // 等最后一块播完
    const ctx2 = getCtx();
    const wait = nextTimeRef.current - ctx2.currentTime;
    if (wait > 0) await new Promise((r) => setTimeout(r, wait * 1000));

    isPlayingRef.current = false;
    setIsSpeaking(false);
    setPlaybackState("idle");
  }, [getCtx, streamAndPlay, prefetchTTS, playBuffer]);

  // LLM 流式输出时调用
  const feedText = useCallback(
    (fullText: string, emotion: string) => {
      if (!abortRef.current) abortRef.current = new AbortController();

      const newText = fullText.slice(processedLenRef.current);
      if (!newText) return;

      // 第一句特殊处理：在逗号处就拆（≤15字快速出声）
      const isFirst = sentenceCountRef.current === 0;
      const splitPunct = isFirst ? /[。！？；…，,]/ : PRIMARY_PUNCT;

      let lastEnd = -1;
      for (let i = 0; i < newText.length; i++) {
        if (splitPunct.test(newText[i])) lastEnd = i;
      }
      if (lastEnd === -1) return;

      const completePart = newText.slice(0, lastEnd + 1);
      processedLenRef.current += completePart.length;

      // 商业级拆句：参考 CosyVoice split_paragraph 算法
      // 1. 先按主标点拆
      const rawParts: string[] = [];
      let st = 0;
      for (let i = 0; i < completePart.length; i++) {
        if (PRIMARY_PUNCT.test(completePart[i])) {
          if (i > st) rawParts.push(completePart.slice(st, i + 1));
          st = i + 1;
        }
      }
      if (st < completePart.length) rawParts.push(completePart.slice(st));

      // 2. 超长句按次要标点再拆
      const splitLong: string[] = [];
      for (const part of rawParts) {
        if (part.length <= MAX_LEN) {
          splitLong.push(part);
        } else {
          // 在次要标点处拆
          let s = 0;
          for (let i = 0; i < part.length; i++) {
            if (SECONDARY_PUNCT.test(part[i]) && (i - s) >= MERGE_LEN) {
              splitLong.push(part.slice(s, i + 1));
              s = i + 1;
            }
          }
          if (s < part.length) splitLong.push(part.slice(s));
        }
      }

      // 3. 短句合并到上一句（< MERGE_LEN 字的合并）
      const merged: string[] = [];
      for (const part of splitLong) {
        if (merged.length > 0 && part.length < MERGE_LEN) {
          merged[merged.length - 1] += part;
        } else {
          merged.push(part);
        }
      }

      for (const sentence of merged) {
        const s = sentence.trim();
        if (s) {
          console.log("[TTS] 入队:", s, isFirst ? "(首句快速)" : "");
          queueRef.current.push({ text: s, emotion });
          sentenceCountRef.current++;
        }
      }

      drainQueue();
    },
    [drainQueue]
  );

  // LLM 流结束
  const flush = useCallback(
    (fullText: string, emotion: string) => {
      const remaining = fullText.slice(processedLenRef.current).trim();
      if (remaining) {
        console.log("[TTS] flush:", remaining);
        queueRef.current.push({ text: remaining, emotion });
        drainQueue();
      }
      processedLenRef.current = 0;
      sentenceCountRef.current = 0;
    },
    [drainQueue]
  );

  // 中止
  const stopAll = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    queueRef.current = [];
    processedLenRef.current = 0;
    sentenceCountRef.current = 0;
    isPlayingRef.current = false;
    setIsSpeaking(false);
    setPlaybackState("idle");
  }, []);

  return { feedText, flush, stopAll, isSpeaking, playbackState };
}
