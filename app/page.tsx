import { BoardTabs, boardLabel } from "@/components/leaderboard/board-tabs";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { RangeTabs } from "@/components/leaderboard/range-tabs";
import { parseLeaderboardSearchParams } from "@/src/lib/leaderboard/search-params";
import { getLeaderboard } from "@/src/lib/users";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ board?: string; range?: string }>;
}) {
  const params = await searchParams;
  const { board, range } = parseLeaderboardSearchParams(params);
  const entries = await getLeaderboard(board, range);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:py-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">公开 X 身份排行榜</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Token 消耗榜</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            展示 AI Coding 工具的公开 Token 使用排名，当前榜单：{boardLabel(board)}。
          </p>
        </div>
        <RangeTabs active={range} board={board} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <BoardTabs active={board} range={range} />
      </section>

      <LeaderboardTable board={board} entries={entries} />
    </main>
  );
}
