"use client";

import { useState } from "react";
import { chatCopy } from "@/features/chat/chat-copy.ts";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { fillCopy } from "@/features/model/settings-copy.ts";
import { CheckIcon, PlusIcon, PuzzleIcon } from "@/shared/ui/FieldIcons.tsx";
import {
  FIELD_CLASS,
  FormField,
  TEXTAREA_CLASS,
} from "@/shared/ui/FormField.tsx";
import { SheetFooter } from "@/shared/ui/ResponsiveSheet.tsx";
import { SkillListItem } from "./SkillListItem.tsx";
import { getSkillsCopy } from "./skills-copy.ts";
import { parseSkillFromMarkdown } from "./skill-storage.ts";
import type { SkillDefinition } from "./skill-types.ts";

export interface SettingsSkillsSectionProps {
  language: ChatLanguage;
  skills: SkillDefinition[];
  /** False while another settings tab is shown: the footer is not rendered. */
  isActive?: boolean;
  onAddSkill: (input: {
    name: string;
    command?: string;
    description?: string;
    instructions: string;
  }) => void;
  onRemoveSkill: (id: string) => void;
}

const SECONDARY_BUTTON =
  "min-h-11 rounded-full border border-border bg-surface px-5 text-[15px] font-medium text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97] md:text-sm";

export function SettingsSkillsSection({
  language,
  skills,
  isActive = true,
  onAddSkill,
  onRemoveSkill,
}: SettingsSkillsSectionProps) {
  const t = chatCopy[language];
  const c = getSkillsCopy(language);
  const [view, setView] = useState<"list" | "create">("list");
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [markdownInput, setMarkdownInput] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canSave = Boolean(name.trim() && instructions.trim());

  function handleImportMarkdown(text: string) {
    setMarkdownInput(text);
    const parsed = parseSkillFromMarkdown(text);
    if (parsed) {
      setName(parsed.name);
      setDescription(parsed.description);
      setInstructions(parsed.instructions);
    }
  }

  function handleSave() {
    if (!canSave) return;
    const created = name.trim();
    onAddSkill({
      name: created,
      command: command.trim() || undefined,
      description: description.trim(),
      instructions: instructions.trim(),
    });
    setName("");
    setCommand("");
    setDescription("");
    setInstructions("");
    setMarkdownInput("");
    setNotice(fillCopy(c.added, { name: created }));
    setView("list");
  }

  function handleRemove(id: string) {
    onRemoveSkill(id);
    setConfirmingId(null);
    setNotice(c.removed);
  }

  if (view === "create") {
    return (
      <div className="flex flex-col gap-6">
        <button
          type="button"
          onClick={() => setView("list")}
          className="-ms-2 flex min-h-11 w-fit items-center gap-1.5 rounded-full px-2 text-[15px] font-medium text-muted transition-colors hover:text-foreground active:scale-[0.97] md:text-sm"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M15 5l-7 7 7 7" />
          </svg>
          {c.back}
        </button>

        <h3 className="text-[15px] font-semibold text-foreground">
          {c.createTitle}
        </h3>

        <FormField label={t.skillImportLabel} helper={c.importHint}>
          {(control) => (
            <textarea
              {...control}
              rows={3}
              placeholder={c.markdownPlaceholder}
              value={markdownInput}
              onChange={(e) => handleImportMarkdown(e.target.value)}
              className={`${TEXTAREA_CLASS} font-mono`}
            />
          )}
        </FormField>

        <div className="flex flex-col gap-4">
          <FormField label={t.skillNameLabel}>
            {(control) => (
              <input
                {...control}
                placeholder={c.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={FIELD_CLASS}
              />
            )}
          </FormField>
          <FormField label={t.skillCommandLabel} helper={c.commandHint}>
            {(control) => (
              <input
                {...control}
                placeholder={c.commandPlaceholder}
                value={command}
                autoCapitalize="none"
                spellCheck={false}
                onChange={(e) => setCommand(e.target.value)}
                className={`${FIELD_CLASS} font-mono`}
              />
            )}
          </FormField>
          <FormField label={t.skillDescLabel}>
            {(control) => (
              <input
                {...control}
                placeholder={c.descPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={FIELD_CLASS}
              />
            )}
          </FormField>
          <FormField
            label={t.skillInstructionsLabel}
            helper={canSave ? undefined : c.requiredHint}
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
        </div>

        {isActive && (
          <SheetFooter>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setView("list")}
                className={SECONDARY_BUTTON}
              >
                {c.cancel}
              </button>
              <button
                type="button"
                disabled={!canSave}
                onClick={handleSave}
                className="min-h-11 rounded-full bg-foreground px-6 text-[15px] font-semibold text-background transition-opacity hover:opacity-90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 md:text-sm"
              >
                {t.skillCreateButton}
              </button>
            </div>
          </SheetFooter>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-foreground">
            {t.skillsTitle}
          </h3>
          <p className="text-[13px] text-subtle">{t.skillsSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setView("create");
          }}
          className={`${SECONDARY_BUTTON} flex shrink-0 items-center gap-1.5 px-4`}
        >
          <PlusIcon className="size-4" />
          {c.addSkill}
        </button>
      </div>

      <div role="status" aria-live="polite">
        {notice && (
          <p className="flex items-center gap-2 rounded-xl bg-success-soft px-3.5 py-2.5 text-[13px] text-success">
            <CheckIcon className="size-4 shrink-0" />
            {notice}
          </p>
        )}
      </div>

      {skills.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface px-6 py-10 text-center">
          <PuzzleIcon className="size-6 text-subtle" />
          <p className="max-w-xs text-balance text-[15px] text-muted md:text-sm">
            {c.empty}
          </p>
          <button
            type="button"
            onClick={() => setView("create")}
            className="min-h-11 rounded-full bg-foreground px-5 text-[15px] font-semibold text-background active:scale-[0.97] md:text-sm"
          >
            {c.addSkill}
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {skills.map((skill) => (
            <SkillListItem
              key={skill.id}
              skill={skill}
              copy={c}
              isConfirming={confirmingId === skill.id}
              onAskRemove={() => setConfirmingId(skill.id)}
              onCancelRemove={() => setConfirmingId(null)}
              onConfirmRemove={() => handleRemove(skill.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
