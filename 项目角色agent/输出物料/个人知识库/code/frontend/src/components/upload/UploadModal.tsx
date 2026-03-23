"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { UploadDropzone } from "./UploadDropzone";
import { FileItem } from "./FileItem";
import { useUploadStore } from "@/stores/uploadStore";
import { uploadFile } from "@/services/upload";
import { useToast } from "@/components/ui/Toast";

export function UploadModal() {
  const { modalOpen, files, setModalOpen, removeFile, updateFile, clearCompleted } =
    useUploadStore();
  const [urlInput, setUrlInput] = useState("");
  const { toast } = useToast();

  const pendingFiles = files.filter((f) => f.status === "pending");
  const hasFiles = files.length > 0;

  const startUpload = async () => {
    for (const file of pendingFiles) {
      updateFile(file.id, { status: "uploading" });
      try {
        await uploadFile(file.file, (progress) => {
          updateFile(file.id, { progress });
        });
        updateFile(file.id, { status: "parsing", progress: 100 });
        // Simulate parsing
        setTimeout(() => {
          updateFile(file.id, { status: "done" });
        }, 2000);
      } catch {
        updateFile(file.id, { status: "error", error: "上传失败" });
      }
    }
    toast("success", `${pendingFiles.length} 个文件已开始处理`);
  };

  const handleClose = () => {
    const uploading = files.some((f) => f.status === "uploading");
    if (uploading) {
      // Keep modal open if uploading
      toast("warning", "文件上传中，关闭后将在后台继续");
    }
    setModalOpen(false);
  };

  return (
    <Modal open={modalOpen} onClose={handleClose} title="上传文件" size="lg">
      <div className="space-y-4">
        <UploadDropzone />

        {/* URL input */}
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="或粘贴网页 URL..."
            className="flex-1 h-9 px-3 text-sm bg-bg-card border border-border rounded-[var(--radius-input)] text-text-main placeholder:text-text-tert focus:outline-none focus:shadow-[var(--shadow-focus)] focus:border-primary"
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={!urlInput.trim()}
            onClick={async () => {
              try {
                const { uploadFromUrl } = await import("@/services/upload");
                await uploadFromUrl(urlInput.trim());
                toast("success", "网页已保存，正在抓取内容...");
                setUrlInput("");
              } catch (err: any) {
                toast("error", err.message || "URL 保存失败");
              }
            }}
          >
            抓取
          </Button>
        </div>

        {/* File list */}
        {hasFiles && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file) => (
              <FileItem key={file.id} file={file} onRemove={removeFile} />
            ))}
          </div>
        )}

        {/* Actions */}
        {hasFiles && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              onClick={clearCompleted}
              className="text-xs text-text-tert hover:text-text-sec transition-colors"
            >
              清除已完成
            </button>
            <Button
              onClick={startUpload}
              disabled={pendingFiles.length === 0}
            >
              上传 {pendingFiles.length > 0 && `(${pendingFiles.length})`}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
