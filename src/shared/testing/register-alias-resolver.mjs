import { register } from "node:module";

const srcHref = new URL("../../", import.meta.url).href;

const hooks = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const rest = specifier.slice(2);
    const file = /\\.[cm]?[jt]sx?$/.test(rest) ? rest : rest + ".ts";
    return nextResolve(new URL(file, ${JSON.stringify(srcHref)}).href, context);
  }
  return nextResolve(specifier, context);
}
`;

/**
 * Test-only: lets the node runner load modules that import through the
 * Next.js "@/" alias, so route handlers can be imported unchanged.
 */
register(`data:text/javascript,${encodeURIComponent(hooks)}`);
