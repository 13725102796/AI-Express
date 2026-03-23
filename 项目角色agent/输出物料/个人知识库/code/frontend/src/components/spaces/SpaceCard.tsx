"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Space } from "@/services/spaces";

interface SpaceCardProps {
  space: Space;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function SpaceCard({ space, onUpdate, onDelete }: SpaceCardProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(space.name);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleSave = () => {
    if (editName.trim() && editName !== space.name) {
      onUpdate(space.id, editName.trim());
    }
    setEditing(false);
  };

  return (
    <>
      <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-[var(--radius-btn)] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
            style={{ backgroundColor: space.color }}
          >
            {space.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
                className="w-full text-sm font-semibold bg-transparent border-b border-primary outline-none py-0.5"
              />
            ) : (
              <h3
                className="text-sm font-semibold text-text-main cursor-pointer hover:text-primary transition-colors"
                onClick={() => setEditing(true)}
              >
                {space.name}
              </h3>
            )}
            {space.description && (
              <p className="text-xs text-text-sec mt-0.5 line-clamp-1">{space.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tert">{space.docCount} 个文档</span>
          <div className="flex gap-1">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 text-text-tert hover:text-text-sec rounded transition-colors"
              aria-label="编辑"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="p-1.5 text-text-tert hover:text-error rounded transition-colors"
              aria-label="删除"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3,6 5,6 21,6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          onDelete(space.id);
          setDeleteOpen(false);
        }}
        title="删除知识空间"
        description={`确定要删除"${space.name}"吗？空间内的文档不会被删除，但会移至"未分类"。`}
        confirmText="删除"
        danger
      />
    </>
  );
}
