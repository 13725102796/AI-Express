"use client";

import { useUploadStore } from "@/stores/uploadStore";
import { cn } from "@/lib/utils";

export function UploadStatusBar() {
  const { files, setModalOpen } = useUploadStore();

  const activeFiles = files.filter(
    (f) => f.status === "uploading" || f.status === "parsing"
  );

  if (activeFiles.length === 0) return null;

  const totalProgress =
    activeFiles.reduce((sum, f) => sum + f.progress, 0) / activeFiles.length;

  return (
    <button
      onClick={() => setModalOpen(true)}
      className={cn(
        "fixed bottom-4 right-4 z-40 flex items-center gap-3 px-4 py-2.5",
        "bg-bg-card border border-border rounded-[var(--radius-card)] shadow-[var(--shadow-card-hover)]",
        "hover:shadow-[var(--shadow-modal)] transition-shadow cursor-pointer"
      )}
    >
      {/* Spinner */}
      <svg className="animate-spin w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>

      <div className="text-left">
        <p className="text-xs font-medium text-text-main">
          {activeFiles.length} 个文件处理中
        </p>
        <div className="w-24 h-1 bg-border rounded-full mt-1 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>
    </button>
  );
}
