"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { fillCopy } from "@/features/model/settings-copy.ts";
import { CheckIcon, PlusIcon } from "@/shared/ui/FieldIcons.tsx";
import { SkillCreatePanel } from "./SkillCreatePanel.tsx";
import { SkillListItem } from "./SkillListItem.tsx";
import type { SkillDefinition } from "./skill-types.ts";
import { getSkillsCopy } from "./skills-copy.ts";

export interface BotSkillsEditorProps {
  language: ChatLanguage;
  /** The bot's skills in the sheet's draft; saved with the bot. */
  skills: readonly SkillDefinition[];
  onChange: (skills: SkillDefinition[]) => void;
}

const ADD_BUTTON =
  "flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-[15px] font-medium text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97] md:text-sm";

/** A bot's own skills: the list, and the fields to add one, in the bot sheet. */
export function BotSkillsEditor({
  language,
  skills,
  onChange,
}: BotSkillsEditorProps) {
  const c = getSkillsCopy(language);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Adding or removing unmounts the focused control; focus goes back to
  // "New skill" instead of falling to the top of the sheet.
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const refocusAdd = useRef(false);
  useEffect(() => {
    if (isCreating || !refocusAdd.current) return;
    refocusAdd.current = false;
    addButtonRef.current?.focus();
  }, [isCreating, skills.length]);

  function closePanel() {
    refocusAdd.current = true;
    setIsCreating(false);
  }

  function startCreating() {
    setNotice(null);
    setConfirmingId(null);
    setIsCreating(true);
  }

  function add(skill: SkillDefinition) {
    onChange([...skills, skill]);
    closePanel();
    setNotice(fillCopy(c.added, { name: skill.name }));
  }

  function remove(id: string) {
    onChange(skills.filter((s) => s.id !== id));
    refocusAdd.current = true;
    setConfirmingId(null);
    setNotice(c.removed);
  }

  return (
    <section aria-labelledby="bot-skills-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3
            id="bot-skills-title"
            className="text-[15px] font-medium text-foreground md:text-sm"
          >
            {c.sectionTitle}
          </h3>
          <p className="text-[13px] text-subtle">{c.sectionHint}</p>
        </div>
        {!isCreating && skills.length > 0 && (
          <button
            ref={addButtonRef}
            type="button"
            onClick={startCreating}
            className={`${ADD_BUTTON} shrink-0`}
          >
            <PlusIcon className="size-4" />
            {c.addSkill}
          </button>
        )}
      </div>

      <div role="status" aria-live="polite">
        {notice && (
          <p className="flex items-center gap-2 rounded-xl bg-success-soft px-3.5 py-2.5 text-[13px] text-success">
            <CheckIcon className="size-4 shrink-0" />
            {notice}
          </p>
        )}
      </div>

      {skills.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {skills.map((skill) => (
            <SkillListItem
              key={skill.id}
              skill={skill}
              copy={c}
              isConfirming={confirmingId === skill.id}
              onAskRemove={() => setConfirmingId(skill.id)}
              onCancelRemove={() => setConfirmingId(null)}
              onConfirmRemove={() => remove(skill.id)}
            />
          ))}
        </ul>
      )}

      {isCreating ? (
        <SkillCreatePanel
          copy={c}
          existing={skills}
          onAdd={add}
          onCancel={closePanel}
        />
      ) : (
        skills.length === 0 && (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border px-3.5 py-3">
            <p className="text-[13px] text-muted">{c.empty}</p>
            <button
              ref={addButtonRef}
              type="button"
              onClick={startCreating}
              className={ADD_BUTTON}
            >
              <PlusIcon className="size-4" />
              {c.addSkill}
            </button>
          </div>
        )
      )}
    </section>
  );
}
