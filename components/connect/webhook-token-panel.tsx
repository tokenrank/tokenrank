"use client";

import { CheckCircle2, Copy, KeyRound, ShieldCheck, Terminal, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";

import { defaultCopy, text, type AppCopy } from "@/src/i18n/copy";
import { buildCollectorCommands } from "@/src/lib/connect/collector-command";

type CommandTarget = "macos" | "linux" | "windows";

function detectCommandTarget(): CommandTarget {
  if (typeof navigator === "undefined") {
    return "linux";
  }

  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = [nav.userAgentData?.platform, navigator.platform, navigator.userAgent]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (platform.includes("win")) {
    return "windows";
  }

  if (platform.includes("mac")) {
    return "macos";
  }

  return "linux";
}

function targetUsesWindowsCommand(target: CommandTarget) {
  return target === "windows";
}

export function WebhookTokenPanel({
  actions = defaultCopy.common.buttons,
  copy = defaultCopy.onboard.webhook,
}: {
  actions?: AppCopy["common"]["buttons"];
  copy?: AppCopy["onboard"]["webhook"];
}) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedManual, setCopiedManual] = useState(false);
  const [commandTarget, setCommandTarget] = useState<CommandTarget>(detectCommandTarget);

  const commands = useMemo(() => (webhookUrl ? buildCollectorCommands(webhookUrl) : null), [webhookUrl]);
  const command = targetUsesWindowsCommand(commandTarget) ? (commands?.windows ?? "") : (commands?.unix ?? "");
  const manualCommand = targetUsesWindowsCommand(commandTarget)
    ? (commands?.windowsManual ?? "")
    : (commands?.unixManual ?? "");

  async function createToken() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/webhook-tokens", { method: "POST" });
      const payload = (await response.json()) as { status: number; webhookUrl?: string; error?: string };

      if (!response.ok || payload.status !== 0 || !payload.webhookUrl) {
        throw new Error(payload.error ?? copy.errorFallback);
      }

      setWebhookUrl(payload.webhookUrl);
      setCopied(false);
      setCopiedManual(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.errorFallback);
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

  const targetLabel = copy.targetLabels[commandTarget];

  return (
    <section className="tr-shell tr-reveal min-w-0 overflow-hidden">
      <div className="tr-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-[color:var(--tr-line)] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="tr-data-label">Stage 02 / collector link</p>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-[-0.03em] text-[color:var(--tr-ivory)]">{copy.title}</h2>
            <p className="tr-body mt-2 max-w-2xl text-sm">{copy.body}</p>
          </div>
          <button
            type="button"
            onClick={createToken}
            disabled={loading}
            className="tr-button shrink-0 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <KeyRound className="size-4" aria-hidden="true" />
            {loading ? copy.generating : copy.generate}
          </button>
        </div>

        {error ? <p className="mt-4 text-sm font-bold text-[color:var(--tr-red)]">{error}</p> : null}

        <div className="mt-5 grid gap-px border border-[color:var(--tr-line)] bg-[color:var(--tr-line)] lg:grid-cols-3">
          <StepCard icon={<Terminal className="size-4" aria-hidden="true" />} title={copy.cards[0].title}>
            {copy.cards[0].body}
          </StepCard>
          <StepCard icon={<KeyRound className="size-4" aria-hidden="true" />} title={copy.cards[1].title}>
            {copy.cards[1].body}
          </StepCard>
          <StepCard icon={<UploadCloud className="size-4" aria-hidden="true" />} title={copy.cards[2].title}>
            {copy.cards[2].body}
          </StepCard>
        </div>

        {command ? (
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-black text-[color:var(--tr-ivory)]">
                    {targetUsesWindowsCommand(commandTarget)
                      ? copy.autoTitle.windows
                      : text(copy.autoTitle.unix, { target: targetLabel })}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[color:var(--tr-muted)]">
                    {targetUsesWindowsCommand(commandTarget) ? copy.autoBody.windows : copy.autoBody.unix}
                  </p>
                </div>
                <span className="text-xs font-bold text-[color:var(--tr-muted)]">{copy.oneLine}</span>
              </div>
              <div className="mb-3 inline-flex gap-px border border-[color:var(--tr-line)] bg-[color:var(--tr-line)] p-1">
                <TargetButton active={commandTarget === "macos"} onClick={() => selectCommandTarget("macos")}>
                  macOS
                </TargetButton>
                <TargetButton active={commandTarget === "linux"} onClick={() => selectCommandTarget("linux")}>
                  Linux
                </TargetButton>
                <TargetButton active={commandTarget === "windows"} onClick={() => selectCommandTarget("windows")}>
                  Windows PowerShell
                </TargetButton>
              </div>
              <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2 overflow-hidden border border-[color:var(--tr-line)] bg-black/45 p-2 shadow-inner">
                <pre className="min-w-0 overflow-x-scroll px-3 py-2 text-sm leading-7 text-[color:var(--tr-ivory)] [scrollbar-gutter:stable] tr-scrollbar">
                  <code className="block w-max min-w-full whitespace-pre">{command}</code>
                </pre>
                <button
                  type="button"
                  onClick={copyCommand}
                  aria-label={`${actions.copy} ${targetLabel}`}
                  className="tr-button min-h-10 shrink-0 px-3 py-2 text-sm"
                >
                  {copied ? (
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  ) : (
                    <Copy className="size-4" aria-hidden="true" />
                  )}
                  <span className="whitespace-nowrap">{copied ? actions.copied : actions.copy}</span>
                </button>
              </div>
            </div>
            <div className="tr-card-soft p-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-black text-[color:var(--tr-ivory)]">{copy.manualTitle}</h3>
                  <p className="mt-1 text-xs font-semibold text-[color:var(--tr-muted)]">{copy.manualBody}</p>
                </div>
                <span className="text-xs font-bold text-[color:var(--tr-muted)]">{copy.oneLine}</span>
              </div>
              <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2 overflow-hidden border border-[color:var(--tr-line)] bg-black/30 p-2">
                <pre className="min-w-0 overflow-x-scroll px-2 py-2 text-sm leading-7 text-[color:var(--tr-ivory-soft)] [scrollbar-gutter:stable] tr-scrollbar">
                  <code className="block w-max min-w-full whitespace-pre">{manualCommand}</code>
                </pre>
                <button
                  type="button"
                  onClick={copyManualCommand}
                  aria-label={actions.copy}
                  className="tr-button-secondary min-h-10 shrink-0 px-3 py-2 text-sm"
                >
                  {copiedManual ? (
                    <CheckCircle2 className="size-4 text-[color:var(--tr-green)]" aria-hidden="true" />
                  ) : (
                    <Copy className="size-4" aria-hidden="true" />
                  )}
                  <span className="whitespace-nowrap">{copiedManual ? actions.copied : actions.copy}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 border border-dashed border-[color:var(--tr-line)] bg-black/20 p-4 font-mono text-xs leading-6 text-[color:var(--tr-muted)]">
            {copy.empty}
          </div>
        )}

        <div className="mt-5 flex gap-3 border-l-4 border-[color:var(--tr-gold)] bg-[color:var(--tr-gold)]/8 p-4 text-sm leading-6 text-[color:var(--tr-ivory-soft)]">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[color:var(--tr-gold-bright)]" aria-hidden="true" />
          <p>{copy.privacy}</p>
        </div>
      </div>
    </section>
  );
}

function StepCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[color:var(--tr-surface-2)] p-4">
      <div className="flex size-9 items-center justify-center bg-[color:var(--tr-gold)] text-[#080b07]">
        {icon}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-black text-[color:var(--tr-ivory)]">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-[color:var(--tr-muted)]">{children}</p>
      </div>
    </div>
  );
}

function TargetButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "bg-[color:var(--tr-gold)] px-3 py-1.5 font-mono text-xs font-black uppercase text-[#080705]"
          : "bg-[color:var(--tr-surface-2)] px-3 py-1.5 font-mono text-xs font-bold uppercase text-[color:var(--tr-muted)] hover:text-[color:var(--tr-ivory)]"
      }
    >
      {children}
    </button>
  );
}
