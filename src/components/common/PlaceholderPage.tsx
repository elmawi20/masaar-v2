"use client";

import React from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

interface PlaceholderPageProps {
  titleAr: string;
  titleEn: string;
  moduleCode?: string;
  allowedRolesAr: string[];
  allowedRolesEn: string[];
}

export function PlaceholderPage({
  titleAr,
  titleEn,
  moduleCode,
  allowedRolesAr,
  allowedRolesEn,
}: PlaceholderPageProps) {
  const locale = useLocale();

  const title = locale === "ar" ? titleAr : titleEn;
  const roles = locale === "ar" ? allowedRolesAr : allowedRolesEn;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              {locale === "ar" ? "قريباً" : "Coming Soon"}
            </span>
          </div>
          {moduleCode && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {locale === "ar"
                ? `وحدة النظام: ${moduleCode}`
                : `System Module: ${moduleCode}`}
            </p>
          )}
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors w-fit"
        >
          {locale === "ar" ? "العودة للرئيسية" : "Back to Overview"}
        </Link>
      </div>

      {/* Main Status Card */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center max-w-xl mx-auto shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500 dark:text-slate-400 mb-4">
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {locale === "ar" ? "قيد التطوير — المرحلة 3" : "Under Construction — Stage 3"}
        </h2>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
          {locale === "ar"
            ? "تم تجهيز البنية التحتية، القواعد البرمجية، الصلاحيات وقاعدة البيانات الخاصة بهذه الصفحة في المرحلة 2. سيتم بناء واجهات المستخدم التفاعلية وميزات العيادة في المرحلة 3."
            : "The underlying infrastructure, business rules, permissions, and database constraints for this screen are complete in Stage 2. Full interactive clinic UI will be implemented in Stage 3."}
        </p>

        {/* Roles with Access */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-start">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
            {locale === "ar"
              ? "الأدوار المصرح لها بالوصول لهذا القسم:"
              : "Roles authorized to access this section:"}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {roles.map((r) => (
              <span
                key={r}
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
