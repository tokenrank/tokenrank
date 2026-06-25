"use client";

import { CheckCircle2, Copy, KeyRound, ShieldCheck, Terminal, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";

import { buildCollectorCommands } from "@/src/lib/connect/collector-command";

type CommandTarget = "unix" | "windows";

export function WebhookTokenPanel() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedManual, setCopiedManual] = useState(false);
  const [commandTarget, setCommandTarget] = useState<CommandTarget>("unix");
  const commands = useMemo(
    () => (webhookUrl ? buildCollectorCommands(webhookUrl) : null),
    [webhookUrl],
  );
  const command = commands?.[commandTarget] ?? "";
  const manualCommand =
    commandTarget === "windows" ? (commands?.windowsManual ?? "") : (commands?.unixManual ?? "");
  const commandLines = useMemo(() => (command ? command.split("\n") : []), [command]);
  const manualCommandLines = useMemo(
    () => (manualCommand ? manualCommand.split("\n") : []),
    [manualCommand],
  );

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
      setCopiedManual(false);
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

  async function copyManualCommand() {
    if (!manualCommand) return;
    await navigator.clipboard.writeText(manualCommand);
    setCopiedManual(true);
  }

  function selectCommandTarget(nextTarget: CommandTarget) {
    setCommandTarget(nextTarget);
    setCopied(false);
    setCopiedManual(false);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-950">复制命令，上榜</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            生成你的私有上传地址后，把自动同步命令复制到终端运行一次。之后采集器会在后台定时上传本机
            Token 汇总，排行榜自动更新。
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
            <h3 className="text-sm font-semibold text-slate-950">1. 登录 X，确认公开身份</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              当前账号会作为排行榜身份。上传地址只绑定到这个 X 账号，别人无法用自己的数据顶替你。
            </p>
          </div>
        </div>
        <div className="grid gap-3 py-4 sm:grid-cols-[2rem_1fr]">
          <div className="flex size-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
            <KeyRound className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-950">2. 安装采集器，绑定上传地址</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              macOS / Linux 打开终端，Windows 打开 PowerShell。命令会安装{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5">tokenrank</code>
              ，并把私有上传地址保存在本机。
            </p>
          </div>
        </div>
        <div className="grid gap-3 py-4 sm:grid-cols-[2rem_1fr]">
          <div className="flex size-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
            <UploadCloud className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-950">3. 开启后台自动同步</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              自动同步默认每天 12:00 和 24:00 运行。macOS 用 LaunchAgent，Linux 用 systemd user
              service，Windows 用任务计划程序。
            </p>
          </div>
        </div>
      </div>

      {command ? (
        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  {commandTarget === "windows"
                    ? "自动同步：在 Windows PowerShell 运行"
                    : "自动同步：在 macOS / Linux 终端运行"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {commandTarget === "windows"
                    ? "按 Win 键搜索 PowerShell，打开后粘贴下面命令。它会安装任务计划程序。"
                    : "打开 Terminal / 终端，粘贴下面命令。它会安装后台自动同步服务。"}
                </p>
              </div>
              <span className="text-xs text-slate-500">{commandLines.length} 行</span>
            </div>
            <div className="mb-3 inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => selectCommandTarget("unix")}
                className={`rounded px-3 py-1.5 text-sm font-medium ${
                  commandTarget === "unix"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                macOS / Linux
              </button>
              <button
                type="button"
                onClick={() => selectCommandTarget("windows")}
                className={`rounded px-3 py-1.5 text-sm font-medium ${
                  commandTarget === "windows"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Windows PowerShell
              </button>
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
            {copied ? "已复制" : commandTarget === "windows" ? "复制 Windows 命令" : "复制 macOS / Linux 命令"}
          </button>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">手动刷新</h3>
                <p className="mt-1 text-xs text-slate-500">
                  后台同步已安装后一般不用每天手动运行；需要立刻刷新时再复制这两行。
                </p>
              </div>
              <span className="text-xs text-slate-500">{manualCommandLines.length} 行</span>
            </div>
            <pre className="overflow-x-auto rounded-md bg-white p-3 text-sm leading-7 text-slate-800">
              <code>{manualCommand}</code>
            </pre>
            <button
              type="button"
              onClick={copyManualCommand}
              className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {copiedManual ? (
                <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copiedManual ? "已复制" : "复制手动刷新命令"}
            </button>
          </div>
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
