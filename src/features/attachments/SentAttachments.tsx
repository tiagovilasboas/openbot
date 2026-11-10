import { attachmentCopy, type AttachmentLanguage } from "./attachment-copy.ts";
import {
  formatFileSize,
  type AttachmentSummary,
} from "./attachment-summary.ts";
import { PaperclipIcon } from "./PaperclipIcon.tsx";

/** The names of the files a sent message carried; the text is not kept. */
export function SentAttachments({
  language,
  files,
}: {
  language: AttachmentLanguage;
  files: AttachmentSummary[];
}) {
  return (
    <ul
      aria-label={attachmentCopy[language].sentLabel}
      className="mt-2 flex flex-col gap-1 text-[13px] text-muted"
    >
      {files.map((file, index) => (
        <li key={`${file.name}-${index}`} className="flex items-center gap-1.5">
          <PaperclipIcon className="size-4 shrink-0" />
          <span className="min-w-0 truncate">{file.name}</span>
          <span className="shrink-0 text-xs">
            {formatFileSize(file.size, language)}
          </span>
        </li>
      ))}
    </ul>
  );
}
