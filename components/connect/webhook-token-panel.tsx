"use client";

import { CheckCircle2, Copy, KeyRound, ShieldCheck, Terminal, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";

import { buildCollectorCommand } from "@/src/lib/connect/collector-command";

export function WebhookTokenPanel() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const command = useMemo(
    () => (webhookUrl ? buildCollectorCommand(webhookUrl) : ""),
    [webhookUrl],
  );
  const commandLines = useMemo(() => (command ? command.split("\n") : []), [command]);

  async function createToken() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/webhook-tokens", { method: "POST" });
      const payload = (await response.json()) as { status: number; webhookUrl?: string; error?: string };

      if (!response.ok || payload.status !== 0 || !payload.webhookUrl) {
        throw new Error(payload.error ?? "failed to create webhook token");
      }

      setWebhookUrl(payload.webhookUrl);
      setCopied(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "failed to create webhook token");
    } finally {
      setLoading(false);
    }
  }

  async function copyCommand() {
    if (!command) return;
    await navigator.clipboard.writeText(command);
    setCopied(true);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-950">复制命令，上榜</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            生成你的私有上传地址后，把下面命令复制到终端运行。采集器会把本机 Token
            汇总上传到你的 X 身份，排行榜会自动更新。
          </p>
        </div>
        <button
          type="button"
          onClick={createToken}
          disabled={loading}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          <KeyRound className="size-4" aria-hidden="true" />
          {loading ? "生成中" : "生成我的上传地址"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-5 divide-y divide-slate-100 border-y border-slate-100">
        <div className="grid gap-3 py-4 sm:grid-cols-[2rem_1fr]">
          <div className="flex size-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
            <Terminal className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-950">1. 安装本地采集器</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              只安装一个本机命令 <code className="rounded bg-slate-100 px-1 py-0.5">tokenrank</code>
              ，用于扫描本机 AI 编程工具的用量汇总。
            </p>
          </div>
        </div>
        <div className="grid gap-3 py-4 sm:grid-cols-[2rem_1fr]">
          <div className="flex size-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
            <KeyRound className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-950">2. 绑定你的私有上传地址</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              上传地址决定数据写到哪个 X 账号；不要把这个地址发给别人。
            </p>
          </div>
        </div>
        <div className="grid gap-3 py-4 sm:grid-cols-[2rem_1fr]">
          <div className="flex size-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
            <UploadCloud className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-950">3. 预览并上传，排行榜自动计算</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              <code className="rounded bg-slate-100 px-1 py-0.5">preview</code> 先显示将上传的汇总，
              <code className="rounded bg-slate-100 px-1 py-0.5">upload</code> 成功后会进入今日、3 天、
              7 天、30 天和月榜。
            </p>
          </div>
        </div>
      </div>

      {command ? (
        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950">在终端运行这组命令</h3>
              <span className="text-xs text-slate-500">{commandLines.length} 行</span>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm leading-7 text-slate-50">
              <code>{command}</code>
            </pre>
          </div>
          <button
            type="button"
            onClick={copyCommand}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {copied ? (
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copied ? "已复制" : "复制全部命令"}
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          先点「生成我的上传地址」。生成后这里会出现可复制的安装、连接和上传命令。
        </div>
      )}

      <div className="mt-5 flex gap-3 rounded-lg bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          只上传按日期、工具、模型聚合后的 Token 数和估算金额；不上传代码、提示词、对话内容或文件内容。
        </p>
      </div>
    </section>
  );
}
