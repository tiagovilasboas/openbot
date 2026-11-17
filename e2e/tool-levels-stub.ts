import type { BrowserContext } from "@playwright/test";

type Level = "ask" | "allow" | "block";

interface StubTool {
  name: string;
  level: Level;
  canAllow: boolean;
}

export interface LevelsStub {
  /** The PUT bodies received so far. */
  puts: () => unknown[];
}

/**
 * Stands in for /api/tools/levels per browser context. PUT follows the real
 * contract: {toolName, level}, answering the fresh list, and refusing allow
 * for a tool that cannot be allowed.
 */
export async function stubLevels(
  context: BrowserContext,
  initial: StubTool[],
): Promise<LevelsStub> {
  const tools = initial.map((tool) => ({ ...tool }));
  const puts: unknown[] = [];
  await context.route("**/api/tools/levels", async (route) => {
    const request = route.request();
    if (request.method() === "PUT") {
      const body = request.postDataJSON() as { toolName: string; level: Level };
      puts.push(body);
      const tool = tools.find((item) => item.name === body.toolName);
      if (!tool || (body.level === "allow" && !tool.canAllow)) {
        await route.fulfill({ status: 400, json: { error: "invalid" } });
        return;
      }
      tool.level = body.level;
    }
    await route.fulfill({ json: { tools } });
  });
  return { puts: () => puts };
}
