"use client";

import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils";
import type { UploadFile } from "@/stores/uploadStore";

interface FileItemProps {
  file: UploadFile;
  onRemove: (id: string) => void;
}

const statusLabel: Record<string, string> = {
  pending: "等待上传",
  uploading: "上传中",
  parsing: "解析中",
  done: "完成",
  error: "失败",
};

const statusColor: Record<string, string> = {
  pending: "bg-text-tert",
  uploading: "bg-primary",
  parsing: "bg-accent",
  done: "bg-success",
  error: "bg-error",
};

export function FileItem({ file, onRemove }: FileItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-bg-sec rounded-[var(--radius-btn)]">
      {/* File icon */}
      <div className="w-8 h-8 rounded bg-bg-card border border-border flex items-center justify-center flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tert)" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14,2 14,8 20,8" />
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-main truncate">{file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-tert">{formatFileSize(file.size)}</span>
          <span className={cn("inline-block w-1.5 h-1.5 rounded-full", statusColor[file.status])} />
          <span className="text-xs text-text-sec">{statusLabel[file.status]}</span>
          {file.error && <span className="text-xs text-error">{file.error}</span>}
        </div>
        {/* Progress bar */}
        {(file.status === "uploading" || file.status === "parsing") && (
          <div className="mt-1.5 h-1 bg-border rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                file.status === "parsing" ? "bg-accent animate-pulse" : "bg-primary"
              )}
              style={{ width: `${file.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(file.id)}
        className="p-1 text-text-tert hover:text-text-main transition-colors flex-shrink-0"
        aria-label="移除"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
