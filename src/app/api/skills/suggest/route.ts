import { handleSuggestSkill } from "../../../../features/skills/suggest-skill-handler.ts";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleSuggestSkill(request, { env: process.env });
}
