import { tokenRankSkillDocument } from "@/src/lib/connect/tokenrank-skill-document";

export const dynamic = "force-static";

export function GET() {
  return new Response(tokenRankSkillDocument, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
