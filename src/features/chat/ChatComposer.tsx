"use client";

import { Button, TextArea } from "@heroui/react";
import { chatCopy } from "./chat-copy";
import type { ChatLanguage } from "./respond-to-message";

interface ChatComposerProps {
  language: ChatLanguage;
  draft: string;
  busy: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}

export function ChatComposer({
  language,
  draft,
  busy,
  onDraftChange,
  onSend,
}: ChatComposerProps) {
  const content = chatCopy[language];

  return (
    <form
      className="sticky bottom-0 w-full pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
    >
      <div className="mx-auto flex w-full max-w-2xl items-end gap-2 rounded-2xl border border-separator bg-surface p-2">
        <TextArea
          aria-label={content.composerLabel}
          className="min-h-10 flex-1 resize-none border-0 bg-transparent shadow-none"
          placeholder={content.placeholder}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          rows={1}
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isIconOnly
          isDisabled={!draft.trim() || busy}
          aria-label={content.sendMessageLabel}
        >
          ↑
        </Button>
      </div>
      <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-muted">
        {content.composerHint}
      </p>
    </form>
  );
}
