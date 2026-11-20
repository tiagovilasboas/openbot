// Turns what an MCP server says about a tool into what the tool loop and the
// model accept. Everything here comes from outside and is untrusted.
import type { JsonSchemaLite } from "../model/tool-wire.ts";

export const MCP_PREFIX = "mcp__";
/** Providers cap tool names at 64 characters. */
export const TOOL_NAME_MAX = 64;
export const MCP_DESCRIPTION_MAX = 1_000;
const SCHEMA_MAX_DEPTH = 6;
const SCHEMA_MAX_PROPERTIES = 64;

const TYPES = new Set<JsonSchemaLite["type"]>([
  "object",
  "string",
  "number",
  "integer",
  "boolean",
  "array",
]);

/** mcp__<server>__<tool>, with characters providers reject replaced. */
export function qualifiedToolName(server: string, tool: string): string | null {
  const clean = tool.replace(/[^A-Za-z0-9_-]/g, "_");
  const name = `${MCP_PREFIX}${server}__${clean}`;
  return clean && name.length <= TOOL_NAME_MAX ? name : null;
}

export function isMcpToolName(name: string): boolean {
  return name.startsWith(MCP_PREFIX);
}

/** One line of plain text, capped: a description cannot carry markup or tags. */
export function cleanDescription(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MCP_DESCRIPTION_MAX);
}

function lite(raw: unknown, depth: number): JsonSchemaLite {
  if (typeof raw !== "object" || raw === null || depth > SCHEMA_MAX_DEPTH) {
    return { type: "string" };
  }
  const v = raw as Record<string, unknown>;
  const declared = Array.isArray(v.type)
    ? v.type.find((t) => t !== "null")
    : v.type;
  const type = TYPES.has(declared as JsonSchemaLite["type"])
    ? (declared as JsonSchemaLite["type"])
    : "string";
  const out: JsonSchemaLite = { type };
  const description = cleanDescription(v.description);
  if (description) out.description = description;
  if (Array.isArray(v.enum)) {
    const values = v.enum.filter(
      (e): e is string | number =>
        typeof e === "string" || typeof e === "number",
    );
    if (values.length) out.enum = values.slice(0, 100);
  }
  if (typeof v.maxLength === "number") out.maxLength = v.maxLength;
  if (type === "array") out.items = lite(v.items, depth + 1);
  if (type === "object") {
    const props =
      typeof v.properties === "object" && v.properties !== null
        ? Object.entries(v.properties as Record<string, unknown>).slice(
            0,
            SCHEMA_MAX_PROPERTIES,
          )
        : [];
    out.properties = Object.fromEntries(
      props.map(([key, value]) => [key, lite(value, depth + 1)]),
    );
    if (Array.isArray(v.required)) {
      out.required = v.required.filter(
        (r): r is string => typeof r === "string" && r in out.properties!,
      );
    }
  }
  return out;
}

/** The tool's input schema in the subset the model sees; always an object. */
export function liteInputSchema(raw: unknown): JsonSchemaLite {
  const schema = lite(raw, 0);
  return schema.type === "object" ? schema : { type: "object", properties: {} };
}

/** The text of a tools/call result: text parts only, others named. */
export function resultText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part !== "object" || part === null) return "";
      const p = part as Record<string, unknown>;
      if (p.type === "text" && typeof p.text === "string") return p.text;
      return typeof p.type === "string" ? `[${p.type} content]` : "";
    })
    .filter(Boolean)
    .join("\n");
}
