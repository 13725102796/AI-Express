import { create } from "zustand";

export type UploadStatus = "pending" | "uploading" | "parsing" | "done" | "error";

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: UploadStatus;
  error?: string;
}

interface UploadState {
  modalOpen: boolean;
  files: UploadFile[];
  setModalOpen: (open: boolean) => void;
  addFiles: (files: File[]) => void;
  updateFile: (id: string, updates: Partial<UploadFile>) => void;
  removeFile: (id: string) => void;
  clearCompleted: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  modalOpen: false,
  files: [],
  setModalOpen: (modalOpen) => set({ modalOpen }),
  addFiles: (newFiles) =>
    set((state) => {
      // 按文件名+大小去重，避免同一文件重复添加
      const existingKeys = new Set(state.files.map((f) => `${f.name}_${f.size}`));
      const deduped = newFiles.filter((file) => !existingKeys.has(`${file.name}_${file.size}`));
      return {
        files: [
          ...state.files,
          ...deduped.map((file) => ({
            id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            file,
            name: file.name,
            size: file.size,
            progress: 0,
            status: "pending" as UploadStatus,
          })),
        ],
      };
    }),
  updateFile: (id, updates) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),
  removeFile: (id) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
    })),
  clearCompleted: () =>
    set((state) => ({
      files: state.files.filter((f) => f.status !== "done"),
    })),
}));
