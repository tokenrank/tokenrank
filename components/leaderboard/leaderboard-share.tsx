"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

import type { AppCopy } from "@/src/i18n/copy";

export function LeaderboardShare({
  copy,
  shareText,
  shareUrl,
}: {
  copy: AppCopy["home"]["share"];
  shareText: string;
  shareUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const fullText = `${shareText}\n${shareUrl}`;
  const xShareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(fullText)}`;

  async function copyShareText() {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(fullText);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = fullText;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <aside className="tr-share-card lg:self-start">
      <div>
        <p className="tr-kicker">{copy.title}</p>
        <p className="mt-2 font-mono text-xs font-semibold text-[color:var(--tr-muted)]">{copy.subtitle}</p>
      </div>
      <div className="mt-4">
        <p className="tr-share-text bg-black/22 p-3 text-xs leading-6 text-[color:var(--tr-ivory-soft)]">
          {shareText}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={xShareUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={copy.post}
          className="tr-button h-11 min-h-11 px-4 py-2 text-sm"
        >
          <Share2 className="size-4" aria-hidden="true" />
          {copy.post}
        </a>
        <button
          type="button"
          onClick={copyShareText}
          className="tr-button-secondary h-11 min-h-11 px-4 py-2 text-sm"
        >
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? copy.copied : copy.copy}
        </button>
      </div>
    </aside>
  );
}
