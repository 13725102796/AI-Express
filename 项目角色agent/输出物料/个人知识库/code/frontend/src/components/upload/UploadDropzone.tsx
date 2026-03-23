"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useUploadStore } from "@/stores/uploadStore";
import { validateFile } from "@/services/upload";
import { useToast } from "@/components/ui/Toast";

export function UploadDropzone() {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFiles = useUploadStore((s) => s.addFiles);
  const { toast } = useToast();

  const handleFiles = useCallback(
    (fileList: FileList) => {
      const files = Array.from(fileList);
      const validFiles: File[] = [];
      for (const file of files) {
        const error = validateFile(file);
        if (error) {
          toast("error", `${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      }
      if (validFiles.length > 0) {
        addFiles(validFiles);
      }
    },
    [addFiles, toast]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-[var(--radius-card)] p-8 text-center cursor-pointer transition-all",
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-border hover:border-text-tert hover:bg-bg-sec"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.md,.txt,.html"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <svg className="mx-auto mb-3 text-text-tert" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17,8 12,3 7,8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <p className="text-sm font-medium text-text-main mb-1">
        拖拽文件到此处，或点击选择
      </p>
      <p className="text-xs text-text-tert">
        支持 PDF、Word、Markdown、TXT、HTML，单文件最大 50MB
      </p>
    </div>
  );
}
