import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "phone", width: 390, height: 844 },
];

const locales = ["ar", "en"] as const;
const themes = ["light", "dark"] as const;

const routes = [
  { name: "home", path: "" },
  { name: "login", path: "/login" },
  { name: "admin-staff", path: "/admin/staff" },
  { name: "admin-settings", path: "/admin/settings" },
  { name: "management-resources", path: "/management/resources" },
  { name: "management-staff-schedules", path: "/management/staff-schedules" },
  { name: "reception-today", path: "/reception/today" },
  { name: "reception-patients", path: "/reception/patients" },
  { name: "reception-calendar", path: "/reception/calendar" },
];

test.describe("Visual Regression & Responsive Screenshot Suite", () => {
  const screenshotsDir = path.join(process.cwd(), "artifacts", "screenshots");

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  for (const route of routes) {
    for (const vp of viewports) {
      for (const locale of locales) {
        for (const theme of themes) {
          test(`capture ${route.name} - ${vp.name} (${vp.width}px) - ${locale} - ${theme} mode`, async ({ page }) => {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.goto(`/${locale}${route.path}`);
            await page.waitForLoadState("networkidle");

            // Set theme attribute
            await page.evaluate((t) => {
              document.documentElement.setAttribute("data-theme", t);
            }, theme);

            // Verify language direction
            const expectedDir = locale === "ar" ? "rtl" : "ltr";
            await expect(page.locator("html")).toHaveAttribute("dir", expectedDir);

            const screenshotPath = path.join(
              screenshotsDir,
              `${route.name}-${vp.width}px-${locale}-${theme}.png`
            );

            await page.screenshot({ path: screenshotPath, fullPage: true });
            expect(fs.existsSync(screenshotPath)).toBe(true);
          });
        }
      }
    }
  }
});
