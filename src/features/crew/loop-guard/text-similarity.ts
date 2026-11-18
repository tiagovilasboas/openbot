// Text normalization and similarity for the crew loop guard. Pure: no imports.

/** Lowercase, strip accents and punctuation, split into word tokens. */
export function tokenize(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter((token) => token.length > 0);
}

/** Token-set Jaccard similarity in [0, 1]. Two empty texts are not similar. */
export function jaccard(a: readonly string[], b: readonly string[]): number {
  const left = new Set(a);
  const right = new Set(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared / (left.size + right.size - shared);
}

/** Below this many distinct tokens, only an exact normalized match counts. */
const MIN_TOKENS_FOR_FUZZY = 4;

/**
 * Whether two texts say the same thing: identical after normalization, or
 * (for texts long enough) token Jaccard at or above `threshold`.
 */
export function isNearDuplicate(
  a: string,
  b: string,
  threshold: number,
): boolean {
  const left = tokenize(a);
  const right = tokenize(b);
  if (left.length === 0 || right.length === 0) return false;
  if (left.join(" ") === right.join(" ")) return true;
  const distinct = Math.min(new Set(left).size, new Set(right).size);
  if (distinct < MIN_TOKENS_FOR_FUZZY) return false;
  return jaccard(left, right) >= threshold;
}
