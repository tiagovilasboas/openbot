"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import {
  FormField,
  FIELD_CLASS,
  TEXTAREA_CLASS,
} from "@/shared/ui/FormField.tsx";
import { ResponsiveSheet, SheetFooter } from "@/shared/ui/ResponsiveSheet.tsx";
import { BotAvatar } from "./BotAvatar.tsx";
import { BotAvatarPickers } from "./BotAvatarPickers.tsx";
import { BotDeleteControl } from "./BotDeleteControl.tsx";
import { BotSkillsSelector } from "./BotSkillsSelector.tsx";
import { BotTemplatePicker } from "./BotTemplatePicker.tsx";
import type { BotTemplate } from "./bot-templates.ts";
import type { AvatarColor, AvatarShape, BotProfile } from "./bot-types.ts";
import { getBotsCopy } from "./bots-copy.ts";

interface BotEditModalProps {
  isOpen: boolean;
  bot: BotProfile | null;
  allSkills: SkillDefinition[];
  language: ChatLanguage;
  canDelete: boolean;
  onClose: () => void;
  onSave: (bot: BotProfile) => void;
  onDelete?: (id: string) => void;
}

type BotEditFormProps = Omit<BotEditModalProps, "isOpen">;

/** Textarea that grows with its content (sheet body scrolls, not the field). */
function AutoTextarea({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  "aria-describedby"?: string;
  minRows: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const { minRows, ...props } = rest;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      {...props}
      ref={ref}
      rows={minRows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={TEXTAREA_CLASS}
      style={{ minHeight: `${minRows * 1.625 + 1.5}rem` }}
    />
  );
}

function BotEditForm({
  bot,
  allSkills,
  language,
  canDelete,
  onClose,
  onSave,
  onDelete,
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
  const [avatarShape, setAvatarShape] = useState<AvatarShape>(
    bot?.avatarShape || "hexagon",
  );
  const [avatarColor, setAvatarColor] = useState<AvatarColor>(
    bot?.avatarColor || "cyan",
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    bot?.skills || [],
  );
  const [templateId, setTemplateId] = useState<string | null>(null);

  const isValid = name.trim().length > 0;

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
      avatarShape,
      avatarColor,
      skills: selectedSkills,
      createdAt: bot?.createdAt || now,
      updatedAt: now,
    };
    onSave(updated);
    onClose();
  }

  function toggleSkill(skillId: string) {
    setSelectedSkills((curr) =>
      curr.includes(skillId)
        ? curr.filter((id) => id !== skillId)
        : [...curr, skillId],
    );
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label={copy.nameLabel}>
          {(control) => (
            <input
              {...control}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={copy.namePlaceholder}
              autoComplete="off"
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

      <BotSkillsSelector
        allSkills={allSkills}
        selectedSkills={selectedSkills}
        isPt={isPt}
        onToggleSkill={toggleSkill}
      />

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
