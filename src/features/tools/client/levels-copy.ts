import type { Language } from "../../language/language.ts";
import type { ToolLevel } from "../tool-policy.ts";

/** Copy for the per-tool level list in Settings, one entry per language. */
export interface LevelsCopy {
  title: string;
  description: string;
  loadFailed: string;
  actionFailed: string;
  levels: Record<ToolLevel, string>;
  /** Why the allow choice is missing for a tool. */
  noAllowHint: string;
}

export const levelsCopy: Record<Language, LevelsCopy> = {
  pt: {
    title: "Nível de cada ferramenta",
    description:
      "Perguntar pede sua permissão a cada uso. Permitir roda sem perguntar. Bloquear nunca roda, em nenhum bot.",
    loadFailed: "Não foi possível carregar os níveis.",
    actionFailed: "Não foi possível salvar o nível. Tente de novo.",
    levels: { ask: "Perguntar", allow: "Permitir", block: "Bloquear" },
    noAllowHint: "Esta ferramenta não pode ser liberada sem perguntar.",
  },
  en: {
    title: "Level of each tool",
    description:
      "Ask requests your permission on every use. Allow runs without asking. Block never runs, in any bot.",
    loadFailed: "Could not load the levels.",
    actionFailed: "Could not save the level. Try again.",
    levels: { ask: "Ask", allow: "Allow", block: "Block" },
    noAllowHint: "This tool cannot be allowed without asking.",
  },
  es: {
    title: "Nivel de cada herramienta",
    description:
      "Preguntar pide tu permiso en cada uso. Permitir se ejecuta sin preguntar. Bloquear nunca se ejecuta, en ningún bot.",
    loadFailed: "No se pudieron cargar los niveles.",
    actionFailed: "No se pudo guardar el nivel. Inténtalo de nuevo.",
    levels: { ask: "Preguntar", allow: "Permitir", block: "Bloquear" },
    noAllowHint: "Esta herramienta no se puede permitir sin preguntar.",
  },
};
