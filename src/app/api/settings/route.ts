import {
  handleGetSettings,
  handlePutSettings,
} from "../../../features/settings/server/settings-handler.ts";
import { getLocalStore } from "../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function GET() {
  return handleGetSettings(getLocalStore());
}

export function PUT(request: Request) {
  return handlePutSettings(request, getLocalStore());
}
