import type { BotProfile } from "../bots/bot-types.ts";

export function findMentionedBot(
  text: string,
  bots: BotProfile[],
): BotProfile | null {
  const match = text.match(/@([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const target = match[1]?.toLowerCase().replace(/[\s-_]+/g, "");
  return (
    bots.find((b) => {
      const cleanName = b.name.toLowerCase().replace(/[\s-_]+/g, "");
      const cleanId = b.id.toLowerCase().replace(/[\s-_]+/g, "");
      return cleanName === target || cleanId === target;
    }) ?? null
  );
}
