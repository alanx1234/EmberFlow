import { expect, test } from "@playwright/test";

test("home page presents the estimator immediately", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /estimate a stellar age/i })).toBeVisible();
  await expect(page.getByLabel(/rotation period/i)).toBeVisible();
});

test("example star produces the tutorial estimate", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /example star/i }).click();
  await expect(page.getByLabel(/rotation period/i)).toHaveValue("20");
  await page.getByRole("button", { name: /estimate age/i }).click();
  // model may need to warm up on first request
  await expect(page.locator(".result-hero .estimate")).toContainText("1.77", {
    timeout: 90_000,
  });
  await expect(page.locator(".result-hero .uncertainty")).toContainText("−0.64");
});

test("navigation reaches every page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Batch Estimates" }).click();
  await expect(page.getByRole("heading", { name: /batch age estimates/i })).toBeVisible();
  await page.getByRole("link", { name: "Forward Model" }).click();
  await expect(page.getByRole("heading", { name: /forward model/i })).toBeVisible();
  await page.getByRole("link", { name: "Documentation" }).click();
  await expect(page.getByRole("heading", { name: /documentation/i })).toBeVisible();
});
