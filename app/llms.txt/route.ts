import { absoluteUrl, siteDescription, siteName } from "@/src/lib/site";

export const dynamic = "force-static";

export function GET() {
  const body = [
    `# ${siteName}`,
    "",
    `> ${siteDescription}`,
    "",
    "TokenRank is a public leaderboard for aggregate token usage across supported AI agents and tools. It shows who is putting AI to work without exposing prompts, source code, chats, filenames, or file contents.",
    "",
    "## Core Pages",
    "",
    `- [Leaderboard](${absoluteUrl("/")}) - Public ranking by total tokens, estimated cost, and individual AI agents and tools.`,
    `- [How TokenRank works](${absoluteUrl("/#how-it-works")}) - Three-step explanation of identity, local aggregation, and ranking.`,
    `- [FAQ](${absoluteUrl("/#faq")}) - Direct answers about measurement, privacy, supported tools, deduplication, and joining.`,
    `- [Rules](${absoluteUrl("/rules")}) - Privacy, fair-play, and scoring rules.`,
    `- [Onboarding](${absoluteUrl("/onboard")}) - Login, collector setup, first upload, and dashboard handoff flow.`,
    "",
    "## Machine-Readable Endpoints",
    "",
    `- [Boards API](${absoluteUrl("/api/boards")}) - Supported leaderboard boards and tool keys.`,
    `- [Leaderboard API](${absoluteUrl("/api/leaderboard")}) - Public leaderboard data with board and range query parameters.`,
    "",
    "## Privacy Boundary",
    "",
    "The collector sends only aggregate rows: date, tool, model, input tokens, output tokens, cache read tokens, cache write tokens, and totals. Raw prompts, code, conversations, filenames, and file contents are intentionally excluded.",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
