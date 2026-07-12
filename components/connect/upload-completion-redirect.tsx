"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { defaultCopy, type AppCopy } from "@/src/i18n/copy";

type UploadStatusResponse = {
  status: number;
  upload?: {
    hasUsage: boolean;
    latestUploadedAt: string | null;
  };
};

export function UploadCompletionRedirect({
  copy = defaultCopy.onboard.redirect,
  initialLatestUploadedAt,
}: {
  copy?: AppCopy["onboard"]["redirect"];
  initialLatestUploadedAt: string | null;
}) {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        const payload = (await response.json()) as UploadStatusResponse;
        const latestUploadedAt = payload.upload?.latestUploadedAt ?? null;

        if (
          response.ok &&
          payload.status === 0 &&
          payload.upload?.hasUsage &&
          isNewerUpload(latestUploadedAt, initialLatestUploadedAt)
        ) {
          setRedirecting(true);
          router.replace("/dashboard");
        }
      } catch {
        // Keep polling while the user completes the terminal command.
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [initialLatestUploadedAt, router]);

  return (
    <div className="border border-dashed border-[color:var(--tr-line-strong)] bg-[color:var(--tr-surface-2)] p-4 font-mono text-xs leading-6 text-[color:var(--tr-ivory-soft)]">
      {redirecting ? (
        <div className="flex items-center gap-2 font-black text-[color:var(--tr-green)]">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {copy.ready}
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <Loader2 className="mt-1 size-4 shrink-0 animate-spin text-[color:var(--tr-gold)]" aria-hidden="true" />
          <p>{copy.waiting}</p>
        </div>
      )}
    </div>
  );
}

function isNewerUpload(latestUploadedAt: string | null, initialLatestUploadedAt: string | null) {
  if (!latestUploadedAt) {
    return false;
  }

  if (!initialLatestUploadedAt) {
    return true;
  }

  const latestTime = new Date(latestUploadedAt).getTime();
  const initialTime = new Date(initialLatestUploadedAt).getTime();

  return Number.isFinite(latestTime) && Number.isFinite(initialTime) && latestTime > initialTime;
}
