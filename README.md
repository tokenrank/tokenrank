<p align="right">
  <strong>English</strong> · <a href="./README.zh-CN.md">Chinese</a>
</p>

<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="TokenRank turns local aggregate AI usage into server-checked public rankings while prompts, code, and chats stay on the device">
</p>

<p align="center">
  <a href="https://tokenrank.org"><strong>Live leaderboard</strong></a> ·
  <a href="https://tokenrank.org/onboard">Join the board</a> ·
  <a href="https://tokenrank.org/rules">Scoring and privacy</a> ·
  <a href="https://github.com/tokenrank/tokenrank-cli">Collector CLI</a>
</p>

TokenRank is a public AI token usage leaderboard. It connects aggregate activity from coding agents and AI tools to a public X identity, then lets people compare ranks across time windows and tools.

> **Trust level: Local aggregate / server checked.** TokenRank validates upload structure, account ownership, token totals, and duplicate keys, but does not reconcile data with provider bills. The leaderboard is an activity signal—not a measure of ability, productivity, or work quality. Cost figures are estimates, not invoices.

## See the product

<p align="center">
  <a href="https://tokenrank.org/onboard">
    <img src="./assets/readme/product-preview.png" width="100%" alt="TokenRank English onboarding experience with a local preview command and four-stage ranking flow">
  </a>
</p>

The public product includes:

- Overall, Spend, and per-tool leaderboards;
- Today UTC, 3D, 7D, 30D, and Month windows;
- public profiles with rank context, trends, heatmaps, tool mix, and model mix;
- published scoring, privacy, trust, and anomaly-handling rules.

## Join in three steps

### 1. Preview locally

No account is required and nothing is uploaded:

```bash
npx --yes tokenrank preview
```

### 2. Connect a public identity

Open [tokenrank.org/onboard](https://tokenrank.org/onboard), sign in with X, and generate a private upload URL for your account.

### 3. Complete the first sync

Onboarding provides a one-line installer for your platform. After the first successful upload, the collector can register an hourly background sync:

```bash
tokenrank service install
tokenrank status
```

Collector source code, installers, and releases live in the separate [tokenrank/tokenrank-cli](https://github.com/tokenrank/tokenrank-cli) repository.

## How data moves

1. **Collect locally** — the CLI reads exact token records from supported AI tools and aggregates them by UTC date, tool, and model on the device.
2. **Upload privately** — only aggregate rows are sent to the account's private webhook.
3. **Check on the server** — the Web service validates fields, account ownership, totals, batches, and duplicate keys, then applies the published ranking rules.
4. **Publish selectively** — only profiles that are public and opted into the leaderboard appear in public results.

| Uploaded | Never uploaded |
| --- | --- |
| UTC date, tool, and model | Prompts and chat content |
| Input, output, cache, and total tokens | Source code, filenames, and file contents |
| Anonymous device ID, CLI version, timezone, and generation time | Provider credentials and raw local logs |

See [Scoring and privacy rules](https://tokenrank.org/rules) for the complete policy.

## Web and CLI boundaries

| Repository | Owns | Does not own |
| --- | --- | --- |
| **tokenrank/tokenrank** | X identity, webhooks, upload API, server validation, leaderboards, dashboard | Scanning local AI tool logs or installing background jobs |
| **tokenrank/tokenrank-cli** | Local collection, aggregation, preview, upload, cross-platform scheduling, CLI releases | User authentication, database storage, or leaderboard pages |

The repositories communicate only through the `GET/POST /api/collector/upload/:token` identity and payload contract. The CLI may release source adapters independently; the Web service must accept new tool keys or payload fields before the CLI sends them.

## Local development

The app uses Next.js, React, Drizzle, Neon Postgres, and Cloudflare Workers. Node.js and pnpm are required.

```bash
pnpm install
pnpm dev --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000`. Without `DATABASE_URL`, the homepage falls back to an empty leaderboard for local rendering and e2e work. Authentication, uploads, the dashboard, and real leaderboard data still require a database.

### Environment variables

```bash
DATABASE_URL=
AUTH_X_ID=
AUTH_X_SECRET=
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
```

The X Developer callback URL must match the local origin:

```text
http://127.0.0.1:3000/api/auth/callback/twitter
```

`NEXT_PUBLIC_APP_URL` also drives the canonical URL, `robots.txt`, `sitemap.xml`, `llms.txt`, and the install scripts' default service URL.

### Verification

```bash
pnpm lint
pnpm test
pnpm build
pnpm e2e
```

## Public routes

| Route | Purpose |
| --- | --- |
| `/` | Public leaderboard, filters, current leader, and sharing |
| `/rules` | Scoring, trust, privacy, and anomaly rules |
| `/onboard` | Local preview, identity connection, installation, and first upload |
| `/dashboard` | Private activity, upload status, and public settings |
| `/u/[handle]` | Public profile and rank challenge link |
| `/api/boards` | Available leaderboards and tool keys |
| `/api/leaderboard` | Public leaderboard data |
| `/llms.txt` | Product and endpoint summary for AI crawlers |

<details>
<summary><strong>Brand and internationalization</strong></summary>

- English is the default interface; visitors can switch to Chinese. The preference is stored in the `tokenrank_locale` cookie.
- English and Chinese product copy is maintained in `src/i18n/copy.ts`.
- Antonio Variable and IBM Plex Sans Variable are self-hosted in the repository.
- The visual system uses bone black `#070907`, signal lime `#D6FF3F`, warning orange `#FF5B35`, and cyan `#67E8E2`.
- After changing the icon generator, run `pnpm icons:generate` to rebuild favicon, PWA, and pinned-tab assets.

</details>

<details>
<summary><strong>Demo data safety boundary</strong></summary>

Built-in `demo_` users exist only for explicit local visual development and are excluded from public leaderboards, public profiles, and the sitemap by default. Set `TOKENRANK_ALLOW_DEMO_SEED=1` in the current non-production shell before writing demo data, and set `TOKENRANK_SHOW_DEMO_DATA=1` only when the local UI needs to display it. Production environments and configurations pointing to `tokenrank.org` reject demo seeding.

</details>

<details>
<summary><strong>Cloudflare Workers deployment</strong></summary>

Production runs on a Cloudflare Worker named `tokenrank` through `@opennextjs/cloudflare`; `wrangler.jsonc` binds `tokenrank.org`.

```bash
pnpm run cf:build
pnpm run cf:preview
pnpm run cf:deploy
```

Production requires `DATABASE_URL`, `AUTH_SECRET`, `AUTH_X_ID`, and `AUTH_X_SECRET`. After the production database contains its first v2 row, the Web release containing migration `0006` is the earliest rollback baseline. Do not roll back to a pre-v2 Worker; preserve a database snapshot and forward-fix instead.

</details>

## Contributing and license

Please use [GitHub Issues](https://github.com/tokenrank/tokenrank/issues) for bugs and proposals. TokenRank is released under the [MIT License](LICENSE).
