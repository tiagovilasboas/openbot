import { handleChatStream } from "../../../../features/model/stream-chat-handler.ts";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleChatStream(request, { env: process.env });
}
