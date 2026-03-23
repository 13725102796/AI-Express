"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SpaceCard } from "@/components/spaces/SpaceCard";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { fetchSpaces, createSpace, updateSpace, deleteSpace, type Space } from "@/services/spaces";

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchSpaces().then((data) => {
      setSpaces(data);
      setLoading(false);
    });
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const space = await createSpace(newName.trim(), newDesc.trim() || undefined);
      setSpaces((prev) => [...prev, space]);
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      toast("success", "知识空间已创建");
    } catch {
      toast("error", "创建失败");
    }
  };

  const handleUpdate = async (id: string, name: string) => {
    await updateSpace(id, { name });
    setSpaces((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
    toast("success", "已更新");
  };

  const handleDelete = async (id: string) => {
    await deleteSpace(id);
    setSpaces((prev) => prev.filter((s) => s.id !== id));
    toast("success", "已删除");
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-main">知识空间管理</h1>
          <p className="text-sm text-text-sec mt-0.5">
            用知识空间组织和隔离你的文档
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建空间
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-bg-sec rounded-[var(--radius-card)] animate-shimmer" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {spaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="新建知识空间" size="sm">
        <div className="space-y-4">
          <Input
            label="空间名称"
            placeholder="例如：Q1 竞品分析项目"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            label="描述（可选）"
            placeholder="简要描述空间用途"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>创建</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
