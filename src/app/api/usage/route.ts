import {
  handleDeleteUsage,
  handleGetUsage,
  handlePutUsage,
} from "../../../features/usage/server/usage-handler.ts";
import { getLocalStore } from "../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function GET() {
  return handleGetUsage(getLocalStore());
}

export function PUT(request: Request) {
  return handlePutUsage(request, getLocalStore());
}

export function DELETE() {
  return handleDeleteUsage(getLocalStore());
}
