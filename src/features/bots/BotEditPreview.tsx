import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { BotAvatar } from "./BotAvatar.tsx";
import type { AvatarColor, AvatarShape } from "./bot-types.ts";
import { getBotsCopy } from "./bots-copy.ts";

interface BotEditPreviewProps {
  name: string;
  title: string;
  avatarShape: AvatarShape;
  avatarColor: AvatarColor;
  language: ChatLanguage;
}

/** The live avatar, name and role of the bot being edited: a compact row on phones. */
export function BotEditPreview({
  name,
  title,
  avatarShape,
  avatarColor,
  language,
}: BotEditPreviewProps) {
  const copy = getBotsCopy(language);
  return (
    <div className="flex items-center gap-3 md:gap-4">
      <span className="size-10 shrink-0 md:size-16">
        <BotAvatar shape={avatarShape} color={avatarColor} size="100%" />
      </span>
      <div className="min-w-0">
        <p
          className={`truncate text-base font-semibold md:text-lg ${name.trim() ? "text-foreground" : "text-subtle"}`}
        >
          {name.trim() || copy.previewNamePlaceholder}
        </p>
        <p className="truncate text-xs text-muted md:text-[13px]">
          {title.trim() || copy.previewRolePlaceholder}
        </p>
      </div>
    </div>
  );
}
