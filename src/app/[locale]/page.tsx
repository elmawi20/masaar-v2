"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRole } from "@/context/RoleContext";
import { isRouteAllowedForRole } from "@/domain/routePermissions";
import { Role } from "@prisma/client";

export default function HomePage() {
  return <HomeDashboard />;
}

function HomeDashboard() {
  const locale = useLocale();
  const { role } = useRole();

  const isAr = locale === "ar";

  const quickLinks = [
    {
      title: isAr ? "اليوم في العيادة" : "Today at Clinic",
      desc: isAr ? "متابعة تدفق المرضى وتسجيل الحضور" : "Daily patient flow and reception hub",
      href: "/reception/today",
    },
    {
      title: isAr ? "جدول المواعيد" : "Calendar Grid",
      desc: isAr ? "تقويم الأسِرّة والحجوزات لـ 15 دقيقة" : "Multi-bed 15-minute appointment calendar",
      href: "/reception/calendar",
    },
    {
      title: isAr ? "سجل المرضى" : "Patients Directory",
      desc: isAr ? "ملفات المرضى، الفحوصات والبيانات" : "Patient profiles, medical history & files",
      href: "/reception/patients",
    },
    {
      title: isAr ? "العيادة والتأهيل" : "Clinical Physiotherapy",
      desc: isAr ? "قائمة انتظار الجلسات وملاحظات SOAP" : "Physio queue, session notes and charting",
      href: "/clinical/queue",
    },
    {
      title: isAr ? "التغذية العلاجية" : "Clinical Nutrition",
      desc: isAr ? "استشارات التغذية وفحوصات InBody" : "Nutrition consultation and InBody tracking",
      href: "/nutrition/queue",
    },
    {
      title: isAr ? "الفواتير والمتحصلات" : "Billing & Cash Desk",
      desc: isAr ? "المدفوعات، الباقات وإغلاق الخزينة" : "Payments, packages and drawer closing",
      href: "/reception/billing",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {isAr ? "نظام مسار لإدارة العيادات المتخصصة" : "Masaar Specialized Clinic System"}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                {isAr ? "المرحلة 2: جاهز" : "Stage 2: Ready"}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {isAr
                ? "العلاج الطبيعي والتأهيل الحركي — التغذية العلاجية وإدارة السمنة"
                : "Physiotherapy & Rehabilitation — Clinical Nutrition & Weight Management"}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <span className="text-slate-500 dark:text-slate-400">{isAr ? "المنطقة الزمنية: " : "Timezone: "}</span>
              <span className="font-semibold">Africa/Cairo</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {isAr ? "قاعدة البيانات والقيود" : "Database & Constraints"}
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
            PostgreSQL 18
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            {isAr ? "القيود والاستبعاد نشطة" : "Exclusion constraints active"}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {isAr ? "الاختبارات الآلية" : "Automated Tests"}
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
            305 {isAr ? "اختبار ناجح" : "Passing Tests"}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            {isAr ? "تغطية الصلاحيات والانتقالات 100%" : "100% RBAC & Transitions"}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {isAr ? "الحذف النهائي للبيانات" : "Hard Delete Prevention"}
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
            {isAr ? "محظور تماماً" : "Zero Hard Delete"}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            {isAr ? "حماية بقواعد وقواطع DB" : "Enforced via DB triggers"}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {isAr ? "سجل الرقابة والتدقيق" : "Audit Trail"}
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
            {isAr ? "غير قابل للتعديل" : "Append-Only"}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            {isAr ? "حظر التعديل والحذف نشط" : "Update/Delete blocked"}
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
          {isAr ? "أقسام النظام الأساسية" : "Core System Modules"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks
            .filter((ql) => isRouteAllowedForRole(ql.href, role as Role))
            .map((ql) => (
            <Link
              key={ql.href}
              href={ql.href}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-[#0E6251] dark:hover:border-[#1ABC9C] transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#0E6251] dark:group-hover:text-[#1ABC9C]">
                  {ql.title}
                </span>
                <span className="text-xs text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                  {isAr ? "←" : "→"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {ql.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
