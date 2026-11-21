import { handleStopChannel } from "../../../../../features/crew/channel/server/channel-messages-handler.ts";
import { getLocalStore } from "../../../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleStopChannel(request, getLocalStore());
}
