import { expect, test } from "playwright/test";

test("home page renders the scaffold", async ({ page }) => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

  await page.goto(baseURL);

  await expect(
    page.getByRole("heading", { name: /to get started/i }),
  ).toBeVisible();
});
