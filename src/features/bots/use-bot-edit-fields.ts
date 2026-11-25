import { useState } from "react";
import type { BotTemplateDraft } from "@/features/bot-sharing/bot-template-file-types.ts";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import type { BotTemplate } from "./bot-templates.ts";
import { goalToDraft } from "./bot-goal.ts";
import type { AvatarColor, AvatarShape, BotProfile } from "./bot-types.ts";

/** The editable fields of the bot form, plus the template and file fills. */
export function useBotEditFields(bot: BotProfile | null) {
  const [name, setName] = useState(bot?.name || "");
  const [title, setTitle] = useState(bot?.title || "");
  const [description, setDescription] = useState(bot?.description || "");
  const [workspaceContext, setWorkspaceContext] = useState(
    bot?.workspaceContext || "",
  );
  const [modelId, setModelId] = useState(bot?.modelId || "");
  // Typed as text (ids split by commas); parsed when the form is saved.
  const [backupModelsText, setBackupModelsText] = useState(
    (bot?.backupModelIds ?? []).join(", "),
  );
  const [avatarShape, setAvatarShape] = useState<AvatarShape>(
    bot?.avatarShape || "hexagon",
  );
  const [avatarColor, setAvatarColor] = useState<AvatarColor>(
    bot?.avatarColor || "cyan",
  );
  const [skills, setSkills] = useState<SkillDefinition[]>(bot?.skills ?? []);
  const [goalDraft, setGoalDraft] = useState(goalToDraft(bot?.goal));
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [toolsEnabled, setToolsEnabled] = useState(bot?.toolsEnabled === true);

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
    setBackupModelsText((draft.backupModelIds ?? []).join(", "));
    setAvatarShape(draft.avatarShape);
    setAvatarColor(draft.avatarColor);
    setSkills(draft.skills);
  }

  return {
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
    goalDraft,
    setGoalDraft,
    templateId,
    toolsEnabled,
    setToolsEnabled,
    handleSelectTemplate,
    handleImportFile,
  };
}
