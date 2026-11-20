"use client";

import { ChatExperience } from "../chat/ChatExperience.tsx";
import { useLanguage } from "../chat/use-language.ts";
import { AgentSetup } from "./AgentSetup.tsx";
import { getAgentSetupCopy } from "./agent-setup-copy.ts";
import { useAgentsReady } from "./use-agents-ready.ts";

/** The app: the agent setup until the person has created an agent, then the chat. */
export function AppEntry() {
  const [language] = useLanguage();
  const status = useAgentsReady();
  if (status === "ready") return <ChatExperience />;
  if (status === "setup") return <AgentSetup language={language} />;
  return (
    <main
      aria-busy="true"
      aria-label={getAgentSetupCopy(language).loading}
      className="min-h-dvh bg-background"
    />
  );
}
