import { handleIntegrationsStatus } from "../../../../features/integrations/server/integrations-status.ts";

export const dynamic = "force-dynamic";

export function GET() {
  return handleIntegrationsStatus();
}
