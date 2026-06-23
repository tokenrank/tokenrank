# TokenRank

Public X identity leaderboard for AI coding token usage.

## Development

```bash
pnpm install
pnpm dev --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000`.

Required local environment:

```bash
DATABASE_URL=
AUTH_X_ID=
AUTH_X_SECRET=
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
```

The X developer callback URL must match:

```text
http://127.0.0.1:3000/api/auth/callback/twitter
```

## Collector CLI

The local CLI accepts aggregate token rows only. It does not upload prompts, code, or conversation content.

```bash
pnpm tokenrank tools
pnpm tokenrank sources
pnpm tokenrank preview --json
pnpm tokenrank connect "https://your-site.example/api/collector/upload/secret"
pnpm tokenrank upload
pnpm tokenrank service install --interval 300
pnpm tokenrank service status
pnpm tokenrank service uninstall
pnpm tokenrank logout
pnpm tokenrank upload --file usage.json
```

Without `--file`, `upload` scans the known local tool log locations and uploads aggregate rows. Use `preview --json` first to inspect the exact aggregate payload. Large uploads are split into 500-row batches to match the server API limit.

`usage.json` can be either an array of entries or an object with `entries`.

```json
{
  "entries": [
    {
      "date": "2026-06-23",
      "tool": "codex",
      "model": "gpt-5.5",
      "input": 100,
      "output": 50,
      "cacheRead": 200,
      "cacheWrite": 10
    }
  ]
}
```

Supported tools: `codex`, `claude-code`, `hermes`, `openclaw`, `cline`, `opencode`, `workbuddy`, `gemini`, `zcode`, `kimi`, `kilo-code`, `codex-vps`, `roo-code`, `qwen`, `codex-cache`.

Current automatic scanning supports JSON, JSONL, SQLite, and DB files. It skips raw prompt/code/content fields and queries only token/date/model columns from SQLite.

## Verification

```bash
pnpm test
pnpm build
pnpm e2e
```
