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

/** The live avatar, name and role of the bot being edited. */
export function BotEditPreview({
  name,
  title,
  avatarShape,
  avatarColor,
  language,
}: BotEditPreviewProps) {
  const copy = getBotsCopy(language);
  return (
    <div className="flex items-center gap-4">
      <BotAvatar
        shape={avatarShape}
        color={avatarColor}
        size={64}
        className="shrink-0"
      />
      <div className="min-w-0">
        <p
          className={`truncate text-lg font-semibold ${name.trim() ? "text-foreground" : "text-subtle"}`}
        >
          {name.trim() || copy.previewNamePlaceholder}
        </p>
        <p className="truncate text-[13px] text-muted">
          {title.trim() || copy.previewRolePlaceholder}
        </p>
      </div>
    </div>
  );
}
