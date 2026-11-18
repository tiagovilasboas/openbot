"use client";

import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import {
  BotTemplateExport,
  BotTemplateImport,
} from "@/features/bot-sharing/BotTemplateFileControls.tsx";
import { parseBackupModelsText } from "@/features/model/backup-models.ts";
import { MemorySection } from "@/features/memory/MemorySection.tsx";
import { RoutinesSection } from "@/features/routines/client/RoutinesSection.tsx";
import { BotSkillsEditor } from "@/features/skills/BotSkillsEditor.tsx";
import { BotToolsToggle } from "@/features/tools/client/BotToolsToggle.tsx";
import { FormField, FIELD_CLASS } from "@/shared/ui/FormField.tsx";
import { ResponsiveSheet } from "@/shared/ui/ResponsiveSheet.tsx";
import { AutoTextarea } from "./AutoTextarea.tsx";
import { BotEditPreview } from "./BotEditPreview.tsx";
import { BotAvatarPickers } from "./BotAvatarPickers.tsx";
import { BotBackupModelsField } from "./BotBackupModelsField.tsx";
import { BotEditFooter } from "./BotEditFooter.tsx";
import { BotHideControl } from "./BotHideControl.tsx";
import { BotModelField, isBotModelIdValid } from "./BotModelField.tsx";
import { BotMainControl } from "./BotMainControl.tsx";
import { BotTemplatePicker } from "./BotTemplatePicker.tsx";
import { BOT_NAME_MAX_LENGTH, type BotProfile } from "./bot-types.ts";
import { buildEditedBot } from "./build-edited-bot.ts";
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
  /** Hiding is offered only where it is allowed (not the main bot). */
  canHide?: boolean;
  onHide?: (id: string) => void;
  onRestore?: (id: string) => void;
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
  canHide = false,
  onHide,
  onRestore,
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
    backupModelsText,
    setBackupModelsText,
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

  const backups = parseBackupModelsText(backupModelsText);
  const isValid =
    name.trim().length > 0 && isBotModelIdValid(modelId) && backups.ok;

  function closeAfter(action: (id: string) => void, id: string) {
    action(id);
    onClose();
  }

  function handleSave() {
    if (!isValid || !backups.ok) return;
    const text = { name, title, description, workspaceContext, modelId };
    const look = { avatarShape, avatarColor, skills, toolsEnabled };
    const values = { ...text, ...look, backupModelIds: backups.ids };
    const defaults = { defaultDescription: copy.defaultDescription };
    onSave(buildEditedBot(bot, values, defaults));
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

      <BotBackupModelsField
        value={backupModelsText}
        language={language}
        onChange={setBackupModelsText}
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
      {isEditing && bot && (
        <RoutinesSection botId={bot.id} language={language} />
      )}

      {isEditing && bot && onMakeMain && (
        <BotMainControl
          language={language}
          isMain={isMain}
          onMakeMain={() => onMakeMain(bot.id)}
        />
      )}

      {isEditing && bot && onHide && onRestore && (bot.hidden || canHide) && (
        <BotHideControl
          language={language}
          isHidden={bot.hidden === true}
          onHide={() => closeAfter(onHide, bot.id)}
          onRestore={() => closeAfter(onRestore, bot.id)}
        />
      )}

      {isEditing && bot && <BotTemplateExport bot={bot} language={language} />}

      <BotEditFooter
        language={language}
        isValid={isValid}
        onClose={onClose}
        onSave={handleSave}
        onDelete={
          isEditing && canDelete && onDelete && bot
            ? () => closeAfter(onDelete, bot.id)
            : undefined
        }
      />
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
