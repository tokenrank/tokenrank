# TokenRank X Leaderboard Design

Date: 2026-06-22
Status: approved direction, pending written-spec review

## Goal

Build a public X-identity leaderboard for AI coding token usage. Users sign in with X, connect a local token usage collector, and appear on public rankings for today, 3 days, 7 days, 30 days, and current month. Each user also gets a public profile/dashboard with activity history, tool/model breakdowns, and shareable X copy.

The product is intentionally lightweight and social. Ranking is for public accountability and fun, not a rigorous audit of AI usage.

## Non-Goals

- Do not upload code, prompts, conversations, or file contents.
- Do not auto-post to X on behalf of users in the MVP.
- Do not depend on the closed-source `opentoken` binary in production.
- Do not try to make cheating impossible. The MVP should make casual cheating inconvenient, detectable, and reversible.
- Do not support every AI coding tool on day one.

## Reference Behavior

The reference site uses a local binary collector, a per-user webhook, daily token aggregation, overwrite-on-resubmit semantics for the same device/day, and public ranking APIs. Its rules state that only token counts are uploaded, not code or conversation content. It also caps counted devices per user and flags suspicious data server-side.

We will copy the product shape, not the implementation dependency.

## Product Scope

### Public Pages

- `/` shows the leaderboard.
- `/rules` explains data collection, ranking rules, privacy, and fair play.
- `/connect` shows the personalized install command after login.
- `/u/[handle]` shows a public dashboard for a user.
- `/me` shows the current user's dashboard and private connection controls.

### Leaderboard

Supported ranges:

- Today
- Last 3 days
- Last 7 days
- Last 30 days
- Current month

Supported boards:

- Total tokens
- Estimated cost
- Tool-specific boards, initially `codex` and `claude-code`

Each row shows rank, X avatar, X display name, X handle, token score, estimated cost, and tool breakdown.

### Personal Dashboard

The dashboard shows:

- Today total and last sync state
- Total tokens, estimated cost, active days
- Contribution-style activity heatmap
- Last 30 days stacked bar chart by tool
- Tool breakdown
- Model breakdown
- Daily detail table
- Share button that opens an X Web Intent

Users can make their dashboard public or hidden. Leaderboard participation remains public once data is submitted unless the user disables ranking.

## Authentication

Use X OAuth 2.0 Authorization Code Flow with PKCE.

The X app configuration must include the production callback URL and local development callback URL. The application stores:

- X user id
- X handle
- Display name
- Avatar URL
- OAuth refresh/access metadata only if needed for profile refresh

MVP sharing uses X Web Intent. It does not require tweet write permissions and does not verify that the user posted the share tweet.

## Data Collection

Build our own collector CLI.

Initial commands:

- `tokenrank connect <webhook-url>` stores the webhook and device id.
- `tokenrank preview --json` prints exactly what would be uploaded.
- `tokenrank upload` scans local logs and posts daily aggregates.
- `tokenrank daemon` runs periodic upload.
- `tokenrank service install` installs launchd on macOS and systemd user timer on Linux.

MVP supported tools:

- Codex
- Claude Code

Later supported tools can include Gemini, opencode, Cline, Roo Code, Kilo Code, OpenClaw, WorkBuddy, and others if their local usage logs are stable enough.

The collector uploads only aggregated rows:

```json
{
  "deviceId": "stable-random-device-id",
  "clientVersion": "0.1.0",
  "timezone": "Asia/Shanghai",
  "generatedAt": "2026-06-22T14:00:00.000Z",
  "entries": [
    {
      "date": "2026-06-22",
      "tool": "codex",
      "model": "gpt-5.5",
      "input": 1000,
      "output": 200,
      "cacheRead": 3000,
      "cacheWrite": 100,
      "total": 4300
    }
  ]
}
```

The server validates payload shape, resolves the user from the webhook token, and upserts per `userId + deviceId + date + tool + model`.

## Database

Use Neon Postgres. The connection string lives only in `.env.local` as `DATABASE_URL`. It must not be committed.

Core tables:

- `users`: X identity, public profile settings, ranking settings.
- `accounts`: auth provider metadata for X.
- `webhook_tokens`: hashed webhook tokens, user id, status, last used timestamp.
- `devices`: user id, stable device id hash, label, first seen, last seen.
- `daily_usage`: user id, device id, date, tool, model, token fields, estimated cost.
- `leaderboard_snapshots`: optional cached ranking results by range/board/date.
- `anomaly_flags`: server-generated flags for suspicious uploads or users.

Primary uniqueness:

- `daily_usage(user_id, device_id, date, tool, model)`
- `devices(user_id, device_id_hash)`
- `webhook_tokens(token_hash)`

