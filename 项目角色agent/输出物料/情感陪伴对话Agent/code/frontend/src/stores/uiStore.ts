import { create } from "zustand";

interface ToastData {
  message: string;
  type: "success" | "warning" | "error";
}

interface UIState {
  toast: ToastData | null;
  showToast: (message: string, type?: ToastData["type"]) => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  toast: null,

  showToast: (message, type = "success") =>
    set({ toast: { message, type } }),

  hideToast: () => set({ toast: null }),
}));
