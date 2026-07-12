"use client";

import { Loader2, LogOut } from "lucide-react";
import { useState } from "react";

import { defaultCopy, type AppCopy } from "@/src/i18n/copy";

export function SignOutButton({ copy = defaultCopy.common.buttons }: { copy?: AppCopy["common"]["buttons"] }) {
  const [pending, setPending] = useState(false);

  async function signOutDirectly() {
    setPending(true);

    try {
      const response = await fetch("/api/dashboard/signout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Sign out failed");
      }

      window.location.assign("/");
    } catch {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        void signOutDirectly();
      }}
      className="tr-button-secondary h-10 min-h-10 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="size-4" aria-hidden="true" />
      )}
      {pending ? copy.signingOut : copy.signOut}
    </button>
  );
}
