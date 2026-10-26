"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRole, UserRole } from "@/context/RoleContext";

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const locale = useLocale();
  const t = useTranslations("roles");

  const roles: UserRole[] = ["OWNER", "MANAGER", "RECEPTIONIST", "PHYSIOTHERAPIST", "NUTRITIONIST"];

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
        {locale === "ar" ? "الدور المعاين:" : "Preview Role:"}
      </span>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as UserRole)}
        className="px-2 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
      >
        {roles.map((r) => (
          <option key={r} value={r}>
            {t(r)}
          </option>
        ))}
      </select>
    </div>
  );
}
