import type { DatabaseSync } from "node:sqlite";
import {
  noKeyLookup,
  withVaultKeys,
  type KeyLookup,
} from "../../../key-vault/apply-vault-keys.ts";
import type { FetchLike } from "../../../model/model-adapter.ts";
import { selectAdapter } from "../../../model/select-adapter.ts";
import { createStreamSignal } from "../../../model/stream-signal.ts";
import { readSettings } from "../../../settings/server/settings-repository.ts";
import type { ToolRegistry } from "../../../tools/tool-registry.ts";
import { loadMcpTools } from "../../../mcp/server/mcp-tools.ts";
import { toolsGateOn } from "../../../tools/server/parse-tool-turn.ts";
import {
  catalogCapability,
  type CapabilityLookup,
} from "../../../tools/server/resolve-tool-capability.ts";
import { runBotToolsText } from "../../../tools/server/run-bot-tools-text.ts";
import { serverToolRegistry } from "../../../tools/server/server-tools.ts";
import { createToolStep } from "../../../tools/server/tool-step.ts";
import { externalDataRule } from "../../../untrusted-text/wrap-external-text.ts";
import type { AskCrewModel } from "../../run-crew-turn.ts";
import { NEEDS_APPROVAL } from "./group-tools-copy.ts";
import { buildChannelRequest } from "./model-channel-asker.ts";

export type ToolChannelAskerOptions = {
  env?: Readonly<Record<string, string | undefined>>;
  keyLookup?: KeyLookup;
  fetchImpl?: FetchLike;
  tools?: ToolRegistry;
  capabilityOf?: CapabilityLookup;
  timeoutMs?: number;
  now?: () => number;
};

/**
 * A group member's model call with its tools. A member that opted into tools
 * (with the server's OPENBOT_TOOLS gate on) runs the same tool loop as a 1:1
 * chat, with its own grants and the user's levels; every other call, such as
 * the picker, goes to `plain`. A call that needs the user's approval does not
 * run: the member says so and points to a 1:1 chat.
 */
export function createToolChannelAsker(
  db: DatabaseSync,
  plain: AskCrewModel,
  options: ToolChannelAskerOptions = {},
): AskCrewModel {
  const env = options.env ?? process.env;
  return async (call) => {
    const { speaker } = call;
    if (!speaker?.toolsEnabled || !toolsGateOn(env)) return plain(call);
    const parsed = buildChannelRequest(db, env, call);
    if (!parsed) return { ok: false };
    const request = withVaultKeys(parsed, options.keyLookup ?? noKeyLookup);
    const primary = selectAdapter(env, request.config, options.fetchImpl);
    if (!primary) return { ok: false };
    const capability = await (options.capabilityOf ?? catalogCapability)(
      request.config,
      request.modelId,
      env,
    ).catch(() => "none" as const);
    const signal = createStreamSignal([], options.timeoutMs);
    const rule = externalDataRule(request.language);
    const step = createToolStep({
      request: {
        ...request,
        systemPrompt: request.systemPrompt
          ? `${request.systemPrompt}\n\n${rule}`
          : rule,
      },
      primary,
      fallback: request.fallbackConfig
        ? selectAdapter(env, request.fallbackConfig, options.fetchImpl)
        : null,
      env,
      fetchImpl: options.fetchImpl,
      signal,
      capability,
      onToolsUnavailable: () => undefined,
    });
    const result = await runBotToolsText({
      db,
      botId: speaker.id,
      tools:
        options.tools ??
        serverToolRegistry({
          db,
          fetchImpl: options.fetchImpl,
          githubToken: env.GITHUB_TOKEN,
          workspaceRoot: env.OPENBOT_WORKSPACE_DIR,
          extraTools: await loadMcpTools(env),
        }),
      step,
      signal,
      ...(options.now ? { now: options.now } : {}),
    });
    if (result.kind === "text") return { ok: true, text: result.text };
    if (result.kind === "failed") return { ok: false };
    const language = readSettings(db).language ?? "pt";
    return { ok: true, text: NEEDS_APPROVAL[language](result.tools) };
  };
}
