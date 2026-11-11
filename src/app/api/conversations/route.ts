import {
  handleDeleteConversation,
  handleGetConversations,
  handlePutConversation,
} from "../../../features/conversations/server/conversations-handler.ts";
import { getLocalStore } from "../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleGetConversations(request, getLocalStore());
}

export function PUT(request: Request) {
  return handlePutConversation(request, getLocalStore());
}

export function DELETE(request: Request) {
  return handleDeleteConversation(request, getLocalStore());
}
