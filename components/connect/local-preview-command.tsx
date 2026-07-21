"use client";

import { Bot, Check, Copy, ExternalLink, Terminal } from "lucide-react";
import { forwardRef, useRef, useState } from "react";

import type { AppCopy } from "@/src/i18n/copy";
import { CLI_REPOSITORY_URL } from "@/src/lib/connect/cli-release";
import { buildPreviewAgentPrompt } from "@/src/lib/connect/collector-command";

type PreviewCopy = AppCopy["onboard"]["preview"];
type PreviewMethod = "agent" | "terminal";

export function LocalPreviewCommand({ copy }: { copy: PreviewCopy }) {
  const commandRef = useRef<HTMLInputElement>(null);
  const agentTabRef = useRef<HTMLButtonElement>(null);
  const terminalTabRef = useRef<HTMLButtonElement>(null);
  const [method, setMethod] = useState<PreviewMethod>("agent");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const agentPrompt = buildPreviewAgentPrompt();

  async function copyText(value: string, fallback?: () => boolean) {
    let didCopy = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        didCopy = true;
      } else {
        didCopy = fallback?.() ?? false;
      }
    } catch {
      didCopy = fallback?.() ?? false;
    }

    setCopied(didCopy);
    setCopyError(!didCopy);
  }

  function copySelectedCommand() {
    if (!commandRef.current) return false;
    commandRef.current.select();

    try {
      return document.execCommand("copy");
    } catch {
      return false;
    }
  }

  function selectMethod(nextMethod: PreviewMethod) {
    setMethod(nextMethod);
    setCopied(false);
    setCopyError(false);
  }

  function handleMethodKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    let nextMethod: PreviewMethod | null = null;

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      nextMethod = method === "agent" ? "terminal" : "agent";
    } else if (event.key === "Home") {
      nextMethod = "agent";
    } else if (event.key === "End") {
      nextMethod = "terminal";
    }

    if (!nextMethod) return;
    event.preventDefault();
    selectMethod(nextMethod);
    (nextMethod === "agent" ? agentTabRef : terminalTabRef).current?.focus();
  }

  return (
    <section className="tr-shell tr-reveal">
      <div className="tr-panel overflow-hidden">
        <div className="grid gap-5 p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:p-6">
          <span className="flex size-11 shrink-0 items-center justify-center bg-[color:var(--tr-gold)] text-[#080b07]">
            <Terminal className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="tr-data-label">{copy.eyebrow}</p>
            <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-[-0.025em] text-[color:var(--tr-ivory)] sm:text-3xl">
              {copy.title}
            </h2>
            <p className="tr-body mt-3 max-w-3xl text-sm">{copy.body}</p>
          </div>
        </div>

        <div className="border-t border-[color:var(--tr-line)] bg-[#080b08] p-4 sm:p-5">
          <p className="mb-2 font-mono text-[0.65rem] font-black uppercase tracking-[0.08em] text-[color:var(--tr-muted)]">
            {copy.methodLabel}
          </p>
          <div
            role="tablist"
            aria-label={copy.methodLabel}
            className="inline-flex max-w-full gap-px border border-[color:var(--tr-line)] bg-[color:var(--tr-line)] p-1"
          >
            <MethodTab
              ref={agentTabRef}
              id="preview-method-agent-tab"
              active={method === "agent"}
              controls="preview-method-agent-panel"
              onClick={() => selectMethod("agent")}
              onKeyDown={handleMethodKeyDown}
              icon={<Bot className="size-4" aria-hidden="true" />}
            >
              {copy.methods.agent}
            </MethodTab>
            <MethodTab
              ref={terminalTabRef}
              id="preview-method-terminal-tab"
              active={method === "terminal"}
              controls="preview-method-terminal-panel"
              onClick={() => selectMethod("terminal")}
              onKeyDown={handleMethodKeyDown}
              icon={<Terminal className="size-4" aria-hidden="true" />}
            >
              {copy.methods.terminal}
            </MethodTab>
          </div>

          {method === "agent" ? (
            <div
              id="preview-method-agent-panel"
              role="tabpanel"
              aria-label={copy.methods.agent}
              aria-labelledby="preview-method-agent-tab"
              className="mt-4 space-y-3"
            >
              <div>
                <h3 className="text-sm font-black text-[color:var(--tr-ivory)]">{copy.agentTitle}</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-[color:var(--tr-muted)]">{copy.agentBody}</p>
              </div>
              <div className="grid min-w-0 gap-2 overflow-hidden border border-[color:var(--tr-line)] bg-black/35 p-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <pre className="min-w-0 overflow-x-auto px-3 py-2 font-mono text-sm leading-6 text-[color:var(--tr-ivory)] tr-scrollbar">
                  <code className="block w-max min-w-full whitespace-pre">{agentPrompt}</code>
                </pre>
                <button
                  type="button"
                  aria-label={copied ? copy.agentCopied : copy.agentCopy}
                  className="tr-button min-h-11 shrink-0"
                  onClick={() => copyText(agentPrompt)}
                >
                  {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                  {copied ? copy.agentCopied : copy.agentCopy}
                </button>
              </div>
            </div>
          ) : (
            <div
              id="preview-method-terminal-panel"
              role="tabpanel"
              aria-label={copy.methods.terminal}
              aria-labelledby="preview-method-terminal-tab"
              className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <input
                ref={commandRef}
                aria-label={copy.copy}
                className="min-h-12 min-w-0 border border-[color:var(--tr-line)] bg-black/35 px-4 font-mono text-sm font-bold text-[color:var(--tr-gold)] outline-none selection:bg-[color:var(--tr-gold)] selection:text-[#080b07]"
                readOnly
                value={copy.command}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button
                type="button"
                aria-label={copied ? copy.copied : copy.copy}
                className="tr-button min-h-12"
                onClick={() => copyText(copy.command, copySelectedCommand)}
              >
                {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                {copied ? copy.copied : copy.copy}
              </button>
            </div>
          )}

          <p className="mt-3 border-l-2 border-[color:var(--tr-orange)] pl-3 text-xs font-semibold leading-5 text-[color:var(--tr-ivory-soft)]">
            {copy.nodeRequirement}
          </p>
          {copyError ? <p className="mt-2 text-xs font-bold text-[color:var(--tr-red)]">{copy.copyError}</p> : null}
          <div className="mt-3 flex flex-col gap-2 font-mono text-[0.65rem] font-black uppercase tracking-[0.06em] sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[color:var(--tr-muted)]">{copy.privacy}</span>
            <a
              href={CLI_REPOSITORY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[color:var(--tr-gold)] hover:text-[color:var(--tr-orange)]"
            >
              {copy.source}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

const MethodTab = forwardRef<
  HTMLButtonElement,
  {
    active: boolean;
    children: React.ReactNode;
    controls: string;
    icon: React.ReactNode;
    id: string;
    onClick: () => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  }
>(function MethodTab({ active, children, controls, icon, id, onClick, onKeyDown }, ref) {
  return (
    <button
      ref={ref}
      id={id}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={
        active
          ? "flex min-w-0 items-center gap-2 bg-[color:var(--tr-gold)] px-3 py-2 text-sm font-black text-[#080705] sm:px-4"
          : "flex min-w-0 items-center gap-2 bg-[color:var(--tr-surface-2)] px-3 py-2 text-sm font-bold text-[color:var(--tr-muted)] hover:text-[color:var(--tr-ivory)] sm:px-4"
      }
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
});
