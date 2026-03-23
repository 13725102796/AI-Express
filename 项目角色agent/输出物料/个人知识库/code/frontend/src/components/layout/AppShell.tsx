"use client";

import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { SideNav } from "./SideNav";
import { UploadStatusBar } from "@/components/upload/UploadStatusBar";
import { UploadModal } from "@/components/upload/UploadModal";
import { useGlobalDrop } from "@/hooks/useGlobalDrop";

export function AppShell({ children }: { children: ReactNode }) {
  useGlobalDrop();

  return (
    <div className="min-h-screen bg-bg-main">
      <TopBar />
      <SideNav />
      <main className="pt-16 md:pl-56 min-h-screen">
        {children}
      </main>
      <UploadStatusBar />
      <UploadModal />
    </div>
  );
}
