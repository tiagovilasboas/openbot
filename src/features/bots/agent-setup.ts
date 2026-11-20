// What the agent setup creates. Pure: no storage, no React.
import type { Language } from "../language/language.ts";
import { createBotProfile } from "./bot-storage.ts";
import type { BotProfile } from "./bot-types.ts";
import { CREW_PRESETS } from "./crew-presets.ts";
import { DEFAULT_BOT } from "./bot-types.ts";

/** Roles the setup offers as optional extra agents; none comes checked. */
export const SETUP_ROLES: readonly BotProfile[] = CREW_PRESETS.filter(
  (bot) => bot.id !== DEFAULT_BOT.id,
);

const DEFAULT_INSTRUCTIONS: Record<Language, string> = {
  pt: "Você é o agente principal. Entende o pedido, responde direto e, quando houver outros agentes, coordena e delega para o especialista certo.",
  en: "You are the main agent. You understand the request, answer directly and, when there are other agents, coordinate and delegate to the right specialist.",
  es: "Eres el agente principal. Entiendes el pedido, respondes directo y, cuando hay otros agentes, coordinas y delegas al especialista correcto.",
};

export type SetupInput = {
  name: string;
  title: string;
  instructions: string;
  /** Ids from SETUP_ROLES the person checked. */
  roleIds: readonly string[];
};

export type SetupResult = { bots: BotProfile[]; mainBotId: string };

/**
 * The crew the person asked for: their main agent first, then only the
 * roles they checked. Null while the main agent has no name.
 */
export function buildSetupCrew(
  input: SetupInput,
  language: Language,
  now = new Date(),
): SetupResult | null {
  const name = input.name.trim();
  if (!name) return null;
  const main = createBotProfile({
    name,
    title: input.title.trim() || undefined,
    description: input.instructions.trim() || DEFAULT_INSTRUCTIONS[language],
    avatarShape: "ghost",
    avatarColor: "teal",
  });
  const stamp = now.toISOString();
  const chosen = new Set(input.roleIds);
  const roles = SETUP_ROLES.filter((role) => chosen.has(role.id)).map(
    (role) => ({ ...role, createdAt: stamp, updatedAt: stamp }),
  );
  return { bots: [main, ...roles], mainBotId: main.id };
}
