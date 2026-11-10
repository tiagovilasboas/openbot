"use client";

import { useCallback, useRef, useState } from "react";
import { addAttachmentFiles } from "./add-attachments.ts";
import type { AttachmentNotice } from "./attachment-copy.ts";
import type { AttachableFile, Attachment } from "./read-attachment.ts";

/** The files of the message being composed; they leave with it when sent. */
export interface ComposerAttachments {
  items: Attachment[];
  notice: AttachmentNotice | null;
  addFiles: (files: AttachableFile[]) => Promise<void>;
  remove: (index: number) => void;
  /** Takes the files for sending and empties the composer. */
  take: () => Attachment[];
  clear: () => void;
  reportTooBig: () => void;
}

export function useComposerAttachments(): ComposerAttachments {
  const [items, setItems] = useState<Attachment[]>([]);
  const [notice, setNotice] = useState<AttachmentNotice | null>(null);
  // Files are read one after another, so a second pick sees the first.
  const itemsRef = useRef<Attachment[]>([]);

  const replace = useCallback((next: Attachment[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const addFiles = useCallback(
    async (files: AttachableFile[]) => {
      if (files.length === 0) return;
      const result = await addAttachmentFiles(itemsRef.current, files);
      replace(result.attachments);
      setNotice(
        result.rejected.length > 0
          ? { kind: "rejected", files: result.rejected }
          : null,
      );
    },
    [replace],
  );

  const remove = useCallback(
    (index: number) => {
      replace(itemsRef.current.filter((_, i) => i !== index));
      setNotice(null);
    },
    [replace],
  );

  const clear = useCallback(() => {
    replace([]);
    setNotice(null);
  }, [replace]);

  const take = useCallback(() => {
    const taken = itemsRef.current;
    clear();
    return taken;
  }, [clear]);

  const reportTooBig = useCallback(() => setNotice({ kind: "too_big" }), []);

  return { items, notice, addFiles, remove, take, clear, reportTooBig };
}
