"use client";

import React from "react";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useRole, UserRole } from "@/context/RoleContext";

interface NavItem {
  href: string;
  labelAr: string;
  labelEn: string;
  roles: UserRole[];
  icon: (props: { className?: string }) => React.JSX.Element;
}

interface NavGroup {
  groupAr: string;
  groupEn: string;
  items: NavItem[];
}

// Monochromatic SVG icons (16px, zero emojis)
function IconToday({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}

function IconCalendar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function IconPatients({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconBilling({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

function IconExpenses({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20" />
      <path d="m17 5-5-3-5 3" />
      <path d="m17 19-5 3-5-3" />
    </svg>
  );
}

function IconShift({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 7h10" />
      <path d="M7 12h10" />
      <path d="M7 17h10" />
    </svg>
  );
}

function IconClinical({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function IconNutrition({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a9 9 0 0 0-9 9c0 5 9 11 9 11s9-6 9-11a9 9 0 0 0-9-9Z" />
      <circle cx="12" cy="11" r="3" />
    </svg>
  );
}

function IconReports({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  );
}

function IconCommission({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 18V6" />
    </svg>
  );
}

function IconSettings({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconAudit({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupAr: "الاستقبال والمواعيد",
    groupEn: "Reception & Calendar",
    items: [
      {
        href: "/reception/today",
        labelAr: "اليوم في العيادة",
        labelEn: "Today at Clinic",
        roles: ["OWNER", "MANAGER", "RECEPTIONIST"],
        icon: IconToday,
      },
      {
        href: "/reception/calendar",
        labelAr: "جدول المواعيد",
        labelEn: "Calendar",
        roles: ["OWNER", "MANAGER", "RECEPTIONIST", "PHYSIOTHERAPIST", "NUTRITIONIST"],
        icon: IconCalendar,
      },
      {
        href: "/reception/patients",
        labelAr: "سجل المرضى",
        labelEn: "Patients",
        roles: ["OWNER", "MANAGER", "RECEPTIONIST"],
        icon: IconPatients,
      },
      {
        href: "/reception/billing",
        labelAr: "الفواتير والمتحصلات",
        labelEn: "Billing",
        roles: ["OWNER", "MANAGER", "RECEPTIONIST"],
        icon: IconBilling,
      },
      {
        href: "/reception/expenses",
        labelAr: "المصروفات اليومية",
        labelEn: "Expenses",
        roles: ["OWNER", "MANAGER", "RECEPTIONIST"],
        icon: IconExpenses,
      },
      {
        href: "/reception/cash-closing",
        labelAr: "إغلاق الوردية والخزينة",
        labelEn: "Cash Closing",
        roles: ["OWNER", "MANAGER", "RECEPTIONIST"],
        icon: IconShift,
      },
    ],
  },
  {
    groupAr: "العيادة والتأهيل",
    groupEn: "Clinical & Rehab",
    items: [
      {
        href: "/clinical/queue",
        labelAr: "قائمة انتظار العلاج الطبيعي",
        labelEn: "Physio Queue",
        roles: ["OWNER", "PHYSIOTHERAPIST"],
        icon: IconClinical,
      },
      {
        href: "/clinical/my-commissions",
        labelAr: "حساب العمولات الشخصي",
        labelEn: "My Commissions",
        roles: ["OWNER", "PHYSIOTHERAPIST"],
        icon: IconCommission,
      },
    ],
  },
  {
    groupAr: "التغذية العلاجية",
    groupEn: "Clinical Nutrition",
    items: [
      {
        href: "/nutrition/queue",
        labelAr: "عيادة التغذية والقياسات",
        labelEn: "Nutrition Queue",
        roles: ["OWNER", "NUTRITIONIST"],
        icon: IconNutrition,
      },
      {
        href: "/nutrition/my-commissions",
        labelAr: "عمولات التغذية",
        labelEn: "Nutrition Commissions",
        roles: ["OWNER", "NUTRITIONIST"],
        icon: IconCommission,
      },
    ],
  },
  {
    groupAr: "الإدارة والتقارير",
    groupEn: "Management & Reports",
    items: [
      {
        href: "/management/reports",
        labelAr: "التقارير والإحصائيات",
        labelEn: "Reports",
        roles: ["OWNER", "MANAGER"],
        icon: IconReports,
      },
      {
        href: "/management/commissions",
        labelAr: "مراجعة وصرف العمولات",
        labelEn: "Commissions Run",
        roles: ["OWNER", "MANAGER"],
        icon: IconCommission,
      },
      {
        href: "/management/staff-schedules",
        labelAr: "مواعيد عمل الموظفين",
        labelEn: "Staff Schedules",
        roles: ["OWNER", "MANAGER"],
        icon: IconToday,
      },
      {
        href: "/management/resources",
        labelAr: "الغرف والأسِرّة",
        labelEn: "Rooms & Beds",
        roles: ["OWNER", "MANAGER"],
        icon: IconShift,
      },
    ],
  },
  {
    groupAr: "النظام والرقابة",
    groupEn: "Administration",
    items: [
      {
        href: "/admin/staff",
        labelAr: "حسابات الفريق والصلاحيات",
        labelEn: "Staff Accounts",
        roles: ["OWNER"],
        icon: IconPatients,
      },
      {
        href: "/admin/settings",
        labelAr: "إعدادات العيادة والأسعار",
        labelEn: "Clinic Settings",
        roles: ["OWNER"],
        icon: IconSettings,
      },
      {
        href: "/admin/templates",
        labelAr: "قوالب رسائل الواتساب",
        labelEn: "WhatsApp Templates",
        roles: ["OWNER"],
        icon: IconToday,
      },
      {
        href: "/admin/audit-log",
        labelAr: "سجل الرقابة والتدقيق",
        labelEn: "Audit Log",
        roles: ["OWNER", "MANAGER"],
        icon: IconAudit,
      },
    ],
  },
];

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isOpenMobile, onCloseMobile }: SidebarProps) {
  const { role } = useRole();
  const locale = useLocale();
  const pathname = usePathname();

  // Filter groups and items visible to current role
  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => item.roles.includes(role)),
  })).filter((g) => g.items.length > 0);

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 w-60 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#0E6251] dark:bg-[#1ABC9C] flex items-center justify-center text-white font-bold text-sm">
            M
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">
              {locale === "ar" ? "عيادة مسار" : "Masaar Clinic"}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {locale === "ar" ? "نظام إدارة العيادة" : "Clinic System"}
            </div>
          </div>
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav Items List */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {visibleGroups.map((g) => (
          <div key={g.groupEn} className="space-y-1">
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
              {locale === "ar" ? g.groupAr : g.groupEn}
            </div>
            {g.items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#0E6251]/10 text-[#0E6251] dark:bg-[#1ABC9C]/15 dark:text-[#1ABC9C] font-semibold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{locale === "ar" ? item.labelAr : item.labelEn}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Active Role Indicator */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center justify-between">
          <span>{locale === "ar" ? "المرحلة:" : "Stage:"}</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {locale === "ar" ? "المرحلة 2 (الجودة)" : "Stage 2 (Quality)"}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block shrink-0 sticky top-0 h-screen">{content}</aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          {/* Drawer content */}
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}
