"use client";

import { useEffect, useState } from "react";
import type { ChatLanguage } from "../../chat/respond-to-message.ts";
import { TOOL_LEVELS, type ToolLevel } from "../tool-policy.ts";
import { fetchLevels, saveLevel, type ToolLevelEntry } from "./levels-api.ts";
import { levelsCopy } from "./levels-copy.ts";
import { toolLabel } from "./tools-copy.ts";

// Native radios give arrow-key navigation for free; the label is the 44px target.
const OPTION =
  "flex min-h-11 min-w-11 flex-1 cursor-pointer items-center justify-center rounded-full px-3 text-[15px] font-medium text-subtle transition-colors has-[:checked]:bg-surface-tertiary has-[:checked]:text-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--bot-accent)has-[:disabled]:opacity-40 md:text-sm";

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

  async function choose(name: string, level: ToolLevel) {
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
    <section aria-labelledby="levels-title" className="flex flex-col gap-3">
      <div>
        <h3 id="levels-title" className="text-[15px] font-semibold">
          {copy.title}
        </h3>
        <p className="text-[13px] text-subtle">{copy.description}</p>
      </div>

      {failure && (
        <p role="alert" className="text-[13px] text-danger">
          {failure === "load" ? copy.loadFailed : copy.actionFailed}
        </p>
      )}

      {tools && (
        <ul className="flex flex-col gap-2">
          {tools.map((tool) => (
            <li key={tool.name} className="rounded-2xl bg-surface px-4 py-2">
              <fieldset
                disabled={busy}
                className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
              >
                <legend className="sr-only">
                  {toolLabel(tool.name, language)}
                </legend>
                <div className="min-w-0">
                  <p aria-hidden="true" className="text-[15px] font-medium">
                    {toolLabel(tool.name, language)}
                  </p>
                  {!tool.canAllow && (
                    <p className="text-[13px] text-subtle">
                      {copy.noAllowHint}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 md:w-72">
                  {TOOL_LEVELS.filter(
                    (level) => level !== "allow" || tool.canAllow,
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
