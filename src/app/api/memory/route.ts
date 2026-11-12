import {
  handleDeleteMemory,
  handleGetMemory,
  handlePutMemory,
} from "../../../features/memory/server/memory-handler.ts";
import { getLocalStore } from "../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleGetMemory(request, getLocalStore());
}

export function PUT(request: Request) {
  return handlePutMemory(request, getLocalStore());
}

export function DELETE(request: Request) {
  return handleDeleteMemory(request, getLocalStore());
}
