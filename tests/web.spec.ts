import { expect, test } from "playwright/test";

test("leaderboard renders the public board controls", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Token 消耗榜" })).toBeVisible();
  await expect(page.getByRole("link", { name: "总榜" })).toBeVisible();
  await expect(page.getByRole("link", { name: "金额榜" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Qwen" })).toBeVisible();
  await expect(page.getByRole("link", { name: "codex-cache" })).toBeVisible();
});

test("rules page renders privacy and fair-play copy", async ({ page }) => {
  await page.goto("/rules");

  await expect(page.getByRole("heading", { name: "TokenRank 规则" })).toBeVisible();
  await expect(page.getByText("不上传代码、提示词、对话、文件名或文件内容")).toBeVisible();
  await expect(page.getByText("最多计入 3 台设备")).toBeVisible();
});
