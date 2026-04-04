import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Express Workbench",
  description: "多 Agent 协同开发可视化工作台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
