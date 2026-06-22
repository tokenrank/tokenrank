# TokenRank Web MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Next.js web MVP for the public X-identity token leaderboard, backed by Neon Postgres and ready for a later collector CLI.

**Architecture:** The app uses Next.js App Router with server components by default, Auth.js/NextAuth for X OAuth, Drizzle for Neon Postgres, pure ranking/validation modules with tests, and route handlers for public leaderboard/profile APIs plus authenticated connection controls. Phase 1 includes the collector upload API contract and seeded data so the site is usable before the real collector is built.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Drizzle ORM, Neon Postgres, Auth.js/NextAuth, Zod, Vitest, Playwright, pnpm.

---

## Scope Split

This plan implements Phase 1 from the approved spec: the web MVP. It intentionally does not build the standalone local collector binary. A later plan should implement the Node.js collector CLI against the upload contract created here.

## Reference Documents

- Spec: `docs/superpowers/specs/2026-06-22-tokenrank-x-leaderboard-design.md`
- Next.js App Router docs: https://nextjs.org/docs/app
- Auth.js provider docs: https://authjs.dev/getting-started/providers/twitter
- Drizzle Neon docs: https://orm.drizzle.team/docs/connect-neon

## File Structure

Create this project structure:

```text
app/
  api/
    auth/[...nextauth]/route.ts
    boards/route.ts
    collector/upload/[token]/route.ts
    leaderboard/route.ts
    me/route.ts
    users/[handle]/route.ts
    webhook-tokens/route.ts
  connect/page.tsx
  layout.tsx
  me/page.tsx
  page.tsx
  rules/page.tsx
  u/[handle]/page.tsx
components/
  dashboard/activity-heatmap.tsx
  dashboard/daily-bars.tsx
  dashboard/usage-dashboard.tsx
  leaderboard/leaderboard-table.tsx
  leaderboard/range-tabs.tsx
  shell/header.tsx
drizzle/
scripts/
  seed.ts
src/
  auth/config.ts
  db/client.ts
  db/schema.ts
  lib/collector/upload.ts
  lib/collector/upload.test.ts
  lib/format.ts
  lib/pricing.ts
  lib/ranking/ranking.ts
  lib/ranking/ranking.test.ts
  lib/security/tokens.ts
  lib/security/tokens.test.ts
  lib/types.ts
  lib/users.ts
tests/
  web.spec.ts
```

Responsibility boundaries:

- `src/db/*`: database connection and schema only.
- `src/lib/ranking/*`: pure ranking logic that can be tested without a database.
- `src/lib/collector/*`: upload payload validation and normalization.
- `src/lib/security/*`: token generation, hashing, and constant-time checks.
- `app/api/*`: thin HTTP wrappers around library and database functions.
- `components/*`: display components only; no direct database access.

## Task 1: Scaffold Next.js And Tooling

**Files:**
- Create: `package.json`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `tests/web.spec.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Scaffold the app**

Run from `/Users/boss/Desktop/corsor/study/2026/06/tokenrank`. The repository already contains `docs/`, so scaffold into `/tmp` first and then copy the generated files into the repo:

```bash
rm -rf /tmp/tokenrank-next-scaffold
pnpm create next-app@latest /tmp/tokenrank-next-scaffold --ts --tailwind --eslint --app --src-dir false --import-alias "@/*" --use-pnpm
rsync -a /tmp/tokenrank-next-scaffold/ ./
```

Expected: command creates a Next.js App Router project in `/tmp/tokenrank-next-scaffold` and copies the generated files into the repository without removing `docs/`. If it asks about Turbopack, choose the default answer.

- [ ] **Step 2: Install runtime dependencies**

```bash
pnpm add drizzle-orm @neondatabase/serverless next-auth @auth/drizzle-adapter zod date-fns lucide-react clsx tailwind-merge
```

Expected: dependencies are added to `package.json`.

- [ ] **Step 3: Install dev dependencies**

```bash
pnpm add -D drizzle-kit vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event playwright tsx dotenv
```

Expected: dev dependencies are added to `package.json`.

- [ ] **Step 4: Replace `vitest.config.ts`**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    passWithNoTests: true,
  },
});
```

- [ ] **Step 5: Add scripts to `package.json`**

Modify the `scripts` block so it includes:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:seed": "tsx scripts/seed.ts",
  "e2e": "playwright test"
}
```

- [ ] **Step 6: Ensure secrets stay untracked**

Confirm `.gitignore` contains:

```gitignore
.env
.env.*
!.env.example
node_modules/
.next/
out/
dist/
coverage/
.DS_Store
*.log
```

- [ ] **Step 7: Run baseline checks**

```bash
pnpm lint
pnpm test
pnpm build
```

Expected: lint passes, Vitest reports no tests found or passes generated tests, and Next builds.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: scaffold web app"
```

## Task 2: Configure Environment And Database Schema

**Files:**
- Create: `.env.example`
- Create: `.env.local` (local only, do not commit)
- Create: `drizzle.config.ts`
- Create: `src/db/client.ts`
- Create: `src/db/schema.ts`

- [ ] **Step 1: Create `.env.example`**

```dotenv
DATABASE_URL=
AUTH_SECRET=
AUTH_TRUST_HOST=true
AUTH_X_ID=
AUTH_X_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 2: Create local `.env.local`**

Create `.env.local` with the same keys. Use the Neon connection string supplied by the user for `DATABASE_URL`. Generate `AUTH_SECRET` locally:

```bash
openssl rand -base64 32
```

Use temporary local values for `AUTH_X_ID` and `AUTH_X_SECRET` until the X app credentials exist:

```dotenv
AUTH_X_ID=local_x_client_id
AUTH_X_SECRET=local_x_client_secret
```

Expected: `.env.local` exists locally and does not appear in `git status`.

- [ ] **Step 3: Create Drizzle config**

Create `drizzle.config.ts`:

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
```

- [ ] **Step 4: Create database client**

