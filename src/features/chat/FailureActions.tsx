import { chatCopy } from "./chat-copy.ts";
import { replyFailureAction, type ReplyFailure } from "./reply-failure.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

interface FailureActionsProps {
  failure: ReplyFailure;
  language: ChatLanguage;
  onOpenSettings?: () => void;
  onRetry?: () => void;
}

/** The one thing to do about a failed reply: fix Settings or try again. */
export function FailureActions({
  failure,
  language,
  onOpenSettings,
  onRetry,
}: FailureActionsProps) {
  const content = chatCopy[language];
  const action = replyFailureAction(failure);
  const handler = action === "settings" ? onOpenSettings : onRetry;
  if (action === "none" || !handler) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handler}
        className="min-h-11 rounded-full border border-border bg-surface px-4 text-[13px] font-medium text-foreground transition-colors duration-(--duration-micro) ease-out-expo hover:bg-surface-secondary"
      >
        {action === "settings"
          ? content.openSettingsAction
          : content.retryAction}
      </button>
    </div>
  );
}
