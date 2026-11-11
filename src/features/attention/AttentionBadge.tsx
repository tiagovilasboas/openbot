import { attentionPillText } from "./attention-copy.ts";

/**
 * A numeral pill on the avatar's top corner: the number, not a color, says
 * there is something new. Decorative: the row names the count for assistive
 * tech (see attentionLabel).
 */
export function AttentionBadge({ count }: { count: number }) {
  return (
    <span
      aria-hidden="true"
      data-testid="bot-attention-badge"
      className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] leading-none font-semibold text-background tabular-nums ring-2 ring-sidebar"
    >
      {attentionPillText(count)}
    </span>
  );
}
