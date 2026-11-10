/** Extensions that are plain text, whatever the browser reports as the type. */
const TEXT_EXTENSIONS = new Set(
  "txt md markdown json csv tsv log ts tsx js jsx mjs cjs py go rs java kt swift rb php c h cpp hpp cs sh sql yml yaml toml ini env xml html htm css scss vue svelte".split(
    " ",
  ),
);

/** Files without an extension that are known to be text. */
const TEXT_NAMES = new Set(["dockerfile", "makefile", "readme", "license"]);

const TEXT_MIME =
  /^(text\/|application\/(json|xml|x-yaml|yaml|toml|javascript|typescript|x-sh))/i;

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

/**
 * Whether a file looks like text by its name and reported type. This is only
 * the first gate: the bytes are still checked after the file is read.
 */
export function looksLikeTextFile(name: string, mimeType: string): boolean {
  const extension = extensionOf(name);
  if (extension) {
    return TEXT_EXTENSIONS.has(extension) || TEXT_MIME.test(mimeType);
  }
  return TEXT_NAMES.has(name.toLowerCase()) || TEXT_MIME.test(mimeType);
}

/** The `accept` of the file picker: a hint to the OS, checked again on read. */
export const TEXT_FILE_ACCEPT = [...TEXT_EXTENSIONS]
  .map((extension) => `.${extension}`)
  .concat("text/*")
  .join(",");
