"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { defaultCopy, type AppCopy } from "@/src/i18n/copy";

export function XSignInButton({
  alternateHref,
  alternateLabel,
  callbackUrl,
  copy = defaultCopy.auth.button,
  disabledReason,
  showDisabledReason = true,
  variant = "inverted",
}: {
  alternateHref?: string;
  alternateLabel?: string;
  callbackUrl: string;
  copy?: AppCopy["auth"]["button"];
  disabledReason?: string;
  showDisabledReason?: boolean;
  variant?: "solid" | "inverted";
}) {
  const [pending, setPending] = useState(false);
  const disabled = pending || (Boolean(disabledReason) && !alternateHref);
  const buttonClass =
    variant === "solid"
      ? "tr-button group w-full disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
      : "tr-button group w-full disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto";
  const label = pending ? copy.pending : (alternateLabel ?? copy.default);

  return (
    <div>
      {alternateHref ? (
        <a href={alternateHref} className={buttonClass}>
          <span className="tr-button-icon font-black">X</span>
          {label}
          <ArrowRight className="size-4 group-hover:translate-x-1" aria-hidden="true" />
        </a>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (disabledReason) return;
            setPending(true);
            void signIn("twitter", { callbackUrl });
          }}
          disabled={disabled}
          className={buttonClass}
        >
          <span className="tr-button-icon font-black">X</span>
          {label}
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight className="size-4 group-hover:translate-x-1" aria-hidden="true" />
          )}
        </button>
      )}
      {disabledReason && showDisabledReason ? (
        <p
          className={
            variant === "solid"
              ? "mt-3 text-sm font-bold text-[color:var(--tr-red)]"
              : "mt-3 text-sm font-bold text-[color:var(--tr-gold-bright)]"
          }
        >
          {disabledReason}
        </p>
      ) : null}
    </div>
  );
}
