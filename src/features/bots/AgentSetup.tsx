"use client";

import { useState } from "react";
import type { Language } from "../language/language.ts";
import { BotAvatar } from "./BotAvatar.tsx";
import {
  buildSetupCrew,
  buildStarterKitCrew,
  SETUP_ROLES,
  type SetupResult,
} from "./agent-setup.ts";
import { getAgentSetupCopy } from "./agent-setup-copy.ts";
import { saveActiveBotId, saveBotsToStorage } from "./bot-storage.ts";
import { BOT_LABEL_MAX_LENGTH, BOT_NAME_MAX_LENGTH } from "./bot-types.ts";
import { saveMainBotId } from "./main-bot.ts";
import { pushBots } from "./sync/browser-bots-sync.ts";
import { BackupSection } from "../backup/BackupSection.tsx";

const FIELD =
  "min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-[15px] text-foreground placeholder:text-subtle";

/** First-install screen: the crew starts empty and holds only what is created here. */
export function AgentSetup({ language }: { language: Language }) {
  const copy = getAgentSetupCopy(language);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);

  function persistCrew(crew: SetupResult) {
    saveMainBotId(crew.mainBotId);
    saveActiveBotId(crew.mainBotId);
    saveBotsToStorage(crew.bots);
    pushBots();
  }

  function create() {
    const crew = buildSetupCrew(
      { name, title, instructions, roleIds },
      language,
    );
    if (!crew) return;
    persistCrew(crew);
  }

  function applyStarterKit() {
    persistCrew(buildStarterKitCrew());
  }

  return (
    <main className="flex min-h-dvh items-start justify-center overflow-y-auto bg-background px-4 py-8 md:items-center md:py-12">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <form
          aria-labelledby="agent-setup-title"
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            create();
          }}
        >
          <div>
            <h1
              id="agent-setup-title"
              className="text-2xl font-semibold tracking-[-0.02em] text-foreground"
            >
              {copy.title}
            </h1>
            <p className="mt-1 text-[15px] text-muted">{copy.intro}</p>
          </div>

          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            {copy.nameLabel}
            <input
              required
              autoFocus
              value={name}
              maxLength={BOT_NAME_MAX_LENGTH}
              placeholder={copy.namePlaceholder}
              onChange={(e) => setName(e.target.value)}
              className={FIELD}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            {copy.roleLabel}
            <input
              value={title}
              maxLength={BOT_LABEL_MAX_LENGTH}
              placeholder={copy.rolePlaceholder}
              onChange={(e) => setTitle(e.target.value)}
              className={FIELD}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            {copy.instructionsLabel}
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className={`${FIELD} py-2.5`}
            />
            <span className="text-xs font-normal text-muted">
              {copy.instructionsHint}
            </span>
          </label>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-[13px] font-medium text-foreground">
              {copy.extraTitle}
            </legend>
            <p className="text-xs text-muted">{copy.extraHint}</p>
            <ul className="mt-1 flex flex-col gap-1">
              {SETUP_ROLES.map((role) => (
                <li key={role.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-surface">
                    <input
                      type="checkbox"
                      checked={roleIds.includes(role.id)}
                      onChange={(e) =>
                        setRoleIds((ids) =>
                          e.target.checked
                            ? [...ids, role.id]
                            : ids.filter((id) => id !== role.id),
                        )
                      }
                      className="size-4"
                    />
                    <BotAvatar
                      shape={role.avatarShape}
                      color={role.avatarColor}
                      size="28px"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        {role.name}
                      </span>
                      {role.title && (
                        <span className="block truncate text-xs text-muted">
                          {role.title}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <button
            type="submit"
            disabled={!name.trim()}
            className="min-h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-40"
          >
            {copy.create}
          </button>
        </form>
        <section className="flex flex-col gap-2 rounded-xl border border-border bg-surface/50 px-3.5 py-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium text-foreground">
              {copy.starterKitTitle}
            </h2>
            <p className="text-xs text-muted">{copy.starterKitHint}</p>
          </div>
          <button
            type="button"
            onClick={applyStarterKit}
            className="min-h-10 self-start rounded-full border border-border bg-surface px-4 text-xs font-semibold text-foreground hover:bg-surface-hover"
          >
            {copy.starterKitAction}
          </button>
        </section>
        {/* Someone moving in brings their crew back instead of starting over. */}
        <details className="rounded-xl border border-border px-3 py-2">
          <summary className="min-h-9 cursor-pointer py-1.5 text-sm font-medium text-foreground">
            {copy.restoreTitle}
          </summary>
          <div className="pt-2">
            <BackupSection language={language} />
          </div>
        </details>
      </div>
    </main>
  );
}