Create `src/db/client.ts`:

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
```

- [ ] **Step 5: Create schema**

Create `src/db/schema.ts`:

```ts
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const toolEnum = pgEnum("tool", ["codex", "claude-code"]);
export const tokenStatusEnum = pgEnum("token_status", ["active", "revoked"]);
export const anomalyStatusEnum = pgEnum("anomaly_status", ["open", "resolved"]);

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email"),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    xId: text("x_id"),
    xHandle: text("x_handle"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    profilePublic: boolean("profile_public").notNull().default(true),
    rankingEnabled: boolean("ranking_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    xIdIdx: uniqueIndex("users_x_id_idx").on(table.xId),
    xHandleIdx: uniqueIndex("users_x_handle_idx").on(table.xHandle),
  }),
);

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
    oauth_token_secret: text("oauth_token_secret"),
    oauth_token: text("oauth_token"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  }),
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);

export const webhookTokens = pgTable(
  "webhook_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    label: text("label").notNull().default("default"),
    status: tokenStatusEnum("status").notNull().default("active"),
    lastUsedAt: timestamp("last_used_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    hashIdx: uniqueIndex("webhook_tokens_hash_idx").on(table.tokenHash),
    userIdx: index("webhook_tokens_user_idx").on(table.userId),
  }),
);

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceHash: text("device_hash").notNull(),
    label: text("label").notNull().default("Local device"),
    firstSeenAt: timestamp("first_seen_at", { mode: "date" }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { mode: "date" }).notNull().defaultNow(),
    blocked: boolean("blocked").notNull().default(false),
  },
  (table) => ({
    userDeviceIdx: uniqueIndex("devices_user_device_idx").on(table.userId, table.deviceHash),
    userIdx: index("devices_user_idx").on(table.userId),
  }),
);

export const dailyUsage = pgTable(
  "daily_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    usageDate: date("usage_date", { mode: "string" }).notNull(),
    tool: toolEnum("tool").notNull(),
    model: text("model").notNull(),
    inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
    outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
    cacheReadTokens: bigint("cache_read_tokens", { mode: "number" }).notNull().default(0),
    cacheWriteTokens: bigint("cache_write_tokens", { mode: "number" }).notNull().default(0),
    totalTokens: bigint("total_tokens", { mode: "number" }).notNull().default(0),
    estimatedCostMicros: bigint("estimated_cost_micros", { mode: "number" }).notNull().default(0),
    blocked: boolean("blocked").notNull().default(false),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueUsageIdx: uniqueIndex("daily_usage_unique_idx").on(
      table.userId,
      table.deviceId,
      table.usageDate,
      table.tool,
      table.model,
    ),
    userDateIdx: index("daily_usage_user_date_idx").on(table.userId, table.usageDate),
    dateIdx: index("daily_usage_date_idx").on(table.usageDate),
  }),
);

export const anomalyFlags = pgTable("anomaly_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  dailyUsageId: uuid("daily_usage_id").references(() => dailyUsage.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: anomalyStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { mode: "date" }),
});
```

- [ ] **Step 6: Generate and push schema**

```bash
pnpm db:generate
pnpm db:push
```

Expected: Drizzle creates migration files in `drizzle/` and pushes tables to Neon.

- [ ] **Step 7: Commit**

```bash
git add .env.example drizzle.config.ts drizzle src/db
git commit -m "feat: add database schema"
```

## Task 3: Add Domain Types, Formatting, Pricing, And Security Helpers

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/format.ts`
- Create: `src/lib/pricing.ts`
- Create: `src/lib/security/tokens.ts`
- Create: `src/lib/security/tokens.test.ts`

- [ ] **Step 1: Write failing token tests**

Create `src/lib/security/tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createWebhookSecret, hashSecret, timingSafeEqualText } from "./tokens";

describe("webhook token helpers", () => {
  it("creates long URL-safe secrets", () => {
    const secret = createWebhookSecret();

    expect(secret.length).toBeGreaterThanOrEqual(43);
    expect(secret).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashes secrets deterministically without returning the original", () => {
    const secret = "sample_secret_123";

    expect(hashSecret(secret)).toBe(hashSecret(secret));
    expect(hashSecret(secret)).not.toBe(secret);
  });

  it("compares text safely", () => {
    expect(timingSafeEqualText("abc", "abc")).toBe(true);
    expect(timingSafeEqualText("abc", "abd")).toBe(false);
    expect(timingSafeEqualText("abc", "abcd")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/lib/security/tokens.test.ts
```

Expected: FAIL because `src/lib/security/tokens.ts` does not exist.

- [ ] **Step 3: Implement shared types**

Create `src/lib/types.ts`:

```ts
export const RANGE_KEYS = ["today", "3d", "7d", "30d", "month"] as const;
export const BOARD_KEYS = ["total", "cost", "codex", "claude-code"] as const;
export const TOOL_KEYS = ["codex", "claude-code"] as const;

export type RangeKey = (typeof RANGE_KEYS)[number];
export type BoardKey = (typeof BOARD_KEYS)[number];
export type ToolKey = (typeof TOOL_KEYS)[number];

export type TokenUsageEntry = {
  date: string;
  tool: ToolKey;
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  total: number;
};

export type UsageRow = {
  userId: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  deviceId: string;
  date: string;
  tool: ToolKey;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  estimatedCostMicros: number;
  blocked?: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  estimatedCostMicros: number;
  byTool: Record<ToolKey, number>;
};
```

- [ ] **Step 4: Implement formatting**

Create `src/lib/format.ts`:

```ts
export function formatTokens(value: number): string {
  if (value >= 100_000_000) return `${trimFixed(value / 100_000_000, 2)}亿`;
  if (value >= 10_000) return `${trimFixed(value / 10_000, 1)}万`;
  return value.toLocaleString("zh-CN");
}

export function formatUsdMicros(value: number): string {
  const usd = value / 1_000_000;
  if (usd >= 100) return `$${Math.round(usd).toLocaleString("en-US")}`;
  return `$${usd.toFixed(2)}`;
}

function trimFixed(value: number, digits: number): string {
  return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}
```

- [ ] **Step 5: Implement pricing**

Create `src/lib/pricing.ts`:

