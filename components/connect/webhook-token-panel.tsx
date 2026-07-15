"use client";

import { Bot, CheckCircle2, Copy, KeyRound, ShieldAlert, ShieldCheck, Terminal, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { defaultCopy, text, type AppCopy } from "@/src/i18n/copy";
import { buildAgentPrompt, buildCollectorCommands } from "@/src/lib/connect/collector-command";

type CommandTarget = "unix" | "windows";
type ConnectionMethod = "agent" | "terminal";

function detectCommandTarget(): CommandTarget {
  if (typeof navigator === "undefined") {
    return "unix";
  }

  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = [nav.userAgentData?.platform, navigator.platform, navigator.userAgent]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (platform.includes("win")) {
    return "windows";
  }

  return "unix";
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
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>("agent");
  const [copiedAgent, setCopiedAgent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedManual, setCopiedManual] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [commandTarget, setCommandTarget] = useState<CommandTarget>(detectCommandTarget);
  const commandSectionRef = useRef<HTMLDivElement>(null);
  const agentTabRef = useRef<HTMLButtonElement>(null);
  const terminalTabRef = useRef<HTMLButtonElement>(null);

  const commands = useMemo(() => (webhookUrl ? buildCollectorCommands(webhookUrl) : null), [webhookUrl]);
  const command = targetUsesWindowsCommand(commandTarget) ? (commands?.windows ?? "") : (commands?.unix ?? "");
  const agentPrompt = webhookUrl ? buildAgentPrompt(webhookUrl) : "";
  const manualCommand = targetUsesWindowsCommand(commandTarget)
    ? (commands?.windowsManual ?? "")
    : (commands?.unixManual ?? "");

  useEffect(() => {
    if (!webhookUrl) return;
    const commandSection = commandSectionRef.current;
    if (typeof commandSection?.scrollIntoView === "function") {
      commandSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [webhookUrl]);

  async function createToken() {
    setLoading(true);
    setError("");
    setCopyError("");

    try {
      const response = await fetch("/api/webhook-tokens", { method: "POST" });
      const payload = (await response.json()) as { status: number; webhookUrl?: string; error?: string };

      if (!response.ok || payload.status !== 0 || !payload.webhookUrl) {
        throw new Error(payload.error ?? copy.errorFallback);
      }

      setWebhookUrl(payload.webhookUrl);
      setConnectionMethod("agent");
      setCopiedAgent(false);
      setCopied(false);
      setCopiedManual(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.errorFallback);
    } finally {
      setLoading(false);
    }
  }

  async function copyText(value: string, setCopiedState: (copied: boolean) => void) {
    setCopiedState(false);
    setCopyError("");

    try {
      const clipboard = navigator.clipboard;
      if (!clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await clipboard.writeText(value);
      setCopiedState(true);
    } catch {
      setCopiedState(false);
      setCopyError(copy.copyError);
    }
  }

  async function copyAgentPrompt() {
    if (!agentPrompt) return;
    await copyText(agentPrompt, setCopiedAgent);
  }

  async function copyCommand() {
    if (!command) return;
    await copyText(command, setCopied);
  }

  async function copyManualCommand() {
    if (!manualCommand) return;
    await copyText(manualCommand, setCopiedManual);
  }

  function selectCommandTarget(nextTarget: CommandTarget) {
    setCommandTarget(nextTarget);
    setCopiedAgent(false);
    setCopied(false);
    setCopiedManual(false);
    setCopyError("");
  }

  function selectConnectionMethod(nextMethod: ConnectionMethod) {
    setConnectionMethod(nextMethod);
    setCopyError("");
  }

  function handleMethodKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    let nextMethod: ConnectionMethod | null = null;

    if (event.key === "ArrowLeft") {
      nextMethod = connectionMethod === "agent" ? "terminal" : "agent";
    } else if (event.key === "ArrowRight") {
      nextMethod = connectionMethod === "agent" ? "terminal" : "agent";
    } else if (event.key === "Home") {
      nextMethod = "agent";
    } else if (event.key === "End") {
      nextMethod = "terminal";
    }

    if (!nextMethod) return;

    event.preventDefault();
    selectConnectionMethod(nextMethod);
    (nextMethod === "agent" ? agentTabRef : terminalTabRef).current?.focus();
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
          <div ref={commandSectionRef} className="mt-5 scroll-mt-24 space-y-4">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-[color:var(--tr-muted)]">
                {copy.methodLabel}
              </p>
              <div
                role="tablist"
                aria-label={copy.methodLabel}
                className="inline-flex gap-px border border-[color:var(--tr-line)] bg-[color:var(--tr-line)] p-1"
              >
                <button
                  ref={agentTabRef}
                  id="connection-method-agent-tab"
                  type="button"
                  role="tab"
                  aria-selected={connectionMethod === "agent"}
                  aria-controls="connection-method-agent-panel"
                  tabIndex={connectionMethod === "agent" ? 0 : -1}
                  onClick={() => selectConnectionMethod("agent")}
                  onKeyDown={handleMethodKeyDown}
                  className={
                    connectionMethod === "agent"
                      ? "flex items-center gap-2 bg-[color:var(--tr-gold)] px-4 py-2 text-sm font-black text-[#080705]"
                      : "flex items-center gap-2 bg-[color:var(--tr-surface-2)] px-4 py-2 text-sm font-bold text-[color:var(--tr-muted)] hover:text-[color:var(--tr-ivory)]"
                  }
                >
                  <Bot className="size-4" aria-hidden="true" />
                  {copy.methods.agent}
                </button>
                <button
                  ref={terminalTabRef}
                  id="connection-method-terminal-tab"
                  type="button"
                  role="tab"
                  aria-selected={connectionMethod === "terminal"}
                  aria-controls="connection-method-terminal-panel"
                  tabIndex={connectionMethod === "terminal" ? 0 : -1}
                  onClick={() => selectConnectionMethod("terminal")}
                  onKeyDown={handleMethodKeyDown}
                  className={
                    connectionMethod === "terminal"
                      ? "flex items-center gap-2 bg-[color:var(--tr-gold)] px-4 py-2 text-sm font-black text-[#080705]"
                      : "flex items-center gap-2 bg-[color:var(--tr-surface-2)] px-4 py-2 text-sm font-bold text-[color:var(--tr-muted)] hover:text-[color:var(--tr-ivory)]"
                  }
                >
                  <Terminal className="size-4" aria-hidden="true" />
                  {copy.methods.terminal}
                </button>
              </div>
            </div>

            {connectionMethod === "agent" ? (
              <div
                id="connection-method-agent-panel"
                role="tabpanel"
                aria-labelledby="connection-method-agent-tab"
                className="space-y-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Bot className="size-4 text-[color:var(--tr-gold-bright)]" aria-hidden="true" />
                    <h3 className="text-sm font-black text-[color:var(--tr-ivory)]">{copy.agentTitle}</h3>
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[color:var(--tr-muted)]">{copy.agentBody}</p>
                </div>
                <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2 overflow-hidden border border-[color:var(--tr-line)] bg-black/45 p-2 shadow-inner">
                  <pre className="min-w-0 overflow-x-scroll px-3 py-2 text-sm leading-7 text-[color:var(--tr-ivory)] [scrollbar-gutter:stable] tr-scrollbar">
                    <code className="block w-max min-w-full whitespace-pre">{agentPrompt}</code>
                  </pre>
                  <button type="button" onClick={copyAgentPrompt} aria-label={copy.agentCopyLabel} className="tr-button min-h-10 shrink-0 px-3 py-2 text-sm">
                    {copiedAgent ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                    <span className="whitespace-nowrap">{copiedAgent ? actions.copied : actions.copy}</span>
                  </button>
                </div>
                <div className="flex gap-3 border-l-4 border-[color:var(--tr-orange)] bg-[color:var(--tr-orange-soft)]/25 p-4 text-xs leading-5 text-[color:var(--tr-ivory-soft)]">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[color:var(--tr-orange)]" aria-hidden="true" />
                  <p>{copy.agentSecurity}</p>
                </div>
              </div>
            ) : (
              <div
                id="connection-method-terminal-panel"
                role="tabpanel"
                aria-labelledby="connection-method-terminal-tab"
                className="space-y-4"
              >
                <CommandTargetSelector
                  active={commandTarget}
                  ariaLabel={copy.platformLabel}
                  onSelect={selectCommandTarget}
                />
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
            )}
            {copyError ? (
              <p role="alert" className="text-sm font-bold text-[color:var(--tr-red)]">
                {copyError}
              </p>
            ) : null}
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

function CommandTargetSelector({
  active,
  ariaLabel,
  onSelect,
}: {
  active: CommandTarget;
  ariaLabel: string;
  onSelect: (target: CommandTarget) => void;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex gap-px border border-[color:var(--tr-line)] bg-[color:var(--tr-line)] p-1"
    >
      <TargetButton active={active === "unix"} onClick={() => onSelect("unix")}>
        macOS / Linux
      </TargetButton>
      <TargetButton active={active === "windows"} onClick={() => onSelect("windows")}>
        Windows PowerShell
      </TargetButton>
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
      aria-pressed={active}
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
