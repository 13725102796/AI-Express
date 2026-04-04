"use client";

import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Toast } from "@/components/ui/Toast";
import { useUIStore } from "@/stores/uiStore";

/** Main layout -- with bottom navigation */
export default function MainLayout({ children }: { children: ReactNode }) {
  const { toast, hideToast } = useUIStore();

  return (
    <div className="min-h-dvh flex flex-col pb-16">
      {children}
      <BottomNav />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          visible={!!toast}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