## Cost Estimation

Store token counts separately from estimated cost. Cost is derived from a server-side model pricing table and can be recomputed when pricing changes.

For unknown models, use a conservative default price bucket and mark the model as unknown.

## Ranking Rules

For each range and board:

- Include users with ranking enabled.
- Include only non-blocked usage rows.
- For each user, count at most the top 3 devices by total usage in the selected range.
- For total board, score is sum of `total`.
- For cost board, score is sum of estimated cost.
- For tool board, score is sum of rows for that tool.

Same-device uploads overwrite prior rows for the same date/tool/model instead of accumulating duplicates.

## Anti-Cheat

MVP defenses:

- Webhook tokens are long, random, user-scoped, and stored hashed.
- Device ids are generated locally and stored as hashes server-side.
- Same device/day/tool/model uploads are idempotent overwrites.
- Per-user counted devices are capped at 3.
- Server validates payload schema, non-negative integers, reasonable date windows, and supported tool ids.
- Suspicious rows are flagged rather than silently trusted.
- Admin can block rows, devices, or users from ranking.

Initial anomaly signals:

- Daily usage above a hard threshold.
- Large spike versus user's recent median.
- Too many devices in a short time.
- Upload dates far in the past or future.
- Unknown collector version.
- Repeated webhook failures or malformed payloads.

Anti-cheat is probabilistic. The rules page must say the leaderboard is for fun and that obviously fake data can be removed.

## API Shape

Public:

- `GET /api/leaderboard?board=total&range=today`
- `GET /api/boards`
- `GET /api/users/[handle]`

Authenticated:

- `GET /api/me`
- `POST /api/me/public`
- `POST /api/webhook-tokens`
- `DELETE /api/webhook-tokens/[id]`
- `GET /api/devices`
- `PATCH /api/devices/[id]`

Collector:

- `POST /api/collector/upload/[token]`

Admin:

- `GET /api/admin/anomalies`
- `POST /api/admin/anomalies/[id]/resolve`
- `POST /api/admin/users/[id]/ranking-status`

## Frontend Architecture

Use Next.js App Router.

Suggested structure:

- `app/page.tsx`: leaderboard
- `app/rules/page.tsx`: rules
- `app/connect/page.tsx`: install command
- `app/me/page.tsx`: private dashboard
- `app/u/[handle]/page.tsx`: public dashboard
- `app/api/**`: route handlers
- `components/leaderboard/**`
- `components/dashboard/**`
- `lib/db/**`
- `lib/auth/**`
- `lib/ranking/**`
- `lib/collector/**`

Use restrained dashboard styling: dense, readable, and operational. Avoid a marketing landing page; the first screen is the leaderboard.

## Environment

Required local env vars:

- `DATABASE_URL`
- `NEXTAUTH_SECRET` or equivalent session secret
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL`

Add `.env.example` with placeholder keys only.

## Testing

Focused tests:

- Ranking range calculation.
- Top-3-device cap.
- Same-device overwrite behavior.
- Cost calculation.
- Upload validation.
- Webhook token hashing and lookup.
- Public/private dashboard behavior.

Manual verification:

- X login callback works locally.
- `/connect` generates a user-specific command.
- Collector `preview --json` does not include prompt/code content.
- Upload creates or overwrites expected rows.
- Leaderboard updates after upload.
- Dashboard charts render on desktop and mobile.

## Implementation Phases

### Phase 1: Web MVP

- Scaffold Next.js app.
- Configure Neon connection.
- Add auth with X.
- Create database schema.
- Build leaderboard using seeded/mock upload data.
- Build public and private dashboard pages.

### Phase 2: Collector MVP

- Implement collector CLI for Codex and Claude Code.
- Implement upload endpoint.
- Add install script.
- Add service installation for macOS first, Linux second.

### Phase 3: Trust and Sharing

- Add anomaly flags.
- Add admin review surface.
- Add X Web Intent sharing.
- Add public/private profile controls.

## Implementation Choices

Use these choices for the first implementation plan:

- ORM and migrations: Drizzle, because it keeps Postgres access direct and the schema easy to inspect.
- Collector runtime: Node.js first, because speed of iteration matters more than binary polish for MVP. Revisit Rust after the log parsers and upload protocol stabilize.
- Auth library: Auth.js/NextAuth with the X provider and OAuth 2.0 PKCE.
- Pricing table: server-side static pricing table committed as code, with an admin-only path to update prices later. Unknown models use a conservative fallback bucket.

## Deferred Product Choices

These do not block implementation:

- Final app name.
- Production domain.
