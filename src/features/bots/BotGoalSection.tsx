"use client";

import type { Language } from "../language/language.ts";
import { FormField, FIELD_CLASS } from "@/shared/ui/FormField.tsx";
import { GoalRoutinesList } from "@/features/routines/client/GoalRoutinesList.tsx";
import { AutoTextarea } from "./AutoTextarea.tsx";
import { BotEditDisclosure } from "./BotEditDisclosure.tsx";
import {
  GOAL_PROGRESS_MAX_LENGTH,
  GOAL_STATUSES,
  GOAL_TITLE_MAX_LENGTH,
  type GoalDraft,
  type GoalStatus,
} from "./bot-goal.ts";
import { getBotGoalCopy } from "./bot-goal-copy.ts";

interface BotGoalSectionProps {
  draft: GoalDraft;
  language: Language;
  onChange: (draft: GoalDraft) => void;
  /** A saved bot's id, to list the routines linked to its goal. */
  botId?: string;
}

/** The bot's goal, in a collapsed group like the other rare settings. */
export function BotGoalSection({
  draft,
  language,
  onChange,
  botId,
}: BotGoalSectionProps) {
  const copy = getBotGoalCopy(language);
  const set = (patch: Partial<GoalDraft>) => onChange({ ...draft, ...patch });

  return (
    <BotEditDisclosure title={copy.section} defaultOpen={false}>
      <FormField label={copy.titleLabel} helper={copy.helper}>
        {(control) => (
          <input
            {...control}
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder={copy.titlePlaceholder}
            autoComplete="off"
            maxLength={GOAL_TITLE_MAX_LENGTH}
            className={FIELD_CLASS}
          />
        )}
      </FormField>
      <FormField label={copy.descriptionLabel}>
        {(control) => (
          <AutoTextarea
            {...control}
            minRows={2}
            value={draft.description}
            onChange={(description) => set({ description })}
            placeholder={copy.descriptionPlaceholder}
          />
        )}
      </FormField>
      <FormField label={copy.statusLabel}>
        {(control) => (
          <select
            {...control}
            value={draft.status}
            onChange={(e) => set({ status: e.target.value as GoalStatus })}
            className={FIELD_CLASS}
          >
            {GOAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {copy.statuses[status]}
              </option>
            ))}
          </select>
        )}
      </FormField>
      <FormField label={copy.progressLabel}>
        {(control) => (
          <input
            {...control}
            value={draft.progress}
            onChange={(e) => set({ progress: e.target.value })}
            placeholder={copy.progressPlaceholder}
            autoComplete="off"
            maxLength={GOAL_PROGRESS_MAX_LENGTH}
            className={FIELD_CLASS}
          />
        )}
      </FormField>
      {botId && <GoalRoutinesList botId={botId} language={language} />}
    </BotEditDisclosure>
  );
}
