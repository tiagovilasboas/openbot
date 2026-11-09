import { useState, type KeyboardEvent } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import {
  applyBotMention,
  applySkillCommand,
  filterBots,
  filterSkills,
  parseMentionQuery,
  parseSlashQuery,
} from "./palette-query.ts";

export type PaletteKind = "skills" | "bots";

interface ComposerPaletteOptions {
  draft: string;
  skills: SkillDefinition[];
  bots: BotProfile[];
  onDraftChange: (value: string) => void;
}

/**
 * Which composer palette is open, what it lists and which row is active.
 * Typing `/` or `@` opens a palette; the toolbar buttons open one for the
 * current draft only; Esc dismisses it until the draft changes again.
 */
export function useComposerPalette({
  draft,
  skills,
  bots,
  onDraftChange,
}: ComposerPaletteOptions) {
  const [manual, setManual] = useState<{
    kind: PaletteKind;
    draft: string;
  } | null>(null);
  const [dismissedDraft, setDismissedDraft] = useState<string | null>(null);

  const slashQuery = parseSlashQuery(draft);
  const mentionQuery = parseMentionQuery(draft);
  const typedKind: PaletteKind | null =
    slashQuery !== null && skills.length > 0
      ? "skills"
      : mentionQuery !== null && bots.length > 0
        ? "bots"
        : null;
  const manualKind = manual?.draft === draft ? manual.kind : null;
  const kind = dismissedDraft === draft ? null : (manualKind ?? typedKind);

  const skillItems =
    kind === "skills" ? filterSkills(skills, slashQuery ?? "") : [];
  const botItems = kind === "bots" ? filterBots(bots, mentionQuery ?? "") : [];
  const count = kind === "skills" ? skillItems.length : botItems.length;

  // The active row resets whenever the list it points into changes.
  const listKey = `${kind}:${kind === "skills" ? slashQuery : mentionQuery}`;
  const [nav, setNav] = useState({ key: listKey, index: 0 });
  const activeIndex = nav.key === listKey && nav.index < count ? nav.index : 0;

  function setActiveIndex(index: number) {
    setNav({ key: listKey, index });
  }

  function close() {
    setManual(null);
    setDismissedDraft(draft);
  }

  function toggle(next: PaletteKind) {
    if (kind === next) {
      close();
      return;
    }
    setDismissedDraft(null);
    if (next === "skills" && !draft.trim() && skills.length > 0) {
      setManual(null);
      onDraftChange("/");
      return;
    }
    setManual({ kind: next, draft });
  }

  function selectSkill(skill: SkillDefinition) {
    setManual(null);
    onDraftChange(applySkillCommand(draft, skill));
  }

  function selectBot(bot: BotProfile) {
    setManual(null);
    onDraftChange(applyBotMention(draft, bot));
  }

  function selectActive() {
    if (kind === "skills") {
      const skill = skillItems[activeIndex];
      if (skill) selectSkill(skill);
    } else {
      const bot = botItems[activeIndex];
      if (bot) selectBot(bot);
    }
  }

  /** Handles ↑ ↓ Enter Esc for the open palette; true when consumed. */
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!kind || event.nativeEvent.isComposing) return false;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return true;
    }
    if (count === 0) return false;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((activeIndex + step + count) % count);
      return true;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      selectActive();
      return true;
    }
    return false;
  }

  return {
    kind,
    skillItems,
    botItems,
    hasSkills: skills.length > 0,
    activeIndex: count > 0 ? activeIndex : -1,
    setActiveIndex,
    toggle,
    selectSkill,
    selectBot,
    handleKeyDown,
  };
}
