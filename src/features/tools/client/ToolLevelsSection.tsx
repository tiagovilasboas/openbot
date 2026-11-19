"use client";

import { useEffect, useState } from "react";
import type { ChatLanguage } from "../../chat/respond-to-message.ts";
import { TOOL_LEVELS, type ToolLevel } from "../tool-policy.ts";
import { fetchLevels, saveLevel, type ToolLevelEntry } from "./levels-api.ts";
import { levelsCopy } from "./levels-copy.ts";
import { toolLabel } from "./tools-copy.ts";

// Native radios give arrow-key navigation for free; the label is the 40px target.
const OPTION =
  "flex min-h-10 min-w-10 flex-1 cursor-pointer items-center justify-center rounded-full px-3 text-sm font-medium text-subtle transition-colors has-[:checked]:bg-surface-tertiary has-[:checked]:text-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--bot-accent)";

/**
 * One level per tool, for every bot: ask, allow or block. The levels live on
 * the server, where the tool turn reads them on every call. A tool that does
 * not opt in to running without asking is not offered "allow".
 */
export function ToolLevelsSection({ language }: { language: ChatLanguage }) {
  const copy = levelsCopy[language];
  const [tools, setTools] = useState<ToolLevelEntry[] | null>(null);
  const [failure, setFailure] = useState<"load" | "action" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    void fetchLevels().then((list) => {
      if (!current) return;
      setTools(list);
      setFailure(list ? null : "load");
    });
    return () => {
      current = false;
    };
  }, []);

  // The radios stay enabled while a save is out, so keyboard focus is kept;
  // a second change is ignored until the first one answers.
  async function choose(name: string, level: ToolLevel) {
    if (busy) return;
    setBusy(true);
    const list = await saveLevel(name, level);
    setBusy(false);
    if (list) {
      setTools(list);
      setFailure(null);
    } else {
      setFailure("action");
    }
  }

  return (
    <section
      aria-labelledby="levels-title"
      className="flex flex-col gap-2 md:gap-3"
    >
      <div>
        <h3 id="levels-title" className="text-sm font-semibold md:text-[15px]">
          {copy.title}
        </h3>
        <p className="text-xs text-subtle md:text-[13px]">{copy.description}</p>
      </div>

      {failure && (
        <p role="alert" className="text-[13px] text-danger">
          {failure === "load" ? copy.loadFailed : copy.actionFailed}
        </p>
      )}

      {tools && (
        <ul className="flex flex-col gap-1.5 md:gap-2">
          {tools.map((tool) => (
            <li
              key={tool.name}
              className="rounded-2xl bg-surface px-3 py-2 md:px-4"
            >
              <fieldset
                aria-busy={busy}
                className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between md:gap-2"
              >
                <legend className="sr-only">
                  {toolLabel(tool.name, language)}
                </legend>
                <div className="min-w-0">
                  <p
                    aria-hidden="true"
                    className="text-sm font-medium md:text-[15px]"
                  >
                    {toolLabel(tool.name, language)}
                  </p>
                  {!tool.canAllow && (
                    <p className="text-xs text-subtle md:text-[13px]">
                      {copy.noAllowHint}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 rounded-full bg-background p-0.5 md:w-72">
                  {TOOL_LEVELS.filter(
                    (level) =>
                      (level !== "allow" || tool.canAllow) &&
                      (level !== "ask" || tool.canAsk),
                  ).map((level) => (
                    <label key={level} className={OPTION}>
                      <input
                        type="radio"
                        name={`level-${tool.name}`}
                        value={level}
                        checked={tool.level === level}
                        onChange={() => void choose(tool.name, level)}
                        className="sr-only"
                      />
                      {copy.levels[level]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
