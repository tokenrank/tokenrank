import Link from "next/link";

import { WebhookTokenPanel } from "@/components/connect/webhook-token-panel";
import { auth } from "@/src/auth/config";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-8">
        <div>
          <p className="text-sm font-semibold text-emerald-700">我的 TokenRank</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">登录后开始上榜</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            排行榜按公开 X 身份展示。登录后生成你的私有上传地址，再安装本地采集器开启自动同步。
          </p>
        </div>

        <Link
          href="/api/auth/signin/twitter?callbackUrl=/me"
          prefetch={false}
          className="mt-6 inline-flex h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
        >
          使用 X 登录
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">我的 TokenRank</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">三步开启自动上榜</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            已登录：{user.name ?? "X user"}。复制自动同步命令运行一次，之后本机会定时上传 Token
            汇总到今日、3 天、7 天、30 天和月榜。
          </p>
        </div>
        <Link
          href="/api/auth/signout?callbackUrl=/"
          prefetch={false}
          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          退出
        </Link>
      </section>

      <div className="mt-6 space-y-4">
        <WebhookTokenPanel />
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-950">上传成功后怎么看结果</h2>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-600 sm:grid-cols-3">
            <p>
              <span className="font-semibold text-slate-900">排行榜：</span>
              首页会按时间范围和工具榜单自动排名。
            </p>
            <p>
              <span className="font-semibold text-slate-900">个人页：</span>
              `/u/你的X用户名` 会展示公开统计。
            </p>
            <p>
              <span className="font-semibold text-slate-900">持续更新：</span>
              自动同步默认每天 12:00 和 24:00 刷新；也可以用手动刷新命令立即上传。
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
