"use client";

import { useState } from "react";
import { SettingsSecuritySection } from "@/features/auth/SettingsSecuritySection.tsx";
import { chatCopy } from "@/features/chat/chat-copy.ts";
import { LanguageToggle } from "@/features/chat/LanguageToggle.tsx";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { SettingsSkillsSection } from "@/features/skills/SettingsSkillsSection.tsx";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import type { ClientModelConfig } from "./model-config.ts";
import { ResponsiveSheet } from "@/shared/ui/ResponsiveSheet.tsx";
import { SettingsForm } from "./SettingsForm.tsx";
import { getSettingsCopy } from "./settings-copy.ts";
import { SettingsTabs, type SettingsTabId } from "./SettingsTabs.tsx";

export interface SettingsModalProps {
  isOpen: boolean;
  language: ChatLanguage;
  onLanguageChange?: (language: ChatLanguage) => void;
  currentConfig: ClientModelConfig | null;
  initialTab?: "model" | "skills" | "security";
  skills: SkillDefinition[];
  hasPassword?: boolean;
  authHint?: string | null;
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
  onSetupPassword?: (password: string, hint?: string) => Promise<boolean>;
  onRemovePassword?: (currentPassword: string) => Promise<boolean>;
  onChangePassword?: (
    current: string,
    newPass: string,
    newHint?: string,
  ) => Promise<boolean>;
}

export function SettingsModal({
  isOpen,
  language,
  onLanguageChange,
  currentConfig,
  initialTab = "model",
  skills,
  hasPassword = false,
  authHint = null,
  onClose,
  onSave,
  onReset,
  onAddSkill,
  onRemoveSkill,
  onSetupPassword,
  onRemovePassword,
  onChangePassword,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const t = chatCopy[language];
  const s = getSettingsCopy(language);

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t.settingsTitle}
      description={t.settingsSubtitle}
      closeLabel={s.closeSheet}
      subheader={
        <SettingsTabs
          label={s.tabsLabel}
          active={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: "model", label: s.tabModel },
            {
              id: "skills",
              label: s.tabSkills,
              badge: skills.length > 0 ? String(skills.length) : undefined,
            },
            {
              id: "security",
              label: s.tabSecurity,
              badge: hasPassword ? s.securityActive : undefined,
            },
          ]}
        />
      }
    >
      <div
        role="tabpanel"
        id="settings-panel"
        aria-labelledby={`settings-tab-${activeTab}`}
      >
        <div hidden={activeTab !== "model"}>
          {onLanguageChange && (
            <section className="mb-8 flex flex-col gap-3">
              <h3 className="text-[15px] font-semibold text-foreground">
                {s.sectionLanguage}
              </h3>
              <LanguageToggle
                language={language}
                onChange={onLanguageChange}
                density="full"
              />
            </section>
          )}
          <SettingsForm
            key={
              currentConfig
                ? `${currentConfig.provider}-${"model" in currentConfig ? currentConfig.model : ""}`
                : "initial"
            }
            language={language}
            currentConfig={currentConfig}
            isActive={activeTab === "model"}
            onClose={onClose}
            onSave={onSave}
            onReset={onReset}
          />
        </div>

        <div hidden={activeTab !== "skills"}>
          <SettingsSkillsSection
            language={language}
            skills={skills}
            isActive={activeTab === "skills"}
            onAddSkill={onAddSkill}
            onRemoveSkill={onRemoveSkill}
          />
        </div>

        <div hidden={activeTab !== "security"}>
          <SettingsSecuritySection
            language={language}
            hasPassword={hasPassword}
            hint={authHint}
            onSetupPassword={onSetupPassword || (async () => false)}
            onRemovePassword={onRemovePassword || (async () => false)}
            onChangePassword={onChangePassword || (async () => false)}
          />
        </div>
      </div>
    </ResponsiveSheet>
  );
}
