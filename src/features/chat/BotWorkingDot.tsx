import { botAccent } from "@/features/bots/bot-accent.ts";
import type { AvatarColor } from "@/features/bots/bot-types.ts";

interface BotWorkingDotProps {
  color: AvatarColor;
}

/**
 * A small dot on the avatar's corner while the bot answers. It pings unless
 * the user prefers reduced motion (see globals.css). Decorative: the row's
 * text label tells assistive tech the same thing.
 */
export function BotWorkingDot({ color }: BotWorkingDotProps) {
  return (
    <span
      aria-hidden="true"
      data-testid="bot-working-dot"
      style={{ color: botAccent(color) }}
      className="bot-working-dot absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-current ring-2 ring-sidebar"
    />
  );
}
