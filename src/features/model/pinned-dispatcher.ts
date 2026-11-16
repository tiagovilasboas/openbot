import { isIP, type LookupFunction } from "node:net";
import { normalizeHostname, type PinnedHost } from "./base-url-guard.ts";

/**
 * Connects guarded model calls to the addresses the guard already checked.
 *
 * fetch (undici) resolves the hostname again when it opens a socket; a DNS
 * server could answer with a private address that second time (rebinding).
 * The dispatcher built here replaces that lookup with the pin, so the only
 * DNS answer ever used is the validated one. The URL is untouched, so the
 * Host header and TLS SNI/certificate checks still use the original name.
 */

type Dispatcher = { close(): Promise<void> };
type AgentClass = new (options: {
  connect: { lookup: LookupFunction };
}) => Dispatcher;

const UNDICI_GLOBAL_DISPATCHER = Symbol.for("undici.globalDispatcher.1");
// Keeps keep-alive pools for recent pins; a changed DNS answer is a new key.
const MAX_POOLED_PINS = 8;
const pool = new Map<string, Dispatcher>();

/** A dns.lookup replacement that only ever answers with the pin. */
export function pinnedLookup(pin: PinnedHost): LookupFunction {
  return (hostname, options, callback) => {
    const family =
      options.family === "IPv4"
        ? 4
        : options.family === "IPv6"
          ? 6
          : (options.family ?? 0);
    const records = pin.addresses
      .map((address) => ({ address, family: isIP(address) }))
      .filter((record) => !family || record.family === family);
    process.nextTick(() => {
      if (normalizeHostname(hostname) !== pin.hostname || !records.length) {
        const error = Object.assign(new Error(`no pinned address`), {
          code: "ENOTFOUND",
          hostname,
        });
        callback(error, "", 0);
      } else if (options.all) {
        callback(null, records);
      } else {
        callback(null, records[0].address, records[0].family);
      }
    });
  };
}

/**
 * Node's fetch ships its own undici without exporting `Agent`; the global
 * dispatcher is an instance of it, so its constructor is the Agent class.
 * Returns null when something else (a proxy agent) is installed globally.
 */
function bundledAgentClass(): AgentClass | null {
  const globals = globalThis as Record<symbol, unknown>;
  // Creating a Response loads Node's bundled undici, which installs it.
  if (!globals[UNDICI_GLOBAL_DISPATCHER]) new Response(null);
  const current = globals[UNDICI_GLOBAL_DISPATCHER] as object | undefined;
  const agent = current?.constructor;
  return typeof agent === "function" && agent.name === "Agent"
    ? (agent as AgentClass)
    : null;
}

/** A dispatcher that connects only to the pinned addresses, or null. */
export function pinnedDispatcher(pin: PinnedHost): Dispatcher | null {
  const key = `${pin.hostname}|${pin.addresses.join(",")}`;
  const pooled = pool.get(key);
  if (pooled) {
    pool.delete(key);
    pool.set(key, pooled);
    return pooled;
  }
  const Agent = bundledAgentClass();
  if (!Agent) return null;
  const dispatcher = new Agent({ connect: { lookup: pinnedLookup(pin) } });
  pool.set(key, dispatcher);
  if (pool.size > MAX_POOLED_PINS) {
    const [oldestKey, oldest] = pool.entries().next().value!;
    pool.delete(oldestKey);
    // Graceful: requests still in flight on it finish before it closes.
    oldest.close().catch(() => {});
  }
  return dispatcher;
}
