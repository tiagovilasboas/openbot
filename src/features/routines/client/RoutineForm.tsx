"use client";

import { useState, type KeyboardEvent } from "react";
import type { Language } from "../../language/language.ts";
import {
  FormField,
  FIELD_CLASS,
  TEXTAREA_CLASS,
} from "@/shared/ui/FormField.tsx";
import { isOneShotRoutineId } from "../routine-idle.ts";
import { MAX_PROMPT_LENGTH, MAX_TITLE_LENGTH } from "../routine-input.ts";
import type { RoutineInput } from "../routine-input.ts";
import {
  checkDraft,
  FORM_WEEKDAYS,
  toggleDay,
  type RoutineDraft,
  type ScheduleKind,
} from "./routine-draft.ts";
import { weekdayName } from "./routine-format.ts";
import { getRoutinesCopy } from "./routines-copy.ts";

interface RoutineFormProps {
  botId: string;
  initial: RoutineDraft;
  language: Language;
  onSave: (input: RoutineInput) => Promise<boolean>;
  onCancel: () => void;
  /** The bot's other routines, to run this one after. */
  chainOptions?: readonly { id: string; title: string }[];
  /** The bot has an active goal, so the routine may be linked to it. */
  goalActive?: boolean;
}

const KINDS: readonly ScheduleKind[] = ["daily", "weekly", "interval"];

const CHIP =
  "min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors md:text-[13px]";
const SEGMENT =
  "min-h-9 flex-auto whitespace-nowrap rounded-full px-2.5 text-xs font-medium transition-colors md:text-sm";
const segmentClass = (on: boolean) =>
  `${SEGMENT} ${on ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`;
const chipClass = (on: boolean) =>
  `${CHIP} ${on ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-foreground hover:bg-surface-secondary"}`;

// Enter in a single-line field must not submit the surrounding bot form.
const keepEnter = (e: KeyboardEvent) => {
  if (e.key === "Enter") e.preventDefault();
};

/** Create or edit one routine. Validates on save, like the server does. */
export function RoutineForm(props: RoutineFormProps) {
  const { botId, initial, language, onSave, onCancel } = props;
  const chainOptions = props.chainOptions ?? [];
  const goalActive = props.goalActive === true;
  const copy = getRoutinesCopy(language);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<RoutineDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));

  async function handleSave() {
    const checked = checkDraft(draft, botId);
    if (!checked.ok) return setError(copy.errors[checked.problem]);
    setSaving(true);
    const saved = await onSave(checked.input);
    setSaving(false);
    setError(saved ? null : copy.errors.save);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-overlay p-3">
      <FormField label={copy.titleLabel}>
        {(control) => (
          <input
            {...control}
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            onKeyDown={keepEnter}
            maxLength={MAX_TITLE_LENGTH}
            placeholder={copy.titlePlaceholder}
            autoComplete="off"
            className={FIELD_CLASS}
          />
        )}
      </FormField>
      <FormField label={copy.promptLabel}>
        {(control) => (
          <textarea
            {...control}
            value={draft.prompt}
            onChange={(e) => set({ prompt: e.target.value })}
            maxLength={MAX_PROMPT_LENGTH}
            placeholder={copy.promptPlaceholder}
            className={TEXTAREA_CLASS}
          />
        )}
      </FormField>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-foreground">
          {copy.scheduleLabel}
        </legend>
        {draft.kind === "once" && (
          <p className="text-xs text-muted md:text-[13px]">{copy.onceNote}</p>
        )}
        <div className="flex flex-wrap gap-1 rounded-[1.25rem] border border-border p-0.5">
          {KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={draft.kind === kind}
              onClick={() => set({ kind })}
              className={segmentClass(draft.kind === kind)}
            >
              {copy.kinds[kind]}
            </button>
          ))}
        </div>
        {draft.kind === "once" ? null : draft.kind === "interval" ? (
          <FormField label={copy.everyMinutesLabel}>
            {(control) => (
              <input
                {...control}
                type="number"
                inputMode="numeric"
                min={5}
                step={5}
                value={draft.everyMinutes}
                onChange={(e) => set({ everyMinutes: e.target.value })}
                onKeyDown={keepEnter}
                className={FIELD_CLASS}
              />
            )}
          </FormField>
        ) : (
          <>
            {draft.kind === "weekly" && (
              <div
                role="group"
                aria-label={copy.daysLabel}
                className="-mx-3 flex gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {FORM_WEEKDAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={draft.days.includes(day)}
                    onClick={() => set({ days: toggleDay(draft.days, day) })}
                    className={chipClass(draft.days.includes(day))}
                  >
                    {weekdayName(day, language)}
                  </button>
                ))}
              </div>
            )}
            <FormField
              label={copy.timeLabel}
              helper={copy.timeZone(draft.timeZone)}
            >
              {(control) => (
                <input
                  {...control}
                  type="time"
                  value={draft.time}
                  onChange={(e) => set({ time: e.target.value })}
                  onKeyDown={keepEnter}
                  className={FIELD_CLASS}
                />
              )}
            </FormField>
          </>
        )}
      </fieldset>

      <label className="flex items-start gap-2.5 text-sm text-foreground">
        <input
          type="checkbox"
          checked={draft.silentWhenNothingNew}
          onChange={(e) => set({ silentWhenNothingNew: e.target.checked })}
          className="mt-0.5 size-4"
        />
        <span>
          <span className="block font-medium">{copy.silentLabel}</span>
          <span className="block text-xs md:text-[13px] text-muted">
            {copy.silentHint}
          </span>
        </span>
      </label>

      <label className="flex items-start gap-2.5 text-sm text-foreground">
        <input
          type="checkbox"
          checked={draft.runInThread}
          onChange={(e) => set({ runInThread: e.target.checked })}
          className="mt-0.5 size-4"
        />
        <span>
          <span className="block font-medium">{copy.threadLabel}</span>
          <span className="block text-xs md:text-[13px] text-muted">
            {copy.threadHint}
          </span>
        </span>
      </label>

      {goalActive && !isOneShotRoutineId(draft.id) && (
        <label className="flex items-start gap-2.5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={draft.goalLinked}
            onChange={(e) => set({ goalLinked: e.target.checked })}
            className="mt-0.5 size-4"
          />
          <span>
            <span className="block font-medium">{copy.goalLabel}</span>
            <span className="block text-xs md:text-[13px] text-muted">
              {copy.goalHint}
            </span>
          </span>
        </label>
      )}

      {chainOptions.length > 0 && (
        <FormField label={copy.chainLabel} helper={copy.chainHint}>
          {(control) => (
            <select
              {...control}
              value={draft.afterRoutineId}
              onChange={(e) => set({ afterRoutineId: e.target.value })}
              className={FIELD_CLASS}
            >
              <option value="">{copy.chainNone}</option>
              {chainOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          )}
        </FormField>
      )}

      {error && (
        <p role="alert" className="text-xs md:text-[13px] text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-10 whitespace-nowrap rounded-full px-4 text-sm font-medium text-muted hover:text-foreground"
        >
          {copy.cancel}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="min-h-10 whitespace-nowrap rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
        >
          {copy.save}
        </button>
      </div>
    </div>
  );
}
