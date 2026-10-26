import { test, expect } from "@playwright/test";

test.describe("Theme and Language Toggle Suite", () => {
  test("dark mode toggle changes page background color and persists after reload", async ({
    page,
  }) => {
    // 1. Visit Arabic home page
    await page.goto("/ar");
    await page.waitForLoadState("networkidle");

    // Check initial light background color (rgb(248, 250, 252) = #f8fafc)
    const body = page.locator("body");
    await expect(body).toHaveCSS("background-color", "rgb(248, 250, 252)");

    // Also check the shell container background color
    const appShell = page.locator("div.min-h-screen");
    await expect(appShell).toHaveCSS("background-color", "rgb(248, 250, 252)");

    // 2. Click the dark mode toggle
    const themeToggle = page.locator(
      'button[data-testid="theme-toggle"], button[aria-label="تبديل المظهر"], button[aria-label="Toggle Theme"]'
    );
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();

    // 3. Verify page background changes to dark mode token (#0b1120 = rgb(11, 17, 32))
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(body).toHaveCSS("background-color", "rgb(11, 17, 32)");
    await expect(appShell).toHaveCSS("background-color", "rgb(11, 17, 32)");

    // 4. Reload page and verify theme stays dark and background remains #0b1120
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(body).toHaveCSS("background-color", "rgb(11, 17, 32)");
    await expect(appShell).toHaveCSS("background-color", "rgb(11, 17, 32)");
  });

  test("language toggle switches from Arabic RTL to English LTR and persists after reload", async ({
    page,
  }) => {
    // 1. Visit Arabic home page
    await page.goto("/ar");
    await page.waitForLoadState("networkidle");

    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "ar");

    // 2. Click the language switcher (button with text 'English')
    const langBtn = page.locator('button:has-text("English")');
    await expect(langBtn).toBeVisible();
    await langBtn.click();

    // 3. Verify switch to English LTR
    await expect(html).toHaveAttribute("dir", "ltr");
    await expect(html).toHaveAttribute("lang", "en");

    // 4. Reload page and verify language persists as English LTR
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(html).toHaveAttribute("dir", "ltr");
    await expect(html).toHaveAttribute("lang", "en");
  });
});
