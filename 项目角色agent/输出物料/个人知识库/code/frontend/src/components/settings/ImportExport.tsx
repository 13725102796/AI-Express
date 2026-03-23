"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { exportData } from "@/services/settings";

export function ImportExport() {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `knowbase-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("success", "数据已导出");
    } catch {
      toast("error", "导出失败");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
      <h3 className="text-sm font-semibold text-text-main mb-4">数据导入/导出</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-main">导出数据</p>
            <p className="text-xs text-text-tert">导出所有文档元数据和标签为 JSON 文件</p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting}>
            导出
          </Button>
        </div>
        <div className="border-t border-border" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-main">导入数据</p>
            <p className="text-xs text-text-tert">从 JSON 文件恢复文档和标签</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast("info", "导入功能将在后续版本中支持")}
          >
            导入
          </Button>
        </div>
      </div>
    </div>
  );
}
