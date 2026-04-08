"use client";

import { useState, useRef, useCallback } from "react";

export type VoiceState = "idle" | "recording" | "transcribing";

/**
 * @param onResult 识别完成回调。autoSend=true 时文字自动发送给 LLM，不停留在输入框。
 */
export function useVoiceInput(onResult: (text: string) => void) {
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 优先 webm/opus（体积小），fallback wav
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // 释放麦克风
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) {
          setState("idle");
          return;
        }

        setState("transcribing");
        try {
          const form = new FormData();
          form.append("file", blob, "recording.webm");

          const resp = await fetch("/api/stt", { method: "POST", body: form });
          if (!resp.ok) throw new Error(`STT 服务异常 (${resp.status})`);

          const data = await resp.json();
          if (data.text?.trim()) {
            onResult(data.text.trim());
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "识别失败");
        } finally {
          setState("idle");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      setError("无法访问麦克风");
      setState("idle");
    }
  }, [onResult]);

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
  }, []);

  const toggle = useCallback(() => {
    if (state === "idle") start();
    else if (state === "recording") stop();
  }, [state, start, stop]);

  return { state, error, toggle };
}
