import { useEffect, useState } from "react";
import {
  formatModelBadge,
  type ClientModelConfig,
} from "@/features/model/model-config.ts";
import {
  fetchActiveServerModel,
  type ActiveServerModelOutcome,
} from "@/features/model/test-model-connection.ts";
import { useModelStatus } from "@/features/model/use-model-status.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

/** Which model answers: the user's own config, else the server's. */
export function useActiveModel(
  modelConfig: ClientModelConfig | null,
  language: ChatLanguage,
) {
  const [serverModel, setServerModel] =
    useState<ActiveServerModelOutcome | null>(null);

  useEffect(() => {
    void fetchActiveServerModel().then((server) => setServerModel(server));
  }, []);

  const isConfigured = Boolean(modelConfig || serverModel?.configured);
  const { status: modelStatus, recordModelCall } = useModelStatus(
    modelConfig,
    isConfigured,
  );
  const activeModelLabel = modelConfig
    ? formatModelBadge(modelConfig, false, language)
    : serverModel?.configured
      ? formatModelBadge(serverModel, false, language)
      : formatModelBadge(null, false, language);

  return {
    serverModel,
    isConfigured,
    modelStatus,
    recordModelCall,
    activeModelLabel,
  };
}
