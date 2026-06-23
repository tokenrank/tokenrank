export default function RulesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-8">
      <div>
        <p className="text-sm font-semibold text-emerald-700">规则说明</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">TokenRank 规则</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          排行榜用于公开记录 AI Coding Token 使用量，目标是好玩、透明、可分享，不是严肃审计。
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <RuleCard title="只上传 Token 汇总">
          采集器只发送按日期、工具、模型聚合后的 Token 数和预估金额。不上传代码、提示词、对话、文件名或文件内容。
        </RuleCard>
        <RuleCard title="同设备同日覆盖">
          同一个设备在同一天、同工具、同模型的重复上传会覆盖旧数据，不会重复累加。
        </RuleCard>
        <RuleCard title="最多计入 3 台设备">
          每个用户在每个榜单周期内只计入 Token 使用量最高的 3 台设备，降低刷设备作弊的收益。
        </RuleCard>
        <RuleCard title="明显异常可以移除">
          服务端会校验工具、日期、非负整数和 webhook 权限。明显虚假的数据可以被标记、屏蔽或移出排行榜。
        </RuleCard>
        <RuleCard title="X 分享不自动发帖">
          MVP 使用 X Web Intent 打开分享窗口，不会代替用户自动发布，也不会读取你的发帖权限。
        </RuleCard>
      </div>
    </main>
  );
}

function RuleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{children}</p>
    </section>
  );
}
