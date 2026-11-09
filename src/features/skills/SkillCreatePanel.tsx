"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { fillCopy } from "@/features/model/settings-copy.ts";
import {
  FIELD_CLASS,
  FormField,
  TEXTAREA_CLASS,
} from "@/shared/ui/FormField.tsx";
import {
  createCustomSkill,
  parseSkillFromMarkdown,
} from "./skill-definition.ts";
import type { SkillDefinition } from "./skill-types.ts";
import type { SkillsCopy } from "./skills-copy.ts";

export interface SkillCreatePanelProps {
  copy: SkillsCopy;
  /** The bot's skills so far: a new skill may not reuse one of their commands. */
  existing: readonly SkillDefinition[];
  onAdd: (skill: SkillDefinition) => void;
  onCancel: () => void;
}

/**
 * The new-skill fields, inline in the bot sheet. It sits inside the bot's
 * form, so Enter adds the skill here instead of saving the bot.
 */
export function SkillCreatePanel({
  copy: c,
  existing,
  onAdd,
  onCancel,
}: SkillCreatePanelProps) {
  const [markdown, setMarkdown] = useState("");
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [commandError, setCommandError] = useState<string | null>(null);

  // The "New skill" button that opened this panel is gone; start here.
  const firstFieldRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const canAdd = Boolean(name.trim() && instructions.trim());

  function importMarkdown(text: string) {
    setMarkdown(text);
    const parsed = parseSkillFromMarkdown(text);
    if (!parsed) return;
    setName(parsed.name);
    setDescription(parsed.description);
    setInstructions(parsed.instructions);
    setCommandError(null);
  }

  function add() {
    if (!canAdd) return;
    const skill = createCustomSkill({
      name,
      command: command.trim() || undefined,
      description,
      instructions,
    });
    if (existing.some((s) => s.command === skill.command)) {
      setCommandError(fillCopy(c.duplicateCommand, { command: skill.command }));
      return;
    }
    onAdd(skill);
  }

  function keepEnterHere(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter" || !(e.target instanceof HTMLInputElement)) return;
    e.preventDefault();
    add();
  }

  return (
    <div
      role="group"
      aria-labelledby="skill-create-title"
      onKeyDown={keepEnterHere}
      className="flex flex-col gap-4 rounded-2xl border border-border p-4"
    >
      <h4
        id="skill-create-title"
        className="text-[15px] font-semibold text-foreground md:text-sm"
      >
        {c.createTitle}
      </h4>

      <FormField label={c.importLabel} helper={c.importHint}>
        {(control) => (
          <textarea
            {...control}
            ref={firstFieldRef}
            rows={3}
            placeholder={c.markdownPlaceholder}
            value={markdown}
            onChange={(e) => importMarkdown(e.target.value)}
            className={`${TEXTAREA_CLASS} font-mono`}
          />
        )}
      </FormField>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label={c.nameLabel}>
          {(control) => (
            <input
              {...control}
              placeholder={c.namePlaceholder}
              value={name}
              autoComplete="off"
              onChange={(e) => {
                setName(e.target.value);
                setCommandError(null);
              }}
              className={FIELD_CLASS}
            />
          )}
        </FormField>
        <FormField
          label={c.commandLabel}
          helper={c.commandHint}
          error={commandError}
        >
          {(control) => (
            <input
              {...control}
              placeholder={c.commandPlaceholder}
              value={command}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              onChange={(e) => {
                setCommand(e.target.value);
                setCommandError(null);
              }}
              className={`${FIELD_CLASS} font-mono`}
            />
          )}
        </FormField>
      </div>

      <FormField label={c.descLabel}>
        {(control) => (
          <input
            {...control}
            placeholder={c.descPlaceholder}
            value={description}
            autoComplete="off"
            onChange={(e) => setDescription(e.target.value)}
            className={FIELD_CLASS}
          />
        )}
      </FormField>

      <FormField
        label={c.instructionsLabel}
        helper={canAdd ? undefined : c.requiredHint}
      >
        {(control) => (
          <textarea
            {...control}
            rows={5}
            placeholder={c.instructionsPlaceholder}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className={TEXTAREA_CLASS}
          />
        )}
      </FormField>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-full px-4 text-[15px] font-medium text-muted transition-colors hover:text-foreground active:scale-[0.97] md:text-sm"
        >
          {c.cancel}
        </button>
        <button
          type="button"
          disabled={!canAdd}
          onClick={add}
          className="min-h-11 rounded-full border border-border bg-surface px-5 text-[15px] font-semibold text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 md:text-sm"
        >
          {c.addAction}
        </button>
      </div>
    </div>
  );
}
