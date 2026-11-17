import type { BrowserContext } from "@playwright/test";

interface StubGrant {
  botId: string;
  toolName: string;
  grantedAt: number;
}

export interface GrantsStub {
  /** The DELETE bodies received so far. */
  revokes: () => unknown[];
}

/**
 * Stands in for /api/tools/grants per browser context, with the grants given
 * up front. DELETE follows the real contract: one {botId, toolName} or
 * {all: true}, answering the fresh list.
 */
export async function stubGrants(
  context: BrowserContext,
  initial: StubGrant[],
): Promise<GrantsStub> {
  let grants = [...initial];
  const revokes: unknown[] = [];
  await context.route("**/api/tools/grants", async (route) => {
    const request = route.request();
    if (request.method() === "DELETE") {
      const body = request.postDataJSON() as Partial<StubGrant> & {
        all?: boolean;
      };
      revokes.push(body);
      grants = body.all
        ? []
        : grants.filter(
            (g) => !(g.botId === body.botId && g.toolName === body.toolName),
          );
    }
    await route.fulfill({ json: { grants } });
  });
  return { revokes: () => revokes };
}
