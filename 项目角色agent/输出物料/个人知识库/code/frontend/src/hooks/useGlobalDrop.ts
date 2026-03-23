"use client";

import { useEffect, useState, useCallback } from "react";
import { useUploadStore } from "@/stores/uploadStore";

export function useGlobalDrop() {
  const [isDragging, setIsDragging] = useState(false);
  const addFiles = useUploadStore((s) => s.addFiles);
  const setModalOpen = useUploadStore((s) => s.setModalOpen);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide if leaving window
    if (e.relatedTarget === null) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        addFiles(files);
        setModalOpen(true);
      }
    },
    [addFiles, setModalOpen]
  );

  useEffect(() => {
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, [handleDragOver, handleDragLeave, handleDrop]);

  return isDragging;
}