```ts
import type { TokenUsageEntry } from "./types";

type Price = {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion: number;
  cacheWritePerMillion: number;
};

const FALLBACK_PRICE: Price = {
  inputPerMillion: 2,
  outputPerMillion: 8,
  cacheReadPerMillion: 0.2,
  cacheWritePerMillion: 2,
};

const MODEL_PRICES: Record<string, Price> = {
  "gpt-5.5": {
    inputPerMillion: 2,
    outputPerMillion: 10,
    cacheReadPerMillion: 0.25,
    cacheWritePerMillion: 2,
  },
  "claude-opus-4-8": {
    inputPerMillion: 15,
    outputPerMillion: 75,
    cacheReadPerMillion: 1.5,
    cacheWritePerMillion: 18.75,
  },
  unknown: FALLBACK_PRICE,
};

export function estimateCostMicros(entry: TokenUsageEntry): number {
  const price = MODEL_PRICES[entry.model] ?? FALLBACK_PRICE;
  const usd =
    (entry.input / 1_000_000) * price.inputPerMillion +
    (entry.output / 1_000_000) * price.outputPerMillion +
    (entry.cacheRead / 1_000_000) * price.cacheReadPerMillion +
    (entry.cacheWrite / 1_000_000) * price.cacheWritePerMillion;

  return Math.round(usd * 1_000_000);
}
```

- [ ] **Step 6: Implement token helpers**

Create `src/lib/security/tokens.ts`:

```ts
import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function createWebhookSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function timingSafeEqualText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
```

- [ ] **Step 7: Run tests**

```bash
pnpm vitest run src/lib/security/tokens.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib
git commit -m "feat: add domain helpers"
```

## Task 4: Implement Ranking Logic With TDD

**Files:**
- Create: `src/lib/ranking/ranking.test.ts`
- Create: `src/lib/ranking/ranking.ts`

- [ ] **Step 1: Write failing ranking tests**

Create `src/lib/ranking/ranking.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { UsageRow } from "../types";
import { getRangeStart, rankUsageRows } from "./ranking";

const now = new Date("2026-06-22T12:00:00.000Z");

function row(overrides: Partial<UsageRow>): UsageRow {
  return {
    userId: "u1",
    handle: "alice",
    name: "Alice",
    avatarUrl: null,
    deviceId: "d1",
    date: "2026-06-22",
    tool: "codex",
    model: "gpt-5.5",
    inputTokens: 1,
    outputTokens: 1,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalTokens: 100,
    estimatedCostMicros: 10,
    ...overrides,
  };
}

describe("getRangeStart", () => {
  it("calculates inclusive range starts in UTC dates", () => {
    expect(getRangeStart("today", now)).toBe("2026-06-22");
    expect(getRangeStart("3d", now)).toBe("2026-06-20");
    expect(getRangeStart("7d", now)).toBe("2026-06-16");
    expect(getRangeStart("30d", now)).toBe("2026-05-24");
    expect(getRangeStart("month", now)).toBe("2026-06-01");
  });
});

describe("rankUsageRows", () => {
  it("ranks by total tokens and groups by user", () => {
    const entries = rankUsageRows(
      [
        row({ userId: "u1", handle: "alice", name: "Alice", totalTokens: 100 }),
        row({ userId: "u2", handle: "bob", name: "Bob", totalTokens: 200 }),
      ],
      { board: "total", range: "today", now },
    );

    expect(entries.map((entry) => [entry.rank, entry.handle, entry.score])).toEqual([
      [1, "bob", 200],
      [2, "alice", 100],
    ]);
  });

  it("caps counted devices to top three per user", () => {
    const entries = rankUsageRows(
      [
        row({ deviceId: "d1", totalTokens: 100 }),
        row({ deviceId: "d2", totalTokens: 200 }),
        row({ deviceId: "d3", totalTokens: 300 }),
        row({ deviceId: "d4", totalTokens: 400 }),
      ],
      { board: "total", range: "today", now },
    );

    expect(entries[0].score).toBe(900);
  });

  it("filters blocked rows and dates outside the range", () => {
    const entries = rankUsageRows(
      [
        row({ totalTokens: 100 }),
        row({ totalTokens: 900, blocked: true }),
        row({ totalTokens: 800, date: "2026-06-10" }),
      ],
      { board: "total", range: "7d", now },
    );

    expect(entries[0].score).toBe(100);
  });

  it("supports cost and tool boards", () => {
    const rows = [
      row({ tool: "codex", totalTokens: 100, estimatedCostMicros: 500 }),
      row({ tool: "claude-code", totalTokens: 300, estimatedCostMicros: 200 }),
    ];

    expect(rankUsageRows(rows, { board: "cost", range: "today", now })[0].score).toBe(700);
    expect(rankUsageRows(rows, { board: "codex", range: "today", now })[0].score).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm vitest run src/lib/ranking/ranking.test.ts
```

Expected: FAIL because `src/lib/ranking/ranking.ts` does not exist.

- [ ] **Step 3: Implement ranking**

Create `src/lib/ranking/ranking.ts`:

