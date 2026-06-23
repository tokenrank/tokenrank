import "dotenv/config";

import { config as loadEnvFile } from "dotenv";
import { and, eq, sql } from "drizzle-orm";

import { dailyUsage, devices, users } from "../src/db/schema";
import { estimateCostMicros } from "../src/lib/pricing";
import { TOOL_KEYS, type TokenUsageEntry, type ToolKey } from "../src/lib/types";

type Database = typeof import("../src/db/client").db;

loadEnvFile({ path: ".env.local", override: false, quiet: true });

const demoUsers = [
  { id: "demo_alice", xId: "1001", xHandle: "alice_ai", displayName: "Alice AI" },
  { id: "demo_bob", xId: "1002", xHandle: "bob_builds", displayName: "Bob Builds" },
  { id: "demo_chen", xId: "1003", xHandle: "chen_codes", displayName: "Chen Codes" },
] as const;

const now = new Date();
const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateForOffset(offset: number): string {
  const date = new Date(today);
  date.setUTCDate(today.getUTCDate() - offset);
  return toDateKey(date);
}

function entry(date: string, tool: ToolKey, total: number): TokenUsageEntry {
  const input = Math.floor(total * 0.22);
  const output = Math.floor(total * 0.08);
  const cacheWrite = Math.floor(total * 0.1);
  const cacheRead = total - input - output - cacheWrite;

  return {
    date,
    tool,
    model: `${tool}-demo`,
    input,
    output,
    cacheRead,
    cacheWrite,
    total,
  };
}

function usageEntriesFor(userIndex: number, date: string, offset: number): TokenUsageEntry[] {
  const dailyBase = 170_000 + userIndex * 55_000 + (29 - offset) * 6_000;

  return TOOL_KEYS.map((tool, toolIndex) => {
    const toolMultiplier = 1 + (TOOL_KEYS.length - toolIndex) / 12;
    return entry(date, tool, Math.round(dailyBase * toolMultiplier));
  });
}

async function upsertDemoUser(seedDb: Database, user: (typeof demoUsers)[number]) {
  await seedDb
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
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name: user.displayName,
        xId: user.xId,
        xHandle: user.xHandle,
        displayName: user.displayName,
        avatarUrl: null,
        profilePublic: true,
        rankingEnabled: true,
        updatedAt: sql`now()`,
      },
    });
}

async function upsertDemoDevice(seedDb: Database, userId: string): Promise<string> {
  const deviceHash = `demo_device_${userId}`;
  const [device] = await seedDb
    .insert(devices)
    .values({
      userId,
      deviceHash,
      label: "Demo device",
      blocked: false,
    })
    .onConflictDoUpdate({
      target: [devices.userId, devices.deviceHash],
      set: {
        label: "Demo device",
        blocked: false,
        lastSeenAt: sql`now()`,
      },
    })
    .returning({ id: devices.id });

  if (device) return device.id;

  const [fallbackDevice] = await seedDb
    .select({ id: devices.id })
    .from(devices)
    .where(and(eq(devices.userId, userId), eq(devices.deviceHash, deviceHash)))
    .limit(1);

  if (!fallbackDevice) {
    throw new Error(`Failed to find demo device for ${userId}`);
  }

  return fallbackDevice.id;
}

async function upsertUsage(
  seedDb: Database,
  userId: string,
  deviceId: string,
  userIndex: number,
) {
  const values = Array.from({ length: 30 }, (_, offset) => {
    const date = dateForOffset(offset);

    return usageEntriesFor(userIndex, date, offset).map((usage) => ({
      userId,
      deviceId,
      usageDate: usage.date,
      tool: usage.tool,
      model: usage.model,
      inputTokens: usage.input,
      outputTokens: usage.output,
      cacheReadTokens: usage.cacheRead,
      cacheWriteTokens: usage.cacheWrite,
      totalTokens: usage.total,
      estimatedCostMicros: estimateCostMicros(usage),
      blocked: false,
    }));
  }).flat();

  await seedDb
    .insert(dailyUsage)
    .values(values)
    .onConflictDoUpdate({
      target: [
        dailyUsage.userId,
        dailyUsage.deviceId,
        dailyUsage.usageDate,
        dailyUsage.tool,
        dailyUsage.model,
      ],
      set: {
        inputTokens: sql`excluded.input_tokens`,
        outputTokens: sql`excluded.output_tokens`,
        cacheReadTokens: sql`excluded.cache_read_tokens`,
        cacheWriteTokens: sql`excluded.cache_write_tokens`,
        totalTokens: sql`excluded.total_tokens`,
        estimatedCostMicros: sql`excluded.estimated_cost_micros`,
        blocked: false,
        updatedAt: sql`now()`,
      },
    });
}

async function main() {
  const { db } = await import("../src/db/client");

  for (const [userIndex, user] of demoUsers.entries()) {
    await upsertDemoUser(db, user);
    const deviceId = await upsertDemoDevice(db, user.id);
    await upsertUsage(db, user.id, deviceId, userIndex);
  }

  console.log(`Seed complete through ${toDateKey(today)}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
