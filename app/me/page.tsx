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
          <h1 className="mt-1 text-3xl font-bold text-slate-950">登录后连接采集器</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            使用 X 登录后，你可以生成私有 webhook，连接本地 collector，并在公开排行榜展示你的统计。
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
          <h1 className="mt-1 text-3xl font-bold text-slate-950">采集器与账号</h1>
          <p className="mt-2 text-sm text-slate-600">已登录：{user.name ?? "X user"}</p>
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
          <h2 className="font-semibold text-slate-950">本地运行方式</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            当前 Web MVP 已支持 webhook 上传和排行榜展示。collector CLI 会在下一阶段补齐，先使用这里生成的
            webhook URL 作为连接目标。
          </p>
        </section>
      </div>
    </main>
  );
}
