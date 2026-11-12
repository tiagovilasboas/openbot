"use client";

import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import {
  BotTemplateExport,
  BotTemplateImport,
} from "@/features/bot-sharing/BotTemplateFileControls.tsx";
import { MemorySection } from "@/features/memory/MemorySection.tsx";
import { BotSkillsEditor } from "@/features/skills/BotSkillsEditor.tsx";
import { BotToolsToggle } from "@/features/tools/client/BotToolsToggle.tsx";
import { FormField, FIELD_CLASS } from "@/shared/ui/FormField.tsx";
import { ResponsiveSheet, SheetFooter } from "@/shared/ui/ResponsiveSheet.tsx";
import { AutoTextarea } from "./AutoTextarea.tsx";
import { BotEditPreview } from "./BotEditPreview.tsx";
import { BotAvatarPickers } from "./BotAvatarPickers.tsx";
import { BotDeleteControl } from "./BotDeleteControl.tsx";
import { BotModelField, isBotModelIdValid } from "./BotModelField.tsx";
import { BotMainControl } from "./BotMainControl.tsx";
import { BotTemplatePicker } from "./BotTemplatePicker.tsx";
import { BOT_NAME_MAX_LENGTH, type BotProfile } from "./bot-types.ts";
import { getBotsCopy } from "./bots-copy.ts";
import { useBotEditFields } from "./use-bot-edit-fields.ts";
import { PromptBudgetNotice } from "./PromptBudgetNotice.tsx";
import { analyzePromptBudget, promptReserveFor } from "./prompt-budget.ts";

interface BotEditModalProps {
  isOpen: boolean;
  bot: BotProfile | null;
  language: ChatLanguage;
  canDelete: boolean;
  /** Whether this bot is the main one, which leads the crew. */
  isMain?: boolean;
  onClose: () => void;
  onSave: (bot: BotProfile) => void;
  onDelete?: (id: string) => void;
  onMakeMain?: (id: string) => void;
}

type BotEditFormProps = Omit<BotEditModalProps, "isOpen">;

function BotEditForm({
  bot,
  language,
  canDelete,
  isMain = false,
  onClose,
  onSave,
  onDelete,
  onMakeMain,
}: BotEditFormProps) {
  const isEditing = Boolean(bot?.id && bot.id !== "new");
  const copy = getBotsCopy(language);

  const {
    name,
    setName,
    title,
    setTitle,
    description,
    setDescription,
    workspaceContext,
    setWorkspaceContext,
    modelId,
    setModelId,
    avatarShape,
    setAvatarShape,
    avatarColor,
    setAvatarColor,
    skills,
    setSkills,
    templateId,
    toolsEnabled,
    setToolsEnabled,
    handleSelectTemplate,
    handleImportFile,
  } = useBotEditFields(bot);

  const budgetReport = analyzePromptBudget(
    {
      id: bot?.id ?? "new",
      name,
      description: description.trim(),
      workspaceContext: workspaceContext.trim() || undefined,
      avatarShape,
      avatarColor,
      skills,
      createdAt: "",
      updatedAt: "",
    },
    language,
    promptReserveFor(isMain, language),
  );

  const isValid = name.trim().length > 0 && isBotModelIdValid(modelId);

  function handleSave() {
    if (!isValid) return;
    const now = new Date().toISOString();
    const updated: BotProfile = {
      id:
        bot?.id && bot.id !== "new"
          ? bot.id
          : `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      title: title.trim() || undefined,
      description: description.trim() || copy.defaultDescription,
      workspaceContext: workspaceContext.trim() || undefined,
      modelId: modelId.trim() || undefined,
      avatarShape,
      avatarColor,
      skills,
      ...(toolsEnabled ? { toolsEnabled: true } : {}),
      createdAt: bot?.createdAt || now,
      updatedAt: now,
    };
    onSave(updated);
    onClose();
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
    >
      <BotEditPreview
        name={name}
        title={title}
        avatarShape={avatarShape}
        avatarColor={avatarColor}
        language={language}
      />

      {!isEditing && (
        <BotTemplatePicker
          language={language}
          selectedId={templateId}
          onSelectTemplate={handleSelectTemplate}
        />
      )}

      {!isEditing && (
        <BotTemplateImport language={language} onImport={handleImportFile} />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label={copy.nameLabel}>
          {(control) => (
            <input
              {...control}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={copy.namePlaceholder}
              autoComplete="off"
              maxLength={BOT_NAME_MAX_LENGTH}
              className={FIELD_CLASS}
            />
          )}
        </FormField>
        <FormField label={copy.roleLabel}>
          {(control) => (
            <input
              {...control}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={copy.rolePlaceholder}
              autoComplete="off"
              className={FIELD_CLASS}
            />
          )}
        </FormField>
      </div>

      <BotAvatarPickers
        avatarShape={avatarShape}
        avatarColor={avatarColor}
        language={language}
        onSelectShape={setAvatarShape}
        onSelectColor={setAvatarColor}
      />

      <FormField label={copy.instructionsLabel}>
        {(control) => (
          <AutoTextarea
            {...control}
            minRows={5}
            value={description}
            onChange={setDescription}
            placeholder={copy.instructionsPlaceholder}
          />
        )}
      </FormField>

      <FormField label={copy.workspaceLabel}>
        {(control) => (
          <AutoTextarea
            {...control}
            minRows={3}
            value={workspaceContext}
            onChange={setWorkspaceContext}
            placeholder={copy.workspacePlaceholder}
          />
        )}
      </FormField>

      <BotModelField
        value={modelId}
        language={language}
        onChange={setModelId}
      />

      <BotSkillsEditor
        language={language}
        skills={skills}
        onChange={setSkills}
        botId={isEditing && bot ? bot.id : undefined}
        modelId={modelId}
      />

      {/* The main bot leads the crew, and a crew turn never uses tools. */}
      {!isMain && (
        <BotToolsToggle
          enabled={toolsEnabled}
          language={language}
          onChange={setToolsEnabled}
        />
      )}

      <PromptBudgetNotice report={budgetReport} language={language} />

      {isEditing && bot && <MemorySection botId={bot.id} language={language} />}

      {isEditing && bot && onMakeMain && (
        <BotMainControl
          language={language}
          isMain={isMain}
          onMakeMain={() => onMakeMain(bot.id)}
        />
      )}

      {isEditing && bot && <BotTemplateExport bot={bot} language={language} />}

      <SheetFooter>
        <div className="flex items-center justify-between gap-2">
          <div>
            {isEditing && canDelete && onDelete && bot && (
              <BotDeleteControl
                language={language}
                onConfirm={() => {
                  onDelete(bot.id);
                  onClose();
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-full border border-border bg-surface px-5 text-[15px] font-medium text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97] md:text-sm"
            >
              {copy.cancel}
            </button>
            <button
              type="button"
              disabled={!isValid}
              onClick={handleSave}
              className="min-h-11 rounded-full bg-foreground px-5 text-[15px] font-semibold text-background transition-transform active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 md:text-sm"
            >
              {copy.save}
            </button>
          </div>
        </div>
      </SheetFooter>
    </form>
  );
}

export function BotEditModal(props: BotEditModalProps) {
  const { isOpen, bot, onClose } = props;
  const isEditing = Boolean(bot?.id && bot.id !== "new");
  const copy = getBotsCopy(props.language);

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? copy.titleEdit : copy.titleNew}
      closeLabel={copy.closeLabel}
      size="lg"
    >
      {isOpen && <BotEditForm key={bot?.id || "new-bot"} {...props} />}
    </ResponsiveSheet>
  );
}
