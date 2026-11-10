"use client";

import { useState } from "react";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import {
  BotTemplateExport,
  BotTemplateImport,
} from "@/features/bot-sharing/BotTemplateFileControls.tsx";
import type { BotTemplateDraft } from "@/features/bot-sharing/bot-template-file-types.ts";
import { MemorySection } from "@/features/memory/MemorySection.tsx";
import { BotSkillsEditor } from "@/features/skills/BotSkillsEditor.tsx";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import { FormField, FIELD_CLASS } from "@/shared/ui/FormField.tsx";
import { ResponsiveSheet, SheetFooter } from "@/shared/ui/ResponsiveSheet.tsx";
import { AutoTextarea } from "./AutoTextarea.tsx";
import { BotAvatar } from "./BotAvatar.tsx";
import { BotAvatarPickers } from "./BotAvatarPickers.tsx";
import { BotDeleteControl } from "./BotDeleteControl.tsx";
import { BotModelField, isBotModelIdValid } from "./BotModelField.tsx";
import { BotMainControl } from "./BotMainControl.tsx";
import { BotTemplatePicker } from "./BotTemplatePicker.tsx";
import type { BotTemplate } from "./bot-templates.ts";
import {
  BOT_NAME_MAX_LENGTH,
  type AvatarColor,
  type AvatarShape,
  type BotProfile,
} from "./bot-types.ts";
import { getBotsCopy } from "./bots-copy.ts";

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
  const isPt = language === "pt";
  const copy = getBotsCopy(isPt);

  const [name, setName] = useState(bot?.name || "");
  const [title, setTitle] = useState(bot?.title || "");
  const [description, setDescription] = useState(bot?.description || "");
  const [workspaceContext, setWorkspaceContext] = useState(
    bot?.workspaceContext || "",
  );
  const [modelId, setModelId] = useState(bot?.modelId || "");
  const [avatarShape, setAvatarShape] = useState<AvatarShape>(
    bot?.avatarShape || "hexagon",
  );
  const [avatarColor, setAvatarColor] = useState<AvatarColor>(
    bot?.avatarColor || "cyan",
  );
  const [skills, setSkills] = useState<SkillDefinition[]>(bot?.skills ?? []);
  const [templateId, setTemplateId] = useState<string | null>(null);

  const isValid = name.trim().length > 0 && isBotModelIdValid(modelId);

  function handleSelectTemplate(tmpl: BotTemplate) {
    setTemplateId(tmpl.id);
    setName(tmpl.name);
    setTitle(tmpl.title);
    setDescription(tmpl.description);
    if (tmpl.workspaceContext) {
      setWorkspaceContext(tmpl.workspaceContext);
    }
    setAvatarShape(tmpl.avatarShape);
    setAvatarColor(tmpl.avatarColor);
  }

  function handleImportFile(draft: BotTemplateDraft) {
    setTemplateId(null);
    setName(draft.name);
    setTitle(draft.title ?? "");
    setDescription(draft.description);
    setWorkspaceContext(draft.workspaceContext ?? "");
    setModelId(draft.modelId ?? "");
    setAvatarShape(draft.avatarShape);
    setAvatarColor(draft.avatarColor);
    setSkills(draft.skills);
  }

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
      description:
        description.trim() ||
        (isPt
          ? "Você é um assistente conciso e prestativo."
          : "You are a concise, helpful assistant."),
      workspaceContext: workspaceContext.trim() || undefined,
      modelId: modelId.trim() || undefined,
      avatarShape,
      avatarColor,
      skills,
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
      <div className="flex items-center gap-4">
        <BotAvatar
          shape={avatarShape}
          color={avatarColor}
          size={64}
          className="shrink-0"
        />
        <div className="min-w-0">
          <p
            className={`truncate text-lg font-semibold ${name.trim() ? "text-foreground" : "text-subtle"}`}
          >
            {name.trim() || copy.previewNamePlaceholder}
          </p>
          <p className="truncate text-[13px] text-muted">
            {title.trim() || copy.previewRolePlaceholder}
          </p>
        </div>
      </div>

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
        isPt={isPt}
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

      <BotModelField value={modelId} isPt={isPt} onChange={setModelId} />

      <BotSkillsEditor
        language={language}
        skills={skills}
        onChange={setSkills}
      />

      {isEditing && bot && <MemorySection botId={bot.id} isPt={isPt} />}

      {isEditing && bot && onMakeMain && (
        <BotMainControl
          isPt={isPt}
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
                isPt={isPt}
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
  const copy = getBotsCopy(props.language === "pt");

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
