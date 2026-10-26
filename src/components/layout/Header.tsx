"use client";

import React from "react";
import { useLocale } from "next-intl";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { RoleSwitcher } from "./RoleSwitcher";

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  const locale = useLocale();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3">
        {/* Hamburger button on mobile */}
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          aria-label="Open navigation menu"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>

        <div className="hidden sm:block text-xs font-semibold text-slate-500 dark:text-slate-400">
          {locale === "ar"
            ? "نظام مسار — عيادة العلاج الطبيعي والتغذية"
            : "Masaar System — Physiotherapy & Nutrition Clinic"}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <RoleSwitcher />
        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
