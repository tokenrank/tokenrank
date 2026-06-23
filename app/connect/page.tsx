import Link from "next/link";

import { auth } from "@/src/auth/config";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const session = await auth();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-8">
      <div>
        <p className="text-sm font-semibold text-emerald-700">连接采集器</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">连接你的本地 Token 统计</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          登录 X 后在个人页生成私有 webhook，再把它配置到本地 collector。collector 只上传聚合统计。
        </p>
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        {session?.user ? (
          <>
            <h2 className="font-semibold text-slate-950">已登录</h2>
            <p className="mt-2 text-sm text-slate-600">
              前往我的仪表盘生成 webhook，并复制本地连接命令。
            </p>
            <Link
              href="/me"
              className="mt-5 inline-flex h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              打开我的仪表盘
            </Link>
          </>
        ) : (
          <>
            <h2 className="font-semibold text-slate-950">需要先登录 X</h2>
            <p className="mt-2 text-sm text-slate-600">
              登录后才能生成只属于你的上传地址，避免别人把数据写到你的账号下。
            </p>
            <Link
              href="/api/auth/signin/twitter?callbackUrl=/connect"
              prefetch={false}
              className="mt-5 inline-flex h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              使用 X 登录
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
