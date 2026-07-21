"use client";

import { Check, Copy, ExternalLink, Terminal } from "lucide-react";
import { useRef, useState } from "react";

import type { AppCopy } from "@/src/i18n/copy";
import { CLI_REPOSITORY_URL } from "@/src/lib/connect/cli-release";

type PreviewCopy = AppCopy["onboard"]["preview"];

export function LocalPreviewCommand({ copy }: { copy: PreviewCopy }) {
  const commandRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    let didCopy = false;

    function copyFromSelectedInput() {
      if (!commandRef.current) return false;

      commandRef.current.select();

      try {
        return document.execCommand("copy");
      } catch {
        return false;
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copy.command);
        didCopy = true;
      } else {
        didCopy = copyFromSelectedInput();
      }
    } catch {
      didCopy = copyFromSelectedInput();
    }

    setCopied(didCopy);
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
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              ref={commandRef}
              aria-label={copy.copy}
              className="min-h-12 min-w-0 border border-[color:var(--tr-line)] bg-black/35 px-4 font-mono text-sm font-bold text-[color:var(--tr-gold)] outline-none selection:bg-[color:var(--tr-gold)] selection:text-[#080b07]"
              readOnly
              value={copy.command}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button type="button" className="tr-button min-h-12" onClick={copyCommand}>
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? copy.copied : copy.copy}
            </button>
          </div>
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
