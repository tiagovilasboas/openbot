"use client";

import { Button, Input, Modal } from "@heroui/react";
import { useState } from "react";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import { BotAvatar } from "./BotAvatar.tsx";
import { BotAvatarPickers } from "./BotAvatarPickers.tsx";
import type { AvatarColor, AvatarShape, BotProfile } from "./bot-types.ts";

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

interface BotEditFormProps {
  bot: BotProfile | null;
  allSkills: SkillDefinition[];
  language: ChatLanguage;
  canDelete: boolean;
  onClose: () => void;
  onSave: (bot: BotProfile) => void;
  onDelete?: (id: string) => void;
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

  const [name, setName] = useState(bot?.name || "");
  const [title, setTitle] = useState(bot?.title || "");
  const [description, setDescription] = useState(bot?.description || "");
  const [avatarShape, setAvatarShape] = useState<AvatarShape>(
    bot?.avatarShape || "hexagon",
  );
  const [avatarColor, setAvatarColor] = useState<AvatarColor>(
    bot?.avatarColor || "cyan",
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    bot?.skills || ["github", "calendar", "summary"],
  );

  function handleSave() {
    if (!name.trim()) return;
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
    <>
      <Modal.Header className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <BotAvatar shape={avatarShape} color={avatarColor} size={36} />
          <div>
            <Modal.Heading className="text-lg font-bold text-white">
              {isEditing
                ? isPt
                  ? `Editar ${name || "Bot"}`
                  : `Edit ${name || "Bot"}`
                : isPt
                  ? "Criar Novo Bot"
                  : "Create New Bot"}
            </Modal.Heading>
            <p className="text-xs text-zinc-400">
              {isPt
                ? "Personalize o avatar geométrico, prompt e skills do seu bot."
                : "Customize geometric avatar, instructions and skills."}
            </p>
          </div>
        </div>
        <Modal.CloseTrigger />
      </Modal.Header>

      <Modal.Body className="flex flex-col gap-5 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {isPt ? "Nome do Bot *" : "Bot Name *"}
            </label>
            <Input
              placeholder={isPt ? "ex: Dev Bot, Inbox..." : "e.g. Dev Bot..."}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border-white/10 text-white rounded-xl"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {isPt ? "Especialidade / Título" : "Title / Specialty"}
            </label>
            <Input
              placeholder={
                isPt ? "ex: Especialista GitHub" : "e.g. GitHub Specialist"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-900 border-white/10 text-white rounded-xl"
            />
          </div>
        </div>

        <BotAvatarPickers
          avatarShape={avatarShape}
          avatarColor={avatarColor}
          isPt={isPt}
          onSelectShape={setAvatarShape}
          onSelectColor={setAvatarColor}
        />

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {isPt
              ? "Instruções do Sistema (Prompt do Bot)"
              : "System Instructions (Bot Prompt)"}
          </label>
          <textarea
            rows={3}
            placeholder={
              isPt
                ? "Defina o comportamento e prompt do modelo para este Bot..."
                : "Define personality, goals, and behavior..."
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/30 resize-none leading-relaxed"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {isPt
              ? "Skills Habilitadas neste Bot"
              : "Skills Enabled on this Bot"}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allSkills.map((skill) => {
              const isSelected = selectedSkills.includes(skill.id);
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => toggleSkill(skill.id)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-emerald-500/40 bg-emerald-500/10 text-white"
                      : "border-white/5 bg-zinc-900/40 text-zinc-400 hover:border-white/15"
                  }`}
                >
                  <span
                    className={`size-3 rounded-full mt-1 shrink-0 ${
                      isSelected
                        ? "bg-emerald-400 shadow-sm"
                        : "border border-zinc-600"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white">
                      {skill.name}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {skill.description}
                    </p>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {skill.command}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="flex items-center justify-between border-t border-white/10 pt-4">
        <div>
          {isEditing && canDelete && onDelete && bot && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-rose-400 hover:bg-rose-500/10"
              onPress={() => {
                onDelete(bot.id);
                onClose();
              }}
            >
              {isPt ? "Excluir Bot" : "Delete Bot"}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onPress={onClose}>
            {isPt ? "Cancelar" : "Cancel"}
          </Button>
          <Button
            size="sm"
            variant="primary"
            isDisabled={!name.trim()}
            onPress={handleSave}
            className="bg-white text-black font-semibold hover:bg-zinc-200"
          >
            {isPt ? "Salvar Bot" : "Save Bot"}
          </Button>
        </div>
      </Modal.Footer>
    </>
  );
}

export function BotEditModal(props: BotEditModalProps) {
  const { isOpen, bot, onClose } = props;

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" size="lg">
          <Modal.Dialog className="max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl text-zinc-100">
            {isOpen && <BotEditForm key={bot?.id || "new-bot"} {...props} />}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
