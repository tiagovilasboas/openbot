import { scanLocalServers } from "../../../../features/model/local-server-scan.ts";

export const dynamic = "force-dynamic";

/** Which local model servers (Ollama, LM Studio) answer on this machine. */
export async function GET() {
  return Response.json(await scanLocalServers());
}