```ts
import type { BoardKey, LeaderboardEntry, RangeKey, ToolKey, UsageRow } from "../types";

type RankOptions = {
  board: BoardKey;
  range: RangeKey;
  now?: Date;
};

export function getRangeStart(range: RangeKey, now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (range === "month") {
    return toDateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
  }

  const days = range === "today" ? 1 : Number.parseInt(range.replace("d", ""), 10);
  date.setUTCDate(date.getUTCDate() - days + 1);
  return toDateKey(date);
}

export function rankUsageRows(rows: UsageRow[], options: RankOptions): LeaderboardEntry[] {
  const start = getRangeStart(options.range, options.now ?? new Date());
  const filtered = rows.filter((row) => !row.blocked && row.date >= start);
  const byUser = new Map<string, UsageRow[]>();

  for (const row of filtered) {
    const existing = byUser.get(row.userId) ?? [];
    existing.push(row);
    byUser.set(row.userId, existing);
  }

  const entries = [...byUser.values()].map((userRows) => {
    const countedRows = topThreeDeviceRows(userRows);
    const first = countedRows[0] ?? userRows[0];
    const byTool = { codex: 0, "claude-code": 0 } satisfies Record<ToolKey, number>;
    let totalTokens = 0;
    let estimatedCostMicros = 0;

    for (const row of countedRows) {
      byTool[row.tool] += row.totalTokens;
      totalTokens += row.totalTokens;
      estimatedCostMicros += row.estimatedCostMicros;
    }

    return {
      rank: 0,
      userId: first.userId,
      handle: first.handle,
      name: first.name,
      avatarUrl: first.avatarUrl,
      score: scoreForBoard(options.board, totalTokens, estimatedCostMicros, byTool),
      estimatedCostMicros,
      byTool,
    };
  });

  return entries
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function topThreeDeviceRows(rows: UsageRow[]): UsageRow[] {
  const deviceTotals = new Map<string, number>();

  for (const row of rows) {
    deviceTotals.set(row.deviceId, (deviceTotals.get(row.deviceId) ?? 0) + row.totalTokens);
  }

  const countedDevices = new Set(
    [...deviceTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([deviceId]) => deviceId),
  );

  return rows.filter((row) => countedDevices.has(row.deviceId));
}

function scoreForBoard(
  board: BoardKey,
  totalTokens: number,
  estimatedCostMicros: number,
  byTool: Record<ToolKey, number>,
): number {
  if (board === "cost") return estimatedCostMicros;
  if (board === "codex" || board === "claude-code") return byTool[board];
  return totalTokens;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/lib/ranking/ranking.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ranking
git commit -m "feat: add ranking logic"
```

## Task 5: Implement Collector Upload Validation

**Files:**
- Create: `src/lib/collector/upload.test.ts`
- Create: `src/lib/collector/upload.ts`

- [ ] **Step 1: Write failing upload tests**

Create `src/lib/collector/upload.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseUploadPayload } from "./upload";

describe("parseUploadPayload", () => {
  it("accepts valid aggregate rows", () => {
    const parsed = parseUploadPayload({
      deviceId: "device-1",
      clientVersion: "0.1.0",
      timezone: "Asia/Shanghai",
      generatedAt: "2026-06-22T12:00:00.000Z",
      entries: [
        {
          date: "2026-06-22",
          tool: "codex",
          model: "gpt-5.5",
          input: 100,
          output: 50,
          cacheRead: 200,
          cacheWrite: 10,
          total: 360,
        },
      ],
    });

    expect(parsed.entries[0].total).toBe(360);
  });

  it("rejects content fields", () => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-1",
        clientVersion: "0.1.0",
        timezone: "Asia/Shanghai",
        generatedAt: "2026-06-22T12:00:00.000Z",
        entries: [],
        prompt: "do not upload this",
      }),
    ).toThrow();
  });

  it("rejects unsupported tools and negative counts", () => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-1",
        clientVersion: "0.1.0",
        timezone: "Asia/Shanghai",
        generatedAt: "2026-06-22T12:00:00.000Z",
        entries: [
          {
            date: "2026-06-22",
            tool: "unknown",
            model: "model",
            input: -1,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            total: 0,
          },
        ],
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm vitest run src/lib/collector/upload.test.ts
```

Expected: FAIL because `src/lib/collector/upload.ts` does not exist.

- [ ] **Step 3: Implement upload validation**

Create `src/lib/collector/upload.ts`:

```ts
import { z } from "zod";

const entrySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    tool: z.enum(["codex", "claude-code"]),
    model: z.string().min(1).max(120),
    input: z.number().int().nonnegative(),
    output: z.number().int().nonnegative(),
    cacheRead: z.number().int().nonnegative(),
    cacheWrite: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  })
  .strict()
  .refine(
    (entry) => entry.total === entry.input + entry.output + entry.cacheRead + entry.cacheWrite,
    "total must equal input + output + cacheRead + cacheWrite",
  );

const uploadSchema = z
  .object({
    deviceId: z.string().min(8).max(160),
    clientVersion: z.string().min(1).max(40),
    timezone: z.string().min(1).max(80),
    generatedAt: z.string().datetime(),
    entries: z.array(entrySchema).max(500),
  })
  .strict();

export type ParsedUploadPayload = z.infer<typeof uploadSchema>;

export function parseUploadPayload(input: unknown): ParsedUploadPayload {
  return uploadSchema.parse(input);
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/lib/collector/upload.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/collector
git commit -m "feat: validate collector uploads"
```

## Task 6: Add Auth.js X Login

**Files:**
- Create: `src/auth/config.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add auth config**

Create `src/auth/config.ts`:

```ts
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Twitter from "next-auth/providers/twitter";
import { db } from "@/src/db/client";
import { accounts, sessions, users, verificationTokens } from "@/src/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Twitter({
      clientId: process.env.AUTH_X_ID,
      clientSecret: process.env.AUTH_X_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
```

- [ ] **Step 2: Add session type augmentation**

Create `auth.d.ts` in the project root:

```ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
```

- [ ] **Step 3: Add auth route**

Create `app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/src/auth/config";

export const { GET, POST } = handlers;
```

- [ ] **Step 4: Add a login smoke page state**

In `app/me/page.tsx`, create a temporary page that uses the session:

```tsx
import { auth, signIn, signOut } from "@/src/auth/config";

export default async function MePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">My TokenRank</h1>
        <form
          action={async () => {
            "use server";
            await signIn("twitter");
          }}
          className="mt-6"
        >
          <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
            Sign in with X
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">My TokenRank</h1>
      <p className="mt-2 text-sm text-gray-600">Signed in as {session.user.name}</p>
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
        className="mt-6"
      >
        <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900">
          Sign out
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 5: Verify auth route compiles**

```bash
pnpm build
```

Expected: build succeeds. Actual X sign-in can only be completed after real `AUTH_X_ID` and `AUTH_X_SECRET` are configured in the X developer console.

- [ ] **Step 6: Commit**

```bash
git add auth.d.ts src/auth app/api/auth app/me/page.tsx
git commit -m "feat: add x authentication"
```

## Task 7: Implement Database Services And API Routes

