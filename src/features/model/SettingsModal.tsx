"use client";

import { Modal } from "@heroui/react";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import type { ClientModelConfig } from "./model-config.ts";
import { SettingsForm } from "./SettingsForm.tsx";

export interface SettingsModalProps {
  isOpen: boolean;
  language: ChatLanguage;
  currentConfig: ClientModelConfig | null;
  onClose: () => void;
  onSave?: (config: ClientModelConfig) => void;
  onReset?: () => void;
}

export function SettingsModal({
  isOpen,
  language,
  currentConfig,
  onClose,
  onSave,
  onReset,
}: SettingsModalProps) {
  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" size="lg">
          <Modal.Dialog className="max-h-[90vh] overflow-y-auto rounded-2xl border border-separator bg-surface p-6 shadow-2xl">
            {isOpen && (
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
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
