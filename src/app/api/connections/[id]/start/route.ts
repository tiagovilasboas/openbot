import { startConnect } from "../../../../../features/connections/server/index.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return startConnect(request, (await params).id);
}
