import Link from "next/link";

import { BOARD_KEYS, type BoardKey, type RangeKey } from "@/src/lib/types";

const BOARD_LABELS: Record<BoardKey, string> = {
  total: "总榜",
  cost: "金额榜",
  codex: "Codex",
  "claude-code": "Claude Code",
  hermes: "Hermes",
  openclaw: "OpenClaw",
  cline: "Cline",
  opencode: "opencode",
  workbuddy: "WorkBuddy",
  gemini: "Gemini",
  zcode: "ZCode",
  kimi: "Kimi",
  "kilo-code": "Kilo Code",
  "codex-vps": "codex-vps",
  "roo-code": "Roo Code",
  qwen: "Qwen",
  "codex-cache": "codex-cache",
};

export function boardLabel(board: BoardKey): string {
  return BOARD_LABELS[board];
}

export function BoardTabs({ active, range }: { active: BoardKey; range: RangeKey }) {
  return (
    <div className="flex flex-wrap gap-2">
      {BOARD_KEYS.map((board) => (
        <Link
          key={board}
          href={`/?board=${board}&range=${range}`}
          aria-current={active === board ? "page" : undefined}
          className={
            active === board
              ? "rounded-md border border-slate-950 bg-slate-950 px-3 py-1.5 text-sm font-semibold text-white"
              : "rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          }
        >
          {boardLabel(board)}
        </Link>
      ))}
    </div>
  );
}
