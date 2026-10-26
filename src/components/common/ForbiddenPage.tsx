"use client";

import React from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRole } from "@/context/RoleContext";
import { getRoleDefaultRoute } from "@/domain/routePermissions";
import { Role } from "@prisma/client";

export function ForbiddenPage({ path }: { path?: string }) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const { role, user } = useRole();

  const destination = getRoleDefaultRoute(role as Role);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/60 p-6 md:p-8 text-center shadow-lg">
        {/* Warning Badge */}
        <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl font-bold mx-auto mb-4 border border-red-200 dark:border-red-900">
          🚫
        </div>

        <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {isAr ? "غير مصرح بالوصول (403)" : "Access Not Allowed (403)"}
        </h1>

        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
          {isAr
            ? `دورك الحالي (${user?.fullName || role}) ليس لديه صلاحية لعرض هذه الصفحة.`
            : `Your current role (${user?.fullName || role}) does not have permission to view this page.`}
        </p>

        {path && (
          <div className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs text-slate-500 mb-6" dir="ltr">
            {path}
          </div>
        )}

        <div>
          <Link
            href={destination}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[#0E6251] text-white text-xs md:text-sm font-semibold hover:bg-[#117A65] shadow transition-colors"
          >
            {isAr ? "العودة إلى الصفحة المصرح بها" : "Return to Allowed Dashboard"}
          </Link>
        </div>
      </div>
    </div>
  );
}
