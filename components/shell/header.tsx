import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-slate-950">
          <span className="flex size-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
            TR
          </span>
          <span>TokenRank</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1 text-sm font-medium text-slate-600 sm:gap-2">
          <Link
            href="/rules"
            className="whitespace-nowrap rounded-md px-2 py-2 hover:bg-slate-100 hover:text-slate-950 sm:px-3"
          >
            规则
          </Link>
          <Link
            href="/me"
            className="whitespace-nowrap rounded-md px-2 py-2 hover:bg-slate-100 hover:text-slate-950 sm:px-3"
          >
            <span className="sm:hidden">我的</span>
            <span className="hidden sm:inline">我的仪表盘</span>
          </Link>
          <Link
            href="/connect"
            className="whitespace-nowrap rounded-md bg-slate-950 px-2 py-2 text-white hover:bg-slate-800 sm:px-3"
          >
            <span className="sm:hidden">连接</span>
            <span className="hidden sm:inline">连接采集器</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
