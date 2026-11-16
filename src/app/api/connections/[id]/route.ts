import {
  connectionStatus,
  disconnect,
} from "../../../../features/connections/server/index.ts";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  return connectionStatus((await params).id);
}

export async function DELETE(_request: Request, { params }: Context) {
  return disconnect((await params).id);
}
