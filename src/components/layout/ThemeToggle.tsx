"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function ThemeToggle() {
  const t = useTranslations("common");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let activeTheme: "light" | "dark" = "light";
    try {
      const stored = localStorage.getItem("masaar_theme");
      if (stored === "dark" || stored === "light") {
        activeTheme = stored;
      } else {
        const existing = document.documentElement.getAttribute("data-theme") as
          "light" | "dark" | null;
        if (existing === "dark" || existing === "light") {
          activeTheme = existing;
        } else {
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          activeTheme = prefersDark ? "dark" : "light";
        }
      }
    } catch {
      // Ignore
    }
    setTheme(activeTheme);
    document.documentElement.setAttribute("data-theme", activeTheme);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("masaar_theme", next);
    } catch {
      // Ignore
    }
  };

  if (!mounted) {
    return (
      <button
        type="button"
        data-testid="theme-toggle"
        className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
        aria-label="Toggle theme"
      >
        <span className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      onClick={toggleTheme}
      title={theme === "light" ? t("dark") : t("light")}
      aria-label={t("toggleTheme")}
      className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
    >
      {theme === "light" ? (
        // Moon Icon for switching to dark
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      ) : (
        // Sun Icon for switching to light
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}
