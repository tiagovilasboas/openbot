"use client";

import { Button, Input, Modal } from "@heroui/react";
import { useState } from "react";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { parseSkillFromMarkdown } from "./skill-storage.ts";
import type { SkillDefinition } from "./skill-types.ts";

interface SkillsModalProps {
  isOpen: boolean;
  language: ChatLanguage;
  skills: SkillDefinition[];
  onClose: () => void;
  onAddSkill: (input: {
    name: string;
    command?: string;
    description?: string;
    instructions: string;
  }) => void;
  onRemoveSkill: (id: string) => void;
}

export function SkillsModal({
  isOpen,
  language,
  skills,
  onClose,
  onAddSkill,
  onRemoveSkill,
}: SkillsModalProps) {
  const isPt = language === "pt";
  const [tab, setTab] = useState<"list" | "create">("list");
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [markdownInput, setMarkdownInput] = useState("");

  function handleImportMarkdown(text: string) {
    setMarkdownInput(text);
    const parsed = parseSkillFromMarkdown(text);
    if (parsed) {
      setName(parsed.name);
      setDescription(parsed.description);
      setInstructions(parsed.instructions);
    }
  }

  function handleSave() {
    if (!name.trim() || !instructions.trim()) return;
    onAddSkill({
      name: name.trim(),
      command: command.trim() || undefined,
      description: description.trim(),
      instructions: instructions.trim(),
    });
    setName("");
    setCommand("");
    setDescription("");
    setInstructions("");
    setMarkdownInput("");
    setTab("list");
  }

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" size="lg">
          <Modal.Dialog className="max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl text-zinc-100">
            <Modal.Header className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <Modal.Heading className="text-lg font-bold text-white">
                  {isPt ? "Biblioteca de Skills" : "Skills Library"}
                </Modal.Heading>
                <p className="text-xs text-zinc-400">
                  {isPt
                    ? "Habilidades modulares acionadas por comando / ou atribuídas a bots."
                    : "Modular abilities triggered by / commands or assigned to bots."}
                </p>
              </div>
              <Modal.CloseTrigger />
            </Modal.Header>

            {/* Tab switch */}
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setTab("list")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  tab === "list"
                    ? "bg-zinc-800 text-white border-white/20"
                    : "bg-zinc-900/40 text-zinc-400 border-white/5 hover:text-white"
                }`}
              >
                {isPt ? "Skills Disponíveis" : "Available Skills"} (
                {skills.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("create")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  tab === "create"
                    ? "bg-zinc-800 text-white border-white/20"
                    : "bg-zinc-900/40 text-zinc-400 border-white/5 hover:text-white"
                }`}
              >
                +{" "}
                {isPt
                  ? "Nova Skill / Importar SKILL.md"
                  : "New Skill / Import SKILL.md"}
              </button>
            </div>

            <Modal.Body className="py-4">
              {tab === "list" ? (
                <div className="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-white/15 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {skill.name}
                          </span>
                          <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.5 rounded-md">
                            {skill.command}
                          </span>
                          {skill.isBuiltin && (
                            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/30 px-1.5 py-0.5 rounded-md">
                              {isPt ? "Nativa" : "Built-in"}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-zinc-300">
                          {skill.description}
                        </p>
                        <p className="mt-1.5 text-[11px] text-zinc-500 line-clamp-2 font-mono">
                          {skill.instructions}
                        </p>
                      </div>

                      {!skill.isBuiltin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-rose-400 hover:bg-rose-500/10"
                          onPress={() => onRemoveSkill(skill.id)}
                        >
                          {isPt ? "Excluir" : "Delete"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Import Markdown Box */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {isPt
                        ? "Colar ou Importar SKILL.md (Opcional)"
                        : "Paste or Import SKILL.md (Optional)"}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={
                        isPt
                          ? "# Nome da Skill\n> Descrição curta\n\nInstruções detalhadas do prompt..."
                          : "# Skill Name\n> Short description\n\nDetailed instructions..."
                      }
                      value={markdownInput}
                      onChange={(e) => handleImportMarkdown(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/30 resize-none leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        {isPt ? "Nome da Skill *" : "Skill Name *"}
                      </label>
                      <Input
                        placeholder="ex: Code Review"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-zinc-900 border-white/10 text-white rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        {isPt ? "Comando de Barra (/)" : "Slash Command (/)"}
                      </label>
                      <Input
                        placeholder="ex: /code-review"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        className="w-full bg-zinc-900 border-white/10 text-white rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {isPt ? "Descrição Curta" : "Short Description"}
                    </label>
                    <Input
                      placeholder={
                        isPt
                          ? "ex: Analisa diffs de PRs procurando bugs"
                          : "e.g. Reviews PR diffs"
                      }
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-zinc-900 border-white/10 text-white rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {isPt
                        ? "Instruções do Sistema da Skill *"
                        : "Skill System Instructions *"}
                    </label>
                    <textarea
                      rows={4}
                      placeholder={
                        isPt
                          ? "Instruções injetadas no modelo quando esta skill for invocada..."
                          : "Instructions injected into model context when this skill is invoked..."
                      }
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/30 resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </Modal.Body>

            <Modal.Footer className="flex items-center justify-end gap-2 border-t border-white/10 pt-4">
              <Button size="sm" variant="secondary" onPress={onClose}>
                {isPt ? "Fechar" : "Close"}
              </Button>
              {tab === "create" && (
                <Button
                  size="sm"
                  variant="primary"
                  isDisabled={!name.trim() || !instructions.trim()}
                  onPress={handleSave}
                  className="bg-white text-black font-semibold hover:bg-zinc-200"
                >
                  {isPt ? "Criar Skill" : "Create Skill"}
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
