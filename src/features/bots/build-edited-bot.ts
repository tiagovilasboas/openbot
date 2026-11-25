import type { AvatarColor, AvatarShape, BotProfile } from "./bot-types.ts";
import type { BotGoal } from "./bot-goal.ts";
import type { SkillDefinition } from "../skills/skill-types.ts";

/** The raw values of the bot edit form, before trimming and defaults. */
export type BotEditValues = {
  name: string;
  title: string;
  description: string;
  workspaceContext: string;
  modelId: string;
  backupModelIds: string[];
  avatarShape: AvatarShape;
  avatarColor: AvatarColor;
  skills: SkillDefinition[];
  toolsEnabled: boolean;
  /** The goal built by the goal section; none clears it. */
  goal?: BotGoal;
};

type BuildOptions = {
  defaultDescription: string;
  now?: Date;
  newId?: () => string;
};

const randomBotId = () =>
  `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

/** Turns the edit form into the bot to save, keeping the stored id and dates. */
export function buildEditedBot(
  existing: BotProfile | null,
  values: BotEditValues,
  { defaultDescription, now = new Date(), newId = randomBotId }: BuildOptions,
): BotProfile {
  const stamp = now.toISOString();
  const keepsId = Boolean(existing?.id && existing.id !== "new");
  return {
    id: keepsId && existing ? existing.id : newId(),
    name: values.name.trim(),
    title: values.title.trim() || undefined,
    description: values.description.trim() || defaultDescription,
    workspaceContext: values.workspaceContext.trim() || undefined,
    modelId: values.modelId.trim() || undefined,
    ...(values.backupModelIds.length > 0
      ? { backupModelIds: values.backupModelIds }
      : {}),
    avatarShape: values.avatarShape,
    avatarColor: values.avatarColor,
    skills: values.skills,
    ...(values.toolsEnabled ? { toolsEnabled: true } : {}),
    ...(values.goal ? { goal: values.goal } : {}),
    ...(existing?.hidden ? { hidden: true } : {}),
    ...(existing?.folder ? { folder: existing.folder } : {}),
    createdAt: existing?.createdAt || stamp,
    updatedAt: stamp,
  };
}
