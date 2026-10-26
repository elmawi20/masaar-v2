"use client";

import React, { useState } from "react";
import { useLocale } from "next-intl";
import { useRole } from "@/context/RoleContext";
import { logoutAction } from "@/server/actions/auth";
import { useRouter } from "@/i18n/navigation";

export function UserMenu() {
  const locale = useLocale();
  const router = useRouter();
  const { user, role } = useRole();
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const roleLabels: Record<string, { ar: string; en: string }> = {
    OWNER: { ar: "مالك العيادة", en: "Clinic Owner" },
    MANAGER: { ar: "مدير العيادة", en: "Clinic Manager" },
    RECEPTIONIST: { ar: "موظف استقبال", en: "Receptionist" },
    PHYSIOTHERAPIST: { ar: "أخصائي علاج طبيعي", en: "Physiotherapist" },
    NUTRITIONIST: { ar: "أخصائي تغذية علاجية", en: "Clinical Nutritionist" },
  };

  const handleLogoutClick = async (force: boolean = false) => {
    setIsLoggingOut(true);
    try {
      const res = await logoutAction({ force });
      if (res.success) {
        if (res.data.hasOpenCashShift && !force) {
          setShowShiftModal(true);
          setIsLoggingOut(false);
          return;
        }

        setShowShiftModal(false);
        router.push("/login");
      }
    } catch {
      // fallback
    } finally {
      setIsLoggingOut(false);
    }
  };

  const currentRoleLabel = roleLabels[role] || { ar: role, en: role };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* User Identity Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs">
          <div className="w-5 h-5 rounded-full bg-[#0E6251] text-white flex items-center justify-center font-bold text-[10px]">
            {user?.fullName ? user.fullName[0] : "م"}
          </div>
          <div className="flex flex-col text-start">
            <span className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">
              {user?.fullName || (locale === "ar" ? "المستخدم الحالي" : "Current User")}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {locale === "ar" ? currentRoleLabel.ar : currentRoleLabel.en}
            </span>
          </div>
        </div>

        {/* Switch User / Logout button (R-15.1-6) */}
        <button
          type="button"
          onClick={() => handleLogoutClick(false)}
          disabled={isLoggingOut}
          title={locale === "ar" ? "تبديل المستخدم أو تسجيل الخروج" : "Switch user / Logout"}
          className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5 ms-1"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="hidden md:inline">
            {locale === "ar" ? "تبديل المستخدم" : "Switch User"}
          </span>
        </button>
      </div>

      {/* Open Cash Shift Warning Modal (R-15.1-6) */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
              {locale === "ar"
                ? "تنبيه: توجد وردية نقدية مفتوحة"
                : "Warning: Active Open Cash Shift"}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              {locale === "ar"
                ? "لديك وردية نقدية نشطة ومفتوحة بالخزينة. يُلزم النظام إغلاق الوردية وعد النقدية قبل تسليم الجهاز أو تسجيل الخروج."
                : "You have an active open cash shift. It is strongly recommended to close your shift before logging out or switching users."}
            </p>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowShiftModal(false);
                  router.push("/reception/cash-closing");
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#0E6251] text-white hover:bg-[#117A65]"
              >
                {locale === "ar" ? "الذهاب لإغلاق الوردية" : "Go to Cash Closing"}
              </button>
              <button
                type="button"
                onClick={() => handleLogoutClick(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-300 text-red-600 dark:border-red-900 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                {locale === "ar" ? "خروج على أي حال" : "Force Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
