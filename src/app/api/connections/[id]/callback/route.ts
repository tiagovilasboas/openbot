import { finishConnect } from "../../../../../features/connections/server/index.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return finishConnect(request, (await params).id);
}
