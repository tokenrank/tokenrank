import type { DashboardUsageRow } from "./summary";
import type { LeaderboardEntry } from "../types";

export type CompetitiveContext = {
  rank: number | null;
  participants: number;
  topPercent: number | null;
  currentStreak: number;
  last7Tokens: number;
  previous7Tokens: number;
  changePercent: number | null;
};

export function buildCompetitiveContext({
  daily,
  leaderboard,
  now = new Date(),
  userId,
}: {
  daily: DashboardUsageRow[];
  leaderboard: LeaderboardEntry[];
  now?: Date;
  userId: string;
}): CompetitiveContext {
  const today = utcDateKey(now);
  const last7Start = shiftUtcDate(today, -6);
  const previous7Start = shiftUtcDate(today, -13);
  const previous7End = shiftUtcDate(today, -7);
  const entry = leaderboard.find((candidate) => candidate.userId === userId);
  const participants = leaderboard.length;
  const totalsByDate = aggregateByDate(daily);
  const last7Tokens = sumWindow(totalsByDate, last7Start, today);
  const previous7Tokens = sumWindow(totalsByDate, previous7Start, previous7End);
  const rank = entry?.rank ?? null;

  return {
    rank,
    participants,
    topPercent:
      rank && participants > 0
        ? Math.max(1, Math.ceil((rank / participants) * 100))
        : null,
    currentStreak: activeStreak(new Set(totalsByDate.keys()), today),
    last7Tokens,
    previous7Tokens,
    changePercent:
      previous7Tokens > 0
        ? Math.round(((last7Tokens - previous7Tokens) / previous7Tokens) * 100)
        : null,
  };
}

function aggregateByDate(rows: DashboardUsageRow[]): Map<string, number> {
  const totals = new Map<string, number>();

  for (const row of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.usageDate)) continue;
    totals.set(row.usageDate, (totals.get(row.usageDate) ?? 0) + row.totalTokens);
  }

  return totals;
}

function sumWindow(totals: Map<string, number>, start: string, end: string): number {
  let total = 0;

  for (const [date, value] of totals) {
    if (date >= start && date <= end) total += value;
  }

  return total;
}

function activeStreak(activeDates: Set<string>, today: string): number {
  let cursor = today;

  if (!activeDates.has(cursor)) {
    cursor = shiftUtcDate(cursor, -1);
    if (!activeDates.has(cursor)) return 0;
  }

  let streak = 0;
  while (activeDates.has(cursor)) {
    streak += 1;
    cursor = shiftUtcDate(cursor, -1);
  }

  return streak;
}

function shiftUtcDate(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function utcDateKey(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}
