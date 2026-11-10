"use client";

import { useState, type DragEvent } from "react";
import type { AttachableFile } from "./read-attachment.ts";

function carriesFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes("Files");
}

/** Drag-and-drop of files onto an element; text drags are left alone. */
export function useFileDrop(onFiles: (files: AttachableFile[]) => void) {
  const [dragging, setDragging] = useState(false);

  return {
    dragging,
    handlers: {
      onDragOver(event: DragEvent) {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        setDragging(true);
      },
      onDragLeave(event: DragEvent) {
        const next = event.relatedTarget as Node | null;
        if (!next || !event.currentTarget.contains(next)) setDragging(false);
      },
      onDrop(event: DragEvent) {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        setDragging(false);
        onFiles(Array.from(event.dataTransfer.files));
      },
    },
  };
}
