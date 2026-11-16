"use client";

import { useState } from "react";
import type { Language } from "../language/language.ts";
import { PresetRow } from "../model/PresetRow.tsx";
import { useFreeModels } from "../model/use-free-models.ts";
import { FormField, FIELD_CLASS } from "@/shared/ui/FormField.tsx";
import { ResponsiveSheet } from "@/shared/ui/ResponsiveSheet.tsx";
import { MODEL_ID_MAX_LENGTH } from "../model/model-id.ts";
import { buildModelChoices, readCustomModelId } from "./bot-model-options.ts";
import { getBotModelPickerCopy } from "./bot-model-picker-copy.ts";

interface BotModelPickerProps {
  isOpen: boolean;
  language: Language;
  /** The active bot's saved model id; undefined means the Settings model. */
  modelId: string | undefined;
  onChoose: (modelId: string) => void;
  onClose: () => void;
  onOpenSettings?: () => void;
}

/** The picker body only mounts while open, so the list is fetched on demand. */
function PickerBody({
  language,
  modelId,
  onChoose,
}: Pick<BotModelPickerProps, "language" | "modelId" | "onChoose">) {
  const copy = getBotModelPickerCopy(language);
  const { liveFreeModels, hasLoadedLive } = useFreeModels(true);
  const [custom, setCustom] = useState("");
  const [showError, setShowError] = useState(false);
  const choices = buildModelChoices(liveFreeModels, modelId, copy.defaultName);

  function applyCustom() {
    const result = readCustomModelId(custom);
    if (!result.ok) {
      setShowError(true);
      return;
    }
    onChoose(result.modelId);
  }

  return (
    <div className="flex flex-col gap-4">
      {!hasLoadedLive && (
        <p role="status" className="text-[13px] text-subtle">
          {copy.loading}
        </p>
      )}
      <div
        role="radiogroup"
        aria-label={copy.listLabel}
        className="flex flex-col gap-1"
      >
        {choices.map((choice) => (
          <PresetRow
            key={choice.id || "default"}
            name={choice.name}
            description={choice.isDefault ? copy.defaultDescription : choice.id}
            badge={
              !choice.isDefault && choice.id.endsWith(":free")
                ? copy.freeBadge
                : undefined
            }
            selected={choice.isCurrent}
            onSelect={() => onChoose(choice.id)}
          />
        ))}
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          applyCustom();
        }}
      >
        <FormField
          label={copy.customLabel}
          error={showError ? copy.customInvalid : null}
        >
          {(control) => (
            <input
              {...control}
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                setShowError(false);
              }}
              placeholder={copy.customPlaceholder}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={MODEL_ID_MAX_LENGTH}
              className={FIELD_CLASS}
            />
          )}
        </FormField>
        <button
          type="submit"
          className="min-h-11 self-start rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.98]"
        >
          {copy.customApply}
        </button>
      </form>
    </div>
  );
}

/** Chooses the active bot's model without opening the edit form. */
export function BotModelPicker({
  isOpen,
  language,
  modelId,
  onChoose,
  onClose,
  onOpenSettings,
}: BotModelPickerProps) {
  const copy = getBotModelPickerCopy(language);
  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onClose={onClose}
      title={copy.title}
      description={copy.description}
      size="md"
      closeLabel={copy.close}
      footer={
        onOpenSettings && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="min-h-11 rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            {copy.openSettings}
          </button>
        )
      }
    >
      <PickerBody language={language} modelId={modelId} onChoose={onChoose} />
    </ResponsiveSheet>
  );
}
