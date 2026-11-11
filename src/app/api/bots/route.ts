import {
  handleGetBots,
  handlePutBots,
} from "../../../features/bots/server/bots-handler.ts";
import { getLocalStore } from "../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function GET() {
  return handleGetBots(getLocalStore());
}

export function PUT(request: Request) {
  return handlePutBots(request, getLocalStore());
}
