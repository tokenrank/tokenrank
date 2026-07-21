import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocalPreviewCommand } from "@/components/connect/local-preview-command";
import { defaultCopy } from "@/src/i18n/copy";

const originalClipboard = window.navigator.clipboard;

afterEach(() => {
  cleanup();
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: originalClipboard,
  });
  Reflect.deleteProperty(document, "execCommand");
});

describe("LocalPreviewCommand", () => {
  it("defaults to an account-free Agent prompt and links to the CLI source", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<LocalPreviewCommand copy={defaultCopy.onboard.preview} />);

    expect(screen.getByRole("tab", { name: "Ask an agent" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByRole("tabpanel", { name: "Ask an agent" }).textContent).toContain(
      "https://tokenrank.org/skill.md",
    );
    expect(screen.getByText(/Node\.js 20\+ with npm\/npx/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "View CLI source" }).getAttribute("href")).toBe(
      "https://github.com/tokenrank/tokenrank-cli",
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy Agent prompt" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "Follow the instructions at https://tokenrank.org/skill.md to preview this machine's aggregate AI usage locally without connecting an account or uploading data.",
      );
      expect(screen.getByRole("button", { name: "Agent prompt copied" })).not.toBeNull();
    });
  });

  it("shows and copies the npx command after selecting the terminal method", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<LocalPreviewCommand copy={defaultCopy.onboard.preview} />);
    fireEvent.click(screen.getByRole("tab", { name: "Run in terminal" }));

    expect(screen.getByDisplayValue("npx --yes tokenrank preview")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Copy preview command" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("npx --yes tokenrank preview");
      expect(screen.getByRole("button", { name: "Command copied" })).not.toBeNull();
    });
  });

  it("falls back to the selected terminal command when clipboard access is blocked", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard blocked"));
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<LocalPreviewCommand copy={defaultCopy.onboard.preview} />);
    fireEvent.click(screen.getByRole("tab", { name: "Run in terminal" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy preview command" }));

    await waitFor(() => {
      expect(execCommand).toHaveBeenCalledWith("copy");
      expect(screen.getByRole("button", { name: "Command copied" })).not.toBeNull();
    });
  });
});
