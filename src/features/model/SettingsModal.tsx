"use client";

import { Modal } from "@heroui/react";
import { useState } from "react";
import { chatCopy } from "@/features/chat/chat-copy.ts";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { SettingsSkillsSection } from "@/features/skills/SettingsSkillsSection.tsx";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import type { ClientModelConfig } from "./model-config.ts";
import { SettingsForm } from "./SettingsForm.tsx";

export interface SettingsModalProps {
  isOpen: boolean;
  language: ChatLanguage;
  currentConfig: ClientModelConfig | null;
  initialTab?: "model" | "skills";
  skills: SkillDefinition[];
  onClose: () => void;
  onSave?: (config: ClientModelConfig) => void;
  onReset?: () => void;
  onAddSkill: (input: {
    name: string;
    command?: string;
    description?: string;
    instructions: string;
  }) => void;
  onRemoveSkill: (id: string) => void;
}

export function SettingsModal({
  isOpen,
  language,
  currentConfig,
  initialTab = "model",
  skills,
  onClose,
  onSave,
  onReset,
  onAddSkill,
  onRemoveSkill,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"model" | "skills">(initialTab);
  const t = chatCopy[language];

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" size="lg">
          <Modal.Dialog className="max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl text-zinc-100">
            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab("model")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  activeTab === "model"
                    ? "bg-zinc-800 text-white border-white/20"
                    : "bg-zinc-900/40 text-zinc-400 border-white/5 hover:text-white"
                }`}
              >
                <span>⚡</span>
                <span>{t.settingsTabModel}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("skills")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  activeTab === "skills"
                    ? "bg-zinc-800 text-white border-white/20"
                    : "bg-zinc-900/40 text-zinc-400 border-white/5 hover:text-white"
                }`}
              >
                <span>🧩</span>
                <span>{t.settingsTabSkills}</span>
                <span className="text-[10px] text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded-md">
                  {skills.length}
                </span>
              </button>
            </div>

            {isOpen && activeTab === "model" && (
              <SettingsForm
                key={
                  currentConfig
                    ? `${currentConfig.provider}-${"model" in currentConfig ? currentConfig.model : ""}`
                    : "initial"
                }
                language={language}
                currentConfig={currentConfig}
                onClose={onClose}
                onSave={onSave}
                onReset={onReset}
              />
            )}

            {isOpen && activeTab === "skills" && (
              <SettingsSkillsSection
                language={language}
                skills={skills}
                onAddSkill={onAddSkill}
                onRemoveSkill={onRemoveSkill}
              />
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