**Files:**
- Create: `src/lib/users.ts`
- Create: `app/api/boards/route.ts`
- Create: `app/api/leaderboard/route.ts`
- Create: `app/api/users/[handle]/route.ts`
- Create: `app/api/me/route.ts`
- Create: `app/api/webhook-tokens/route.ts`
- Create: `app/api/collector/upload/[token]/route.ts`

- [ ] **Step 1: Create user/dashboard service**

Create `src/lib/users.ts`:

```ts
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/src/db/client";
import { dailyUsage, devices, users, webhookTokens } from "@/src/db/schema";
import { estimateCostMicros } from "./pricing";
import { getRangeStart, rankUsageRows } from "./ranking/ranking";
import { hashSecret } from "./security/tokens";
import type { BoardKey, RangeKey, TokenUsageEntry, UsageRow } from "./types";

export async function getUsageRows(range: RangeKey): Promise<UsageRow[]> {
  const start = getRangeStart(range);
  const rows = await db
    .select({
      userId: users.id,
      handle: users.xHandle,
      name: users.displayName,
      avatarUrl: users.avatarUrl,
      deviceId: devices.id,
      date: dailyUsage.usageDate,
      tool: dailyUsage.tool,
      model: dailyUsage.model,
      inputTokens: dailyUsage.inputTokens,
      outputTokens: dailyUsage.outputTokens,
      cacheReadTokens: dailyUsage.cacheReadTokens,
      cacheWriteTokens: dailyUsage.cacheWriteTokens,
      totalTokens: dailyUsage.totalTokens,
      estimatedCostMicros: dailyUsage.estimatedCostMicros,
      blocked: dailyUsage.blocked,
    })
    .from(dailyUsage)
    .innerJoin(users, eq(users.id, dailyUsage.userId))
    .innerJoin(devices, eq(devices.id, dailyUsage.deviceId))
    .where(and(eq(users.rankingEnabled, true), gte(dailyUsage.usageDate, start)));

  return rows.map((row) => ({
    ...row,
    handle: row.handle ?? "unknown",
    name: row.name ?? row.handle ?? "Unknown",
    tool: row.tool,
  }));
}

export async function getLeaderboard(board: BoardKey, range: RangeKey) {
  const rows = await getUsageRows(range);
  return rankUsageRows(rows, { board, range });
}

export async function getProfile(handle: string) {
  const [user] = await db.select().from(users).where(eq(users.xHandle, handle)).limit(1);
  if (!user || !user.profilePublic) return null;

  const rows = await db
    .select()
    .from(dailyUsage)
    .where(eq(dailyUsage.userId, user.id))
    .orderBy(desc(dailyUsage.usageDate));

  return { user, daily: rows };
}

export async function upsertUploadedUsage(token: string, deviceId: string, entries: TokenUsageEntry[]) {
  const tokenHash = hashSecret(token);
  const [webhook] = await db
    .select()
    .from(webhookTokens)
    .where(and(eq(webhookTokens.tokenHash, tokenHash), eq(webhookTokens.status, "active")))
    .limit(1);

  if (!webhook) return { ok: false as const, status: 401 };

  const deviceHash = hashSecret(deviceId);
  const [device] = await db
    .insert(devices)
    .values({
      userId: webhook.userId,
      deviceHash,
      label: "Local device",
    })
    .onConflictDoUpdate({
      target: [devices.userId, devices.deviceHash],
      set: { lastSeenAt: sql`now()` },
    })
    .returning();

  for (const entry of entries) {
    await db
      .insert(dailyUsage)
      .values({
        userId: webhook.userId,
        deviceId: device.id,
        usageDate: entry.date,
        tool: entry.tool,
        model: entry.model,
        inputTokens: entry.input,
        outputTokens: entry.output,
        cacheReadTokens: entry.cacheRead,
        cacheWriteTokens: entry.cacheWrite,
        totalTokens: entry.total,
        estimatedCostMicros: estimateCostMicros(entry),
      })
      .onConflictDoUpdate({
        target: [
          dailyUsage.userId,
          dailyUsage.deviceId,
          dailyUsage.usageDate,
          dailyUsage.tool,
          dailyUsage.model,
        ],
        set: {
          inputTokens: entry.input,
          outputTokens: entry.output,
          cacheReadTokens: entry.cacheRead,
          cacheWriteTokens: entry.cacheWrite,
          totalTokens: entry.total,
          estimatedCostMicros: estimateCostMicros(entry),
          updatedAt: sql`now()`,
        },
      });
  }

  await db.update(webhookTokens).set({ lastUsedAt: new Date() }).where(eq(webhookTokens.id, webhook.id));

  return { ok: true as const, status: 200, uploaded: entries.length };
}
```

- [ ] **Step 2: Add boards API**

Create `app/api/boards/route.ts`:

```ts
import { NextResponse } from "next/server";
import { BOARD_KEYS } from "@/src/lib/types";

export async function GET() {
  return NextResponse.json({
    status: 0,
    boards: BOARD_KEYS,
    tools: ["codex", "claude-code"],
  });
}
```

- [ ] **Step 3: Add leaderboard API**

Create `app/api/leaderboard/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getLeaderboard } from "@/src/lib/users";
import { BOARD_KEYS, RANGE_KEYS, type BoardKey, type RangeKey } from "@/src/lib/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const board = (url.searchParams.get("board") ?? "total") as BoardKey;
  const range = (url.searchParams.get("range") ?? "today") as RangeKey;

  if (!BOARD_KEYS.includes(board) || !RANGE_KEYS.includes(range)) {
    return NextResponse.json({ status: -1, error: "invalid board or range" }, { status: 400 });
  }

  const entries = await getLeaderboard(board, range);
  return NextResponse.json({ status: 0, board, range, entries });
}
```

- [ ] **Step 4: Add profile API**

Create `app/api/users/[handle]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getProfile } from "@/src/lib/users";

export async function GET(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getProfile(handle);

  if (!profile) {
    return NextResponse.json({ status: -1, error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ status: 0, ...profile });
}
```

- [ ] **Step 5: Add collector upload API**

