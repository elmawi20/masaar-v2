"use client";

import React from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (targetLocale: "ar" | "en") => {
    router.replace(pathname, { locale: targetLocale });
  };

  const nextLocale = locale === "ar" ? "en" : "ar";
  const label = locale === "ar" ? "English" : "العربية";

  return (
    <button
      type="button"
      onClick={() => switchLocale(nextLocale)}
      className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
    >
      {label}
    </button>
  );
}
