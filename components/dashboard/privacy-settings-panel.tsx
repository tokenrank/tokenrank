"use client";

import { Eye, Save, Trophy } from "lucide-react";
import { useState } from "react";

import { defaultCopy, type AppCopy } from "@/src/i18n/copy";

type UserSettings = {
  profilePublic: boolean;
  rankingEnabled: boolean;
};

type ApiResponse = {
  status: number;
  user?: UserSettings;
  error?: string;
};

export function PrivacySettingsPanel({
  copy = defaultCopy.dashboard.privacy,
  initialSettings,
}: {
  copy?: AppCopy["dashboard"]["privacy"];
  initialSettings: UserSettings;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const dirty =
    settings.profilePublic !== savedSettings.profilePublic ||
    settings.rankingEnabled !== savedSettings.rankingEnabled;

  function updateSetting(key: keyof UserSettings, value: boolean) {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage("");
    setError("");
  }

  async function saveSettings() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/dashboard", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = (await response.json()) as ApiResponse;

      if (!response.ok || payload.status !== 0 || !payload.user) {
        throw new Error(payload.error ?? copy.errorFallback);
      }

      const nextSettings = {
        profilePublic: payload.user.profilePublic,
        rankingEnabled: payload.user.rankingEnabled,
      };
      setSettings(nextSettings);
      setSavedSettings(nextSettings);
      setMessage(copy.saved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.errorFallback);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="tr-shell tr-reveal">
      <div className="tr-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-[color:var(--tr-line)] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="tr-data-label">Visibility control / 02</p>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-[-0.03em] text-[color:var(--tr-ivory)]">{copy.title}</h2>
            <p className="tr-body mt-2 max-w-2xl text-sm">{copy.body}</p>
          </div>
          <button
            type="button"
            onClick={saveSettings}
            disabled={!dirty || saving}
            className="tr-button shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="size-4" aria-hidden="true" />
            {saving ? copy.saving : copy.save}
          </button>
        </div>

        <div className="mt-5 grid gap-px border border-[color:var(--tr-line)] bg-[color:var(--tr-line)] sm:grid-cols-2">
          <SettingToggle
            checked={settings.profilePublic}
            icon={<Eye className="size-4" aria-hidden="true" />}
            title={copy.profileTitle}
            body={copy.profileBody}
            onChange={(value) => updateSetting("profilePublic", value)}
          />

          <SettingToggle
            checked={settings.rankingEnabled}
            icon={<Trophy className="size-4" aria-hidden="true" />}
            title={copy.rankingTitle}
            body={copy.rankingBody}
            onChange={(value) => updateSetting("rankingEnabled", value)}
          />
        </div>

        {message ? <p className="mt-4 text-sm font-bold text-[color:var(--tr-green)]">{message}</p> : null}
        {error ? <p className="mt-4 text-sm font-bold text-[color:var(--tr-red)]">{error}</p> : null}
      </div>
    </section>
  );
}

function SettingToggle({
  body,
  checked,
  icon,
  onChange,
  title,
}: {
  body: string;
  checked: boolean;
  icon: React.ReactNode;
  onChange: (value: boolean) => void;
  title: string;
}) {
  return (
    <label className="flex cursor-pointer gap-4 bg-[color:var(--tr-surface-2)] p-5 hover:bg-[color:var(--tr-surface-3)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 shrink-0 accent-[color:var(--tr-gold)]"
      />
      <span>
        <span className="flex items-center gap-2 font-black text-[color:var(--tr-ivory)]">
          <span className="text-[color:var(--tr-orange)]">{icon}</span>
          {title}
        </span>
        <span className="mt-1 block text-sm leading-6 text-[color:var(--tr-muted)]">{body}</span>
      </span>
    </label>
  );
}
