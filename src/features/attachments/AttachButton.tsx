"use client";

import { useRef } from "react";
import { attachmentCopy, type AttachmentLanguage } from "./attachment-copy.ts";
import { PaperclipIcon } from "./PaperclipIcon.tsx";
import type { AttachableFile } from "./read-attachment.ts";
import { TEXT_FILE_ACCEPT } from "./text-file-kind.ts";

interface AttachButtonProps {
  language: AttachmentLanguage;
  onFiles: (files: AttachableFile[]) => void;
}

/** The paperclip: opens the file picker; the files are read on the device. */
export function AttachButton({ language, onFiles }: AttachButtonProps) {
  const copy = attachmentCopy[language];
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        aria-label={copy.attachLabel}
        title={copy.attachHint}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-[background-color,color,transform] duration-(--duration-micro) ease-out-expo hover:bg-surface-secondary hover:text-foreground active:scale-[0.97]"
      >
        <PaperclipIcon />
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={TEXT_FILE_ACCEPT}
        tabIndex={-1}
        aria-hidden="true"
        className="hidden"
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? []);
          // Clearing lets the same file be picked again after a remove.
          event.target.value = "";
          onFiles(picked);
        }}
      />
    </>
  );
}
