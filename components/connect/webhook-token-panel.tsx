"use client";

import { Copy, KeyRound } from "lucide-react";
import { useMemo, useState } from "react";

import { buildCollectorCommand } from "@/src/lib/connect/collector-command";

export function WebhookTokenPanel() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const command = useMemo(
    () => (webhookUrl ? buildCollectorCommand(webhookUrl) : ""),
    [webhookUrl],
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "failed to create webhook token");
    } finally {
      setLoading(false);
    }
  }

  async function copyCommand() {
    if (!command) return;
    await navigator.clipboard.writeText(command);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-950">采集器连接</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            生成一次私有 webhook URL。它只用于上传聚合后的 Token 统计，不上传代码、提示词或对话内容。
          </p>
        </div>
        <button
          type="button"
          onClick={createToken}
          disabled={loading}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          <KeyRound className="size-4" aria-hidden="true" />
          {loading ? "生成中" : "生成 Webhook"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {command ? (
        <div className="mt-5 space-y-3">
          <div className="rounded-lg bg-slate-950 p-4 text-sm text-slate-50">
            <code className="block overflow-x-auto whitespace-pre">{command}</code>
          </div>
          <button
            type="button"
            onClick={copyCommand}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Copy className="size-4" aria-hidden="true" />
            复制命令
          </button>
        </div>
      ) : null}
    </section>
  );
}
