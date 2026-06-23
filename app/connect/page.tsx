import Link from "next/link";

import { auth } from "@/src/auth/config";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const session = await auth();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-8">
      <div>
        <p className="text-sm font-semibold text-emerald-700">连接采集器</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">把本机 Token 用量传到排行榜</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          先用 X 绑定公开身份，再生成私有上传地址，最后运行本地采集器上传聚合统计。
        </p>
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        {session?.user ? (
          <>
            <h2 className="font-semibold text-slate-950">下一步：生成上榜命令</h2>
            <p className="mt-2 text-sm text-slate-600">
              我的仪表盘会生成一组可复制的终端命令：安装采集器、绑定上传地址、预览并上传。
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
              排行榜显示公开 X 身份。登录后才能生成只属于你的上传地址，避免别人把数据写到你的账号下。
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

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-950">用户上榜路径</h2>
        <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          <li>1. X 登录：确认排行榜展示哪个公开身份。</li>
          <li>2. 复制命令：生成私有上传地址并安装本地采集器。</li>
          <li>3. 上传汇总：只上传 Token 聚合数据，排行榜自动刷新。</li>
        </ol>
      </section>
    </main>
  );
}
