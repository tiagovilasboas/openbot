import { handleDownloadWorkspaceFile } from "../../../../features/workspace/server/workspace-handler.ts";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleDownloadWorkspaceFile(request);
}