Create `app/api/collector/upload/[token]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { parseUploadPayload } from "@/src/lib/collector/upload";
import { upsertUploadedUsage } from "@/src/lib/users";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json();
  const payload = parseUploadPayload(body);
  const result = await upsertUploadedUsage(token, payload.deviceId, payload.entries);

  if (!result.ok) {
    return NextResponse.json({ status: -1, error: "invalid token" }, { status: result.status });
  }

  return NextResponse.json({ status: 0, uploaded: result.uploaded });
}
```

- [ ] **Step 6: Add authenticated `me` and webhook APIs**

Create `app/api/me/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/src/auth/config";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ status: -1, error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ status: 0, user: session.user });
}
```

Create `app/api/webhook-tokens/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/src/auth/config";
import { db } from "@/src/db/client";
import { webhookTokens } from "@/src/db/schema";
import { createWebhookSecret, hashSecret } from "@/src/lib/security/tokens";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ status: -1, error: "unauthorized" }, { status: 401 });
  }

  const secret = createWebhookSecret();
  await db.insert(webhookTokens).values({
    userId: session.user.id,
    tokenHash: hashSecret(secret),
    label: "default",
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return NextResponse.json({
    status: 0,
    webhookUrl: `${appUrl}/api/collector/upload/${secret}`,
  });
}
```

- [ ] **Step 7: Run checks**

```bash
pnpm test
pnpm build
```

Expected: tests pass and build succeeds.

- [ ] **Step 8: Commit**

```bash
git add app/api src/lib/users.ts
git commit -m "feat: add web api routes"
```

## Task 8: Seed Demo Data

**Files:**
- Create: `scripts/seed.ts`

- [ ] **Step 1: Create seed script**

Create `scripts/seed.ts`:

```ts
import "dotenv/config";
import { db } from "../src/db/client";
import { dailyUsage, devices, users } from "../src/db/schema";
import { estimateCostMicros } from "../src/lib/pricing";
import type { TokenUsageEntry } from "../src/lib/types";

const demoUsers = [
  { id: "demo_alice", xId: "1001", xHandle: "alice_ai", displayName: "Alice AI" },
  { id: "demo_bob", xId: "1002", xHandle: "bob_builds", displayName: "Bob Builds" },
  { id: "demo_chen", xId: "1003", xHandle: "chen_codes", displayName: "Chen Codes" },
];

function entry(date: string, tool: "codex" | "claude-code", model: string, total: number): TokenUsageEntry {
  const input = Math.floor(total * 0.2);
  const output = Math.floor(total * 0.05);
  const cacheRead = Math.floor(total * 0.7);
  const cacheWrite = total - input - output - cacheRead;
  return { date, tool, model, input, output, cacheRead, cacheWrite, total };
}

async function main() {
  for (const user of demoUsers) {
    await db
      .insert(users)
      .values({
        id: user.id,
        name: user.displayName,
        xId: user.xId,
        xHandle: user.xHandle,
        displayName: user.displayName,
        avatarUrl: null,
        profilePublic: true,
        rankingEnabled: true,
      })
      .onConflictDoNothing();

    const [device] = await db
      .insert(devices)
      .values({
        userId: user.id,
        deviceHash: `demo_device_${user.id}`,
        label: "Demo device",
      })
      .onConflictDoNothing()
      .returning();

    const fallbackDevice =
      device ??
      (
        await db.query.devices.findFirst({
          where: (table, { eq }) => eq(table.deviceHash, `demo_device_${user.id}`),
        })
      )!;

    for (let offset = 0; offset < 30; offset++) {
      const date = new Date(Date.UTC(2026, 5, 22 - offset)).toISOString().slice(0, 10);
      const base = 150_000 + offset * 8_000 + user.id.length * 30_000;
      const entries = [
        entry(date, "codex", "gpt-5.5", base),
        entry(date, "claude-code", "claude-opus-4-8", Math.floor(base * 0.45)),
      ];

      for (const usage of entries) {
        await db
          .insert(dailyUsage)
          .values({
            userId: user.id,
            deviceId: fallbackDevice.id,
            usageDate: usage.date,
            tool: usage.tool,
            model: usage.model,
            inputTokens: usage.input,
            outputTokens: usage.output,
            cacheReadTokens: usage.cacheRead,
            cacheWriteTokens: usage.cacheWrite,
            totalTokens: usage.total,
            estimatedCostMicros: estimateCostMicros(usage),
          })
          .onConflictDoNothing();
      }
    }
  }
}

main()
  .then(() => {
    console.log("Seed complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

- [ ] **Step 2: Run seed**

```bash
pnpm db:seed
```

Expected: prints `Seed complete`.

- [ ] **Step 3: Verify leaderboard API returns entries**

```bash
pnpm dev
curl -fsS "http://localhost:3000/api/leaderboard?board=total&range=30d"
```

Expected: JSON with `status:0` and non-empty `entries`.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed.ts package.json pnpm-lock.yaml
git commit -m "chore: add demo seed data"
```

## Task 9: Build Leaderboard UI

**Files:**
- Create: `components/shell/header.tsx`
- Create: `components/leaderboard/range-tabs.tsx`
- Create: `components/leaderboard/leaderboard-table.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create header component**

Create `components/shell/header.tsx`:

```tsx
import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold text-gray-950">
          TokenRank
        </Link>
        <nav className="flex items-center gap-4 text-sm text-gray-600">
          <Link href="/rules" className="hover:text-gray-950">
            Rules
          </Link>
          <Link href="/connect" className="rounded-lg bg-gray-950 px-3 py-1.5 font-medium text-white">
            Connect
          </Link>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create range tabs**

Create `components/leaderboard/range-tabs.tsx`:

```tsx
import Link from "next/link";
import type { RangeKey } from "@/src/lib/types";

const ranges: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "3d", label: "3 Days" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "month", label: "Month" },
];

export function RangeTabs({ active }: { active: RangeKey }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ranges.map((range) => (
        <Link
          key={range.key}
          href={`/?range=${range.key}`}
          className={
            active === range.key
              ? "rounded-lg bg-gray-950 px-3 py-1.5 text-sm font-medium text-white"
              : "rounded-lg bg-white px-3 py-1.5 text-sm text-gray-600 ring-1 ring-gray-200 hover:ring-gray-300"
          }
        >
          {range.label}
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create leaderboard table**

Create `components/leaderboard/leaderboard-table.tsx`:

```tsx
import Link from "next/link";
import { formatTokens, formatUsdMicros } from "@/src/lib/format";
import type { LeaderboardEntry } from "@/src/lib/types";

