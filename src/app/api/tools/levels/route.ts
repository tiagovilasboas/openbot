import {
  handleGetLevels,
  handlePutLevel,
} from "../../../../features/tools/server/levels-handler.ts";
import { serverToolRegistry } from "../../../../features/tools/server/server-tools.ts";
import { loadMcpTools } from "../../../../features/mcp/server/mcp-tools.ts";
import { getLocalStore } from "../../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

async function registry() {
  const db = getLocalStore();
  const tools = serverToolRegistry({
    db,
    workspaceRoot: process.env.OPENBOT_WORKSPACE_DIR,
    extraTools: await loadMcpTools(process.env),
  });
  return { db, tools };
}

export async function GET() {
  const { db, tools } = await registry();
  return handleGetLevels(db, tools);
}

export async function PUT(request: Request) {
  const { db, tools } = await registry();
  return handlePutLevel(request, db, tools);
}
