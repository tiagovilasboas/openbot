import {
  MEMORY_MAX_ENTRY_LENGTH,
  normalizeMemoryText,
} from "../memory/memory-entries.ts";

/** A leading "no," / "não," that often introduces a correction. */
const NEGATION = "(?:(?:no|não|nao|nope)[\\s,.!:;-]+)?";

/**
 * How a person words a lasting preference in pt, en and es. Each cue must
 * open the message, so a question or a passing remark never matches.
 */
const CUES = [
  // pt
  "prefiro",
  "sempre",
  "nunca",
  "a partir de agora",
  "daqui pra frente",
  "n[ãa]o (?:use|usa|escreva|coloque|fa[çc]a|fale|diga|seja|quero)",
  "pare de|para de",
  // en
  "i prefer",
  "i'd rather",
  "always",
  "never",
  "from now on",
  "(?:please )?(?:do not|don't|dont) (?:use|write|add|include|say|make|be|call)",
  "stop (?:using|writing|adding|saying|being)",
  // es
  "prefiero",
  "siempre",
  "de ahora en adelante",
  "no (?:uses|escribas|pongas|hagas|digas|seas|quiero)",
  "deja de",
];

const CUE = new RegExp(`^${NEGATION}(?:${CUES.join("|")})(?![\\p{L}])`, "iu");

/**
 * The preference a message states, as the line to remember, or null when it
 * is not one. Deterministic: no model runs. The person's own words are
 * kept, so the saved note is their data, never the bot's paraphrase.
 */
export function detectPreference(message: string): string | null {
  const text = normalizeMemoryText(message);
  if (!text || text.length > MEMORY_MAX_ENTRY_LENGTH) return null;
  if (text.endsWith("?")) return null;
  return CUE.test(text) ? text : null;
}
