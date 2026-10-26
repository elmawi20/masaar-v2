import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const locales = ["ar", "en"] as const;
const themes = ["light", "dark"] as const;

const routes = [
  { name: "home", path: "" },
  { name: "login", path: "/login" },
  { name: "reception-today", path: "/reception/today" },
  { name: "reception-calendar", path: "/reception/calendar" },
  { name: "reception-patients", path: "/reception/patients" },
  { name: "reception-expenses", path: "/reception/expenses" },
  { name: "reception-cash-closing", path: "/reception/cash-closing" },
  { name: "clinical-queue", path: "/clinical/queue" },
  { name: "nutrition-queue", path: "/nutrition/queue" },
  { name: "management-commissions", path: "/management/commissions" },
  { name: "management-reports", path: "/management/reports" },
  { name: "management-resources", path: "/management/resources" },
  { name: "management-staff-schedules", path: "/management/staff-schedules" },
  { name: "admin-staff", path: "/admin/staff" },
  { name: "admin-settings", path: "/admin/settings" },
  { name: "admin-audit-log", path: "/admin/audit-log" },
];

test.describe("Full Visual Regression & Responsive Screenshot Suite", () => {
  const screenshotsDir = path.join(process.cwd(), "artifacts", "screenshots");

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  for (const route of routes) {
    for (const locale of locales) {
      for (const theme of themes) {
        test(`screenshot ${route.name} - ${locale} - ${theme}`, async ({ page }, testInfo) => {
          const projectName = testInfo.project.name; // e.g. desktop-1440, tablet-820, phone-390

          await page.goto(`/${locale}${route.path}`);
          await page.waitForLoadState("domcontentloaded");

          // Apply theme attribute
          await page.evaluate((t) => {
            document.documentElement.setAttribute("data-theme", t);
            if (t === "dark") {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
          }, theme);

          // Verify language direction
          const expectedDir = locale === "ar" ? "rtl" : "ltr";
          await expect(page.locator("html")).toHaveAttribute("dir", expectedDir);

          const screenshotPath = path.join(
            screenshotsDir,
            `${route.name}-${projectName}-${locale}-${theme}.png`
          );

          await page.screenshot({ path: screenshotPath, fullPage: true });
          expect(fs.existsSync(screenshotPath)).toBe(true);
        });
      }
    }
  }
});
