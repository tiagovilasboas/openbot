"use client";

import { fillCopy } from "@/features/model/settings-copy.ts";
import { TrashIcon } from "@/shared/ui/FieldIcons.tsx";
import type { SkillsCopy } from "./skills-copy.ts";
import type { SkillDefinition } from "./skill-types.ts";

export interface SkillListItemProps {
  skill: SkillDefinition;
  copy: SkillsCopy;
  isConfirming: boolean;
  onAskRemove: () => void;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
}

/** One of a bot's skills, with an inline two-step remove confirmation. */
export function SkillListItem({
  skill,
  copy: c,
  isConfirming,
  onAskRemove,
  onCancelRemove,
  onConfirmRemove,
}: SkillListItemProps) {
  return (
    <li className="flex min-h-14 items-center gap-3 rounded-xl bg-surface px-3.5 py-2">
      {isConfirming ? (
        <>
          <p className="min-w-0 flex-1 text-[15px] font-medium text-foreground md:text-sm">
            {fillCopy(c.removeConfirm, { name: skill.name })}
          </p>
          <button
            type="button"
            onClick={onCancelRemove}
            className="min-h-11 rounded-full px-3 text-[15px] font-medium text-muted hover:text-foreground md:text-sm"
          >
            {c.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirmRemove}
            className="min-h-11 rounded-full bg-danger px-4 text-[15px] font-medium text-background active:scale-[0.97] md:text-sm"
          >
            {c.removeConfirmAction}
          </button>
        </>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-medium text-foreground md:text-sm">
                {skill.name}
              </span>
              <span className="shrink-0 font-mono text-[13px] text-subtle">
                {skill.command}
              </span>
            </div>
            {skill.description && (
              <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-muted">
                {skill.description}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label={fillCopy(c.removeAria, { name: skill.name })}
            onClick={onAskRemove}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-danger transition-colors hover:bg-danger-soft active:scale-[0.97]"
          >
            <TrashIcon className="size-5" />
          </button>
        </>
      )}
    </li>
  );
}
