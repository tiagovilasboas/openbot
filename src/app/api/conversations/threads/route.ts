import {
  handleGetThreadIndex,
  handlePutThreadIndex,
} from "../../../../features/conversations/server/thread-index-handler.ts";
import { getLocalStore } from "../../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleGetThreadIndex(request, getLocalStore());
}

export function PUT(request: Request) {
  return handlePutThreadIndex(request, getLocalStore());
}