export function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  if (!entries.length) {
    return (
      <div className="rounded-xl bg-white p-10 text-center text-sm text-gray-500 ring-1 ring-gray-200">
        No data yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th className="w-16 px-4 py-3">Rank</th>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3 text-right">Tokens</th>
            <th className="px-4 py-3 text-right">Cost</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.userId} className="border-t border-gray-100">
              <td className="px-4 py-3 font-semibold text-gray-500">#{entry.rank}</td>
              <td className="px-4 py-3">
                <Link href={`/u/${entry.handle}`} className="font-medium text-gray-950 hover:underline">
                  {entry.name}
                </Link>
                <div className="text-xs text-gray-500">@{entry.handle}</div>
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-950">
                {formatTokens(entry.score)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                {formatUsdMicros(entry.estimatedCostMicros)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Update root layout**

Modify `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/shell/header";

export const metadata: Metadata = {
  title: "TokenRank",
  description: "Public X leaderboard for AI coding token usage.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-950 antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Build leaderboard page**

Modify `app/page.tsx`:

```tsx
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { RangeTabs } from "@/components/leaderboard/range-tabs";
import { getLeaderboard } from "@/src/lib/users";
import { RANGE_KEYS, type RangeKey } from "@/src/lib/types";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = RANGE_KEYS.includes(params.range as RangeKey) ? (params.range as RangeKey) : "today";
  const entries = await getLeaderboard("total", range);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">AI Coding Token Leaderboard</h1>
          <p className="mt-1 text-sm text-gray-500">Public X rankings for daily AI coding usage.</p>
        </div>
        <RangeTabs active={range} />
      </div>
      <LeaderboardTable entries={entries} />
    </main>
  );
}
```

- [ ] **Step 6: Run checks**

```bash
pnpm lint
pnpm build
```

Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add app components
git commit -m "feat: build leaderboard ui"
```

## Task 10: Build Dashboard UI And Public Profile

**Files:**
- Create: `components/dashboard/activity-heatmap.tsx`
- Create: `components/dashboard/daily-bars.tsx`
- Create: `components/dashboard/usage-dashboard.tsx`
- Modify: `app/u/[handle]/page.tsx`

- [ ] **Step 1: Create activity heatmap**

Create `components/dashboard/activity-heatmap.tsx`:

```tsx
import { formatTokens } from "@/src/lib/format";

type Day = {
  usageDate: string;
  totalTokens: number;
};

export function ActivityHeatmap({ days }: { days: Day[] }) {
  const byDate = new Map(days.map((day) => [day.usageDate, day.totalTokens]));
  const today = new Date();
  const cells = Array.from({ length: 210 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (209 - index));
    const key = date.toISOString().slice(0, 10);
    const total = byDate.get(key) ?? 0;
    return { key, total };
  });
  const max = Math.max(1, ...cells.map((cell) => cell.total));

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
      <h2 className="mb-4 font-semibold text-gray-950">Activity</h2>
      <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
        {cells.map((cell) => {
          const level = cell.total === 0 ? 0 : Math.ceil((cell.total / max) * 4);
          const color = ["bg-gray-100", "bg-emerald-100", "bg-emerald-300", "bg-emerald-500", "bg-emerald-700"][
            level
          ];
          return (
            <div
              key={cell.key}
              title={`${cell.key}: ${formatTokens(cell.total)} tokens`}
              className={`h-3 w-3 rounded-sm ${color}`}
            />
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create daily bars**

Create `components/dashboard/daily-bars.tsx`:

```tsx
import { formatTokens } from "@/src/lib/format";

type Day = {
  usageDate: string;
  tool: "codex" | "claude-code";
  totalTokens: number;
};

export function DailyBars({ days }: { days: Day[] }) {
  const grouped = new Map<string, { codex: number; "claude-code": number }>();

  for (const day of days) {
    const current = grouped.get(day.usageDate) ?? { codex: 0, "claude-code": 0 };
    current[day.tool] += day.totalTokens;
    grouped.set(day.usageDate, current);
  }

  const series = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-30);
  const max = Math.max(1, ...series.map(([, value]) => value.codex + value["claude-code"]));

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
      <h2 className="mb-4 font-semibold text-gray-950">Last 30 Days</h2>
      <div className="flex h-52 items-end gap-1">
        {series.map(([date, value]) => {
          const codexHeight = (value.codex / max) * 100;
          const claudeHeight = (value["claude-code"] / max) * 100;
          return (
            <div key={date} className="flex h-full flex-1 flex-col justify-end" title={`${date}: ${formatTokens(value.codex + value["claude-code"])}`}>
              <div className="rounded-t bg-orange-400" style={{ height: `${claudeHeight}%` }} />
              <div className="bg-blue-500" style={{ height: `${codexHeight}%` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create dashboard wrapper**

Create `components/dashboard/usage-dashboard.tsx`:

```tsx
import { ActivityHeatmap } from "./activity-heatmap";
import { DailyBars } from "./daily-bars";
import { formatTokens, formatUsdMicros } from "@/src/lib/format";

type Usage = {
  usageDate: string;
  tool: "codex" | "claude-code";
  model: string;
  totalTokens: number;
  estimatedCostMicros: number;
};

export function UsageDashboard({
  name,
  handle,
  daily,
}: {
  name: string;
  handle: string;
  daily: Usage[];
}) {
  const total = daily.reduce((sum, row) => sum + row.totalTokens, 0);
  const cost = daily.reduce((sum, row) => sum + row.estimatedCostMicros, 0);
  const activeDays = new Set(daily.map((row) => row.usageDate)).size;
  const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
    `I have used ${formatTokens(total)} AI coding tokens on TokenRank.`,
  )}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">{name}</h1>
          <p className="text-sm text-gray-500">@{handle}</p>
        </div>
        <a href={shareUrl} className="rounded-lg bg-gray-950 px-4 py-2 text-center text-sm font-medium text-white">
          Share on X
        </a>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total Tokens" value={formatTokens(total)} />
        <Stat label="Estimated Cost" value={formatUsdMicros(cost)} />
        <Stat label="Active Days" value={String(activeDays)} />
      </div>
      <ActivityHeatmap days={daily} />
      <DailyBars days={daily} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
      <div className="text-2xl font-bold text-gray-950">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}
```

- [ ] **Step 4: Build public profile page**

Create or replace `app/u/[handle]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { UsageDashboard } from "@/components/dashboard/usage-dashboard";
import { getProfile } from "@/src/lib/users";

export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getProfile(handle);

  if (!profile) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <UsageDashboard
        name={profile.user.displayName ?? profile.user.name ?? handle}
        handle={profile.user.xHandle ?? handle}
        daily={profile.daily}
      />
    </main>
  );
}
```

- [ ] **Step 5: Run checks**

```bash
pnpm lint
pnpm build
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add app/u components/dashboard
git commit -m "feat: build public dashboard"
```

## Task 11: Build Rules And Connect Pages

**Files:**
- Modify: `app/rules/page.tsx`
- Modify: `app/connect/page.tsx`
- Modify: `app/me/page.tsx`

- [ ] **Step 1: Build rules page**

Create `app/rules/page.tsx`:

```tsx
export default function RulesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-950">Rules</h1>
      <div className="mt-6 space-y-4">
        <section className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
          <h2 className="font-semibold text-gray-950">Only token totals are uploaded</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            The collector sends daily aggregate counts by tool and model. It does not upload code, prompts,
            conversations, file names, or file contents.
          </p>
        </section>
        <section className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
          <h2 className="font-semibold text-gray-950">Ranking is for fun</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            The leaderboard is a public, social ranking for AI coding usage. Obviously fake data can be removed,
            devices can be blocked, and users can be excluded from ranking.
          </p>
        </section>
        <section className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
          <h2 className="font-semibold text-gray-950">Device counting</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Same-device uploads overwrite previous rows for the same day, tool, and model. At most the top three
            devices count toward each user's ranking.
          </p>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Build connect page**

Create `app/connect/page.tsx`:

```tsx
import { auth, signIn } from "@/src/auth/config";

export default async function ConnectPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-950">Connect</h1>
        <p className="mt-2 text-sm text-gray-600">Sign in with X to generate your private collector command.</p>
        <form
          action={async () => {
            "use server";
            await signIn("twitter");
          }}
          className="mt-6"
        >
          <button className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white">
            Sign in with X
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-950">Connect</h1>
      <p className="mt-2 text-sm text-gray-600">
        Generate a private webhook from the dashboard, then use the command shown there on your own machine.
      </p>
      <a href="/me" className="mt-6 inline-block rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white">
        Open dashboard
      </a>
    </main>
  );
}
```

- [ ] **Step 3: Replace `me` page with webhook controls**

Update `app/me/page.tsx`:

```tsx
import { auth, signIn, signOut } from "@/src/auth/config";

export default async function MePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-950">My TokenRank</h1>
        <form
          action={async () => {
            "use server";
            await signIn("twitter");
          }}
          className="mt-6"
        >
          <button className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white">
            Sign in with X
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">My TokenRank</h1>
          <p className="mt-1 text-sm text-gray-500">Signed in as {session.user.name}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button className="rounded-lg bg-white px-3 py-1.5 text-sm text-gray-700 ring-1 ring-gray-200">
            Sign out
          </button>
        </form>
      </div>
      <section className="mt-6 rounded-xl bg-white p-5 ring-1 ring-gray-200">
        <h2 className="font-semibold text-gray-950">Collector command</h2>
        <p className="mt-2 text-sm text-gray-600">
          Use the API to generate a private webhook. The collector CLI plan will turn this into a one-line install
          command in the next phase.
        </p>
        <code className="mt-4 block overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
          POST /api/webhook-tokens
        </code>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run checks**

```bash
pnpm lint
pnpm build
```

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add app/rules app/connect app/me
git commit -m "feat: add rules and connect pages"
```

## Task 12: Add Browser Smoke Test And Final Verification

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/web.spec.ts`

- [ ] **Step 1: Create Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 15"] } },
  ],
});
```

- [ ] **Step 2: Create smoke test**

Create `tests/web.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("leaderboard renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /AI Coding Token Leaderboard/i })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
});

test("rules page renders privacy copy", async ({ page }) => {
  await page.goto("/rules");
  await expect(page.getByRole("heading", { name: "Rules" })).toBeVisible();
  await expect(page.getByText(/does not upload code/i)).toBeVisible();
});
```

- [ ] **Step 3: Install Playwright browsers**

```bash
pnpm exec playwright install chromium
```

Expected: Chromium browser dependency installs.

- [ ] **Step 4: Run full verification**

```bash
pnpm lint
pnpm test
pnpm build
pnpm e2e
```

Expected: all commands pass.

- [ ] **Step 5: Check working tree**

```bash
git status --short
```

Expected: only intentional files from this task are modified.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts tests package.json pnpm-lock.yaml
git commit -m "test: add web smoke coverage"
```

## Task 13: Manual Run Handoff

**Files:**
- No file changes expected unless verification reveals a defect.

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

Expected: Next.js starts on `http://localhost:3000`.

- [ ] **Step 2: Verify pages manually**

Open:

```text
http://localhost:3000/
http://localhost:3000/rules
http://localhost:3000/connect
http://localhost:3000/u/alice_ai
```

Expected:

- `/` shows the seeded leaderboard.
- `/rules` explains privacy and anti-cheat.
- `/connect` shows sign-in or dashboard routing.
- `/u/alice_ai` shows seeded dashboard charts.

- [ ] **Step 3: Stop the server**

Use `Ctrl-C` in the terminal running `pnpm dev`.

- [ ] **Step 4: Final status**

```bash
git status --short
```

Expected: clean working tree.
