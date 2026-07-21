import { expect, test } from "playwright/test";

test("leaderboard renders the public board controls", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/");

  await expect(page).toHaveTitle("AI Token Usage Leaderboard for Coding Agents | TokenRank");
  await expect(
    page.getByRole("heading", { name: "BURN TOKENS. ASCEND RANKS." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Automatically track aggregate token usage across Codex, Claude Code, Gemini, Qwen, and more. Your prompts, code, chats, filenames, and file contents stay local.",
    ),
  ).toBeVisible();
  await expect(page.getByText("An activity signal, not a productivity score.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Know what each number proves" })).toBeVisible();
  await expect(page.getByText("Not Provider Verified", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Overall" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Spend" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Qwen" })).toBeVisible();
  await expect(page.getByRole("link", { name: "codex-cache" })).toBeVisible();
  await expect(page.getByText("Share the board")).toBeVisible();
  await expect(page.getByText(/Watching TokenRank Today Overall/)).toBeVisible();
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Join", exact: true }),
  ).toHaveCount(1);
});

test("language switch renders the Chinese brand copy", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "中文" }).click();

  await expect(
    page.getByRole("heading", { name: "TOKEN 燃烧 RANKING 狂飙" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "自动汇总 Codex、Claude Code、Gemini、Qwen 等工具的 Token 用量。prompt、代码、对话、文件名和文件内容都留在本机。",
    ),
  ).toBeVisible();
  await expect(page.getByText("这是 AI 活动信号，不是生产力评分。")).toBeVisible();
  await expect(page.getByRole("link", { name: "总榜" })).toBeVisible();
  await expect(page.getByText("分享榜单")).toBeVisible();
});

test("rules page renders privacy and fair-play copy", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/rules");

  await expect(page.getByRole("heading", { name: "Measure usage. Protect the work." })).toBeVisible();
  await expect(page.getByText("It never uploads code, prompts, chats, filenames, or file contents.")).toBeVisible();
  await expect(page.getByText("Top three devices count")).toBeVisible();
});

test("canonical onboarding and dashboard routes replace the old journey names", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/onboard");

  await expect(page).toHaveURL(/\/onboard$/);
  await expect(page.getByRole("heading", { name: "Preview first. Claim your rank." })).toBeVisible();
  await expect(page.getByDisplayValue("npx --yes tokenrank preview")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy preview command" })).toBeVisible();

  const connectResponse = await page.goto("/connect");
  expect(connectResponse?.status()).toBe(404);

  const meResponse = await page.goto("/me");
  expect(meResponse?.status()).toBe(404);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Sign in to see your record." })).toBeVisible();
});

test("custom X sign in page replaces the default NextAuth screen", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/auth/signin?callbackUrl=/onboard");

  await expect(page.getByRole("heading", { name: "Use X as your public rank identity." })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with X/ })).toBeVisible();

  await page.goto("/api/auth/signin/twitter?callbackUrl=%2Fonboard", {
    waitUntil: "domcontentloaded",
  });

  await expect(page).toHaveURL(/\/auth\/signin/);
  await expect(page.getByText("Sign in", { exact: true })).toBeVisible();
  await expect(page.getByText("Sign in with Twitter")).not.toBeVisible();
});
