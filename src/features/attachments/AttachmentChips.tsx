"use client";

import {
  attachmentCopy,
  describeNotice,
  type AttachmentLanguage,
  type AttachmentNotice,
} from "./attachment-copy.ts";
import { formatFileSize } from "./attachment-summary.ts";
import { PaperclipIcon } from "./PaperclipIcon.tsx";
import type { Attachment } from "./read-attachment.ts";

interface AttachmentChipsProps {
  language: AttachmentLanguage;
  items: Attachment[];
  notice: AttachmentNotice | null;
  onRemove: (index: number) => void;
}

/** The files waiting on the message, and why a file or a send was refused. */
export function AttachmentChips({
  language,
  items,
  notice,
  onRemove,
}: AttachmentChipsProps) {
  const copy = attachmentCopy[language];
  if (items.length === 0 && !notice) return null;

  return (
    <div className="flex flex-col gap-1.5 px-3 pt-3">
      {items.length > 0 && (
        <ul aria-label={copy.chipsLabel} className="flex flex-wrap gap-2">
          {items.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-border bg-surface-secondary py-1 pl-3 pr-1 text-[13px] text-foreground"
            >
              <PaperclipIcon className="size-4 shrink-0 text-muted" />
              <span className="min-w-0 truncate font-medium">{file.name}</span>
              <span className="shrink-0 text-xs text-muted">
                {formatFileSize(file.size, language)}
                {file.truncated ? ` · ${copy.truncatedNote}` : ""}
              </span>
              <button
                type="button"
                aria-label={copy.removeLabel(file.name)}
                title={copy.removeLabel(file.name)}
                onClick={() => onRemove(index)}
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-(--duration-micro) ease-out-expo hover:bg-surface hover:text-foreground"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {notice && (
        <div role="status" className="text-[13px] text-danger">
          {describeNotice(notice, language).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}
