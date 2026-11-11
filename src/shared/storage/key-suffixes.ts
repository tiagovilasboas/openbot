/** The slice of Storage that lets a module list its own keys. */
export type KeyListingStorage = Pick<Storage, "key" | "length">;

/** The part after `prefix` of every stored key that starts with it. */
export function keySuffixes(
  storage: KeyListingStorage | undefined,
  prefix: string,
): string[] {
  const suffixes: string[] = [];
  try {
    for (let i = 0; storage && i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key?.startsWith(prefix) && key.length > prefix.length) {
        suffixes.push(key.slice(prefix.length));
      }
    }
  } catch {
    // Blocked storage lists nothing.
  }
  return suffixes;
}
