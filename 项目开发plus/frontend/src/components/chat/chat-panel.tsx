"use client";

import { useRef, useEffect, useState, KeyboardEvent, ChangeEvent } from "react";
import { useChatStore } from "@/stores/chat-store";
import { uploadFiles, type UploadedFile } from "@/lib/sse-client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatPanelProps {
  onSend: (message: string, filePaths?: string[]) => void;
}

const PHASE_SHORTCUTS = [
  { label: "Phase 0: 需求", prompt: "开始 Phase 0" },
  { label: "Phase 1: 页面设计", prompt: "开始 Phase 1" },
  { label: "Phase 2: 开发", prompt: "开始 Phase 2" },
];

export function ChatPanel({ onSend }: ChatPanelProps) {
  const { messages, isLoading, progressText } = useChatStore();
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, progressText]);

  const handleSubmit = () => {
    const text = input.trim();
    if ((!text && attachedFiles.length === 0) || isLoading) return;

    let fullMessage = text;
    if (attachedFiles.length > 0) {
      const fileRefs = attachedFiles
        .map((f) => `[附件: ${f.filename}] 路径: ${f.path}`)
        .join("\n");
      fullMessage = fullMessage
        ? `${fullMessage}\n\n附件文件：\n${fileRefs}\n\n请读取以上附件文件内容后再回答。`
        : `请读取以下文件内容：\n${fileRefs}`;
    }

    setInput("");
    setAttachedFiles([]);
    onSend(fullMessage, attachedFiles.map((f) => f.path));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await uploadFiles(files);
      setAttachedFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error("上传失败:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await uploadFiles(files);
      setAttachedFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error("上传失败:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <h2 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
              AI Express 工作台
            </h2>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              输入项目需求、拖入参考文件，或选择一个 Phase 开始
            </p>
            <div className="flex gap-2">
              {PHASE_SHORTCUTS.map((s) => (
                <button
                  key={s.prompt}
                  onClick={() => onSend(s.prompt)}
                  className="px-4 py-2 text-xs rounded-lg border transition-colors hover:border-blue-500"
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-secondary)",
                    background: "var(--color-surface)",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed"
              style={{
                background:
                  msg.role === "user"
                    ? "var(--color-primary)"
                    : "var(--color-surface-2)",
                color: msg.role === "user" ? "#fff" : "var(--color-text)",
              }}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : msg.role === "system" && msg.content.startsWith("错误") ? (
                <span style={{ color: "var(--color-error)" }}>{msg.content}</span>
              ) : (
                <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {/* 实时进度面板 — 流式输出 */}
        {isLoading && (
          <div className="flex justify-start">
            <div
              className="max-w-[80%] rounded-xl px-4 py-3 text-sm"
              style={{
                background: "var(--color-surface-2)",
                borderLeft: `3px solid ${progressText ? "var(--color-primary)" : "var(--color-text-secondary)"}`,
              }}
            >
              {progressText ? (
                progressText.startsWith("🤖") || progressText.startsWith("🔧") || progressText.startsWith("💭") ? (
                  <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap"
                    style={{ color: "var(--color-text-secondary)" }}>
                    {progressText}
                  </pre>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {progressText}
                    </ReactMarkdown>
                    <span className="animate-pulse">▊</span>
                  </div>
                )
              ) : (
                <span className="animate-pulse" style={{ color: "var(--color-text-secondary)" }}>
                  思考中...
                </span>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Attached Files */}
      {attachedFiles.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {attachedFiles.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
              style={{ background: "var(--color-surface-2)", color: "var(--color-text)" }}
            >
              <span>{f.filename}</span>
              <span style={{ color: "var(--color-text-secondary)" }}>
                ({(f.size / 1024).toFixed(1)}KB)
              </span>
              <button onClick={() => removeFile(i)} className="ml-1 hover:text-red-400">x</button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t" style={{ borderColor: "var(--color-border)" }}>
        <div
          className="flex items-end gap-2 rounded-xl border p-2"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || uploading}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10 disabled:opacity-40"
            title="上传文件"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ color: "var(--color-text-secondary)" }}>
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={uploading ? "上传中..." : "输入需求或指令，可拖入文件..."}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm py-1 px-2"
            style={{ color: "var(--color-text)", maxHeight: 120 }}
            disabled={isLoading || uploading}
          />
          <button
            onClick={handleSubmit}
            disabled={(!input.trim() && attachedFiles.length === 0) || isLoading || uploading}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
            style={{ background: "var(--color-primary)", color: "#fff" }}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
