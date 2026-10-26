"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import {
  getClinicReportAction,
  exportReportToCsvAction,
  type ReportType,
} from "@/server/actions/backoffice";

export default function ReportsPage() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const todayStr = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [activeTab, setActiveTab] = useState<ReportType>("TODAY_SUMMARY");
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClinicReportAction({
        reportType: activeTab,
        startDate,
        endDate,
      });

      if (res.success && res.data) {
        setReportData(res.data);
      } else if (!res.success) {
        setError(res.error?.message || "فشل تحميل التقرير");
      }
    } catch {
      setError(isAr ? "حدث خطأ أثناء إعداد التقرير" : "Error loading report");
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate, isAr]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = async () => {
    setExporting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await exportReportToCsvAction({
        reportType: activeTab,
        startDate,
        endDate,
      });

      if (res.success && res.data) {
        const blob = new Blob([res.data.csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.data.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setSuccessMsg(
          isAr
            ? "تم تصدير ملف CSV بنجاح (خالٍ تماماً من أي بيانات تشخيص سريري) [R-12-6]"
            : "CSV exported successfully (strictly privacy safe)"
        );
      } else if (!res.success) {
        setError(res.error?.message || "فشل تصدير التقرير");
      }
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء التصدير");
    } finally {
      setExporting(false);
    }
  };

  const REPORT_TABS: Array<{ key: ReportType; labelAr: string; labelEn: string; icon: string }> = [
    { key: "TODAY_SUMMARY", labelAr: "1. ملخص اليوم الشامل", labelEn: "1. Today Summary", icon: "📊" },
    { key: "CLINICIAN_ACTIVITY", labelAr: "2. إنتاجية المعالجين", labelEn: "2. Clinician Productivity", icon: "👨‍⚕️" },
    { key: "FINANCIAL_REVENUE", labelAr: "3. الإيرادات والخزينة", labelEn: "3. Revenue & Drawer", icon: "💵" },
    { key: "SERVICES_PACKAGES", labelAr: "4. الخدمات والباقات", labelEn: "4. Services & Packages", icon: "📦" },
    { key: "PATIENT_RETENTION", labelAr: "5. استبقاء المرضى", labelEn: "5. Patient Retention", icon: "👥" },
    { key: "EXPENSES_SUMMARY", labelAr: "6. ملخص المصروفات", labelEn: "6. Expenses Summary", icon: "💸" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xl">
              📈
            </span>
            {isAr ? "التقارير المالية والتشغيلية الشاملة" : "Operational & Financial Reports"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isAr
              ? "6 تقارير تحليلية معتمدة مع تصدير CSV آمن وخالٍ من أي تشخيصات طبية [R-12-6]"
              : "6 comprehensive reports with privacy-safe CSV export [R-12-6]"}
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={exporting || loading}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
        >
          <span>📥</span>
          {exporting
            ? isAr ? "جاري التصدير..." : "Exporting..."
            : isAr ? "تصدير إلى إكسيل (CSV)" : "Export CSV"}
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {REPORT_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                isActive
                  ? "bg-blue-600/20 border-blue-500/40 text-blue-400 shadow-md ring-1 ring-blue-500/30"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{isAr ? tab.labelAr : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Date Pickers */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {isAr ? "من تاريخ" : "From Date"}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {isAr ? "إلى تاريخ" : "To Date"}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
            />
          </div>
        </div>

        <button
          onClick={fetchReport}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
        >
          {isAr ? "تحديث التقرير" : "Refresh"}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
          {successMsg}
        </div>
      )}

      {/* Active Report Content */}
      <div className="space-y-6">
        {loading ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-16 text-center text-slate-400 text-sm">
            {isAr ? "جاري تجميع وحساب بيانات التقرير..." : "Calculating report metrics..."}
          </div>
        ) : !reportData ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-16 text-center text-slate-500 text-sm">
            {isAr ? "لا توجد بيانات متاحة في هذه الفترة" : "No data available in this period"}
          </div>
        ) : (
          <>
            {/* 1. TODAY SUMMARY */}
            {activeTab === "TODAY_SUMMARY" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <div className="text-xs text-slate-400 uppercase">{isAr ? "إجمالي المواعيد" : "Appointments"}</div>
                    <div className="text-2xl font-bold text-white mt-1 font-mono">{reportData.totalAppointments}</div>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <div className="text-xs text-slate-400 uppercase">{isAr ? "الجلسات المكتملة" : "Completed"}</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{reportData.completedAppointments}</div>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <div className="text-xs text-slate-400 uppercase">{isAr ? "الإيرادات المحصلة" : "Revenue"}</div>
                    <div className="text-2xl font-bold text-blue-400 mt-1 font-mono">
                      {(reportData.totalRevenuePiasters / 100).toLocaleString()} ج.م
                    </div>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <div className="text-xs text-slate-400 uppercase">{isAr ? "صافي الدخل" : "Net Profit"}</div>
                    <div className="text-2xl font-bold text-teal-400 mt-1 font-mono">
                      {(reportData.netPiasters / 100).toLocaleString()} ج.م
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-3">
                  <h3 className="text-sm font-bold text-slate-200">{isAr ? "التفاصيل الإحصائية لليوم" : "Statistical Breakdown"}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 flex justify-between">
                      <span className="text-slate-400">{isAr ? "المواعيد الملغاة:" : "Cancelled:"}</span>
                      <span className="font-bold text-rose-400 font-mono">{reportData.cancelledAppointments}</span>
                    </div>
                    <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 flex justify-between">
                      <span className="text-slate-400">{isAr ? "حالات عدم الحضور (No-Show):" : "No-Show:"}</span>
                      <span className="font-bold text-amber-400 font-mono">{reportData.noShowAppointments}</span>
                    </div>
                    <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 flex justify-between">
                      <span className="text-slate-400">{isAr ? "إجمالي المصروفات التشغيلية:" : "Expenses:"}</span>
                      <span className="font-bold text-rose-400 font-mono">
                        {(reportData.totalExpensesPiasters / 100).toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CLINICIAN ACTIVITY */}
            {activeTab === "CLINICIAN_ACTIVITY" && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
                <h3 className="text-sm font-bold text-slate-200">{isAr ? "إنتاجية ونشاط الأطباء والمعالجين" : "Clinician Activity Table"}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-800/40">
                        <th className="p-3">{isAr ? "المعالج" : "Clinician"}</th>
                        <th className="p-3">{isAr ? "الدور / التخصص" : "Role"}</th>
                        <th className="p-3">{isAr ? "إجمالي المواعيد" : "Total Appts"}</th>
                        <th className="p-3">{isAr ? "الجلسات المكتملة" : "Completed"}</th>
                        <th className="p-3">{isAr ? "الإلغاء وعدم الحضور" : "Cancelled / No-Show"}</th>
                        <th className="p-3">{isAr ? "نسبة الإلغاء" : "Cancel Rate"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(reportData.clinicianActivity || []).map((c: any) => (
                        <tr key={c.clinicianId} className="hover:bg-slate-800/30">
                          <td className="p-3 font-semibold text-white">{c.clinicianName}</td>
                          <td className="p-3 text-slate-400">{c.role}</td>
                          <td className="p-3 font-mono">{c.totalAppointments}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">{c.completedSessions}</td>
                          <td className="p-3 font-mono text-amber-400">{c.cancelledCount + c.noShowCount}</td>
                          <td className="p-3 font-mono font-bold">{c.cancellationRatePercent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. FINANCIAL REVENUE */}
            {activeTab === "FINANCIAL_REVENUE" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <div className="text-xs text-slate-400 uppercase">{isAr ? "المتحصلات النقدية (الكاش)" : "Cash Revenue"}</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                      {(reportData.cashRevenuePiasters / 100).toLocaleString()} ج.م
                    </div>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <div className="text-xs text-slate-400 uppercase">{isAr ? "مدفوعات الفيزا والشبكة" : "Card Revenue"}</div>
                    <div className="text-2xl font-bold text-blue-400 mt-1 font-mono">
                      {(reportData.cardRevenuePiasters / 100).toLocaleString()} ج.م
                    </div>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <div className="text-xs text-slate-400 uppercase">{isAr ? "تحويلات إنستاباي والمحافظ" : "Transfer Revenue"}</div>
                    <div className="text-2xl font-bold text-purple-400 mt-1 font-mono">
                      {(reportData.transferRevenuePiasters / 100).toLocaleString()} ج.م
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200">{isAr ? "إجمالي الإيرادات المحصلة الفعلية:" : "Total Net Revenue:"}</span>
                  <span className="text-2xl font-bold text-emerald-400 font-mono">
                    {(reportData.totalRevenuePiasters / 100).toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            )}

            {/* 4. SERVICES & PACKAGES */}
            {activeTab === "SERVICES_PACKAGES" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <div className="text-xs text-slate-400 uppercase">{isAr ? "الباقات المباعة" : "Packages Sold"}</div>
                  <div className="text-2xl font-bold text-white mt-1 font-mono">{reportData.packagesSold}</div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <div className="text-xs text-slate-400 uppercase">{isAr ? "الجلسات المكتملة ضمن باقات" : "Completed Package Sessions"}</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                    {reportData.completedPackageSessions} / {reportData.totalPackageSessions}
                  </div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <div className="text-xs text-slate-400 uppercase">{isAr ? "معدل استهلاك الباقات" : "Utilization Rate"}</div>
                  <div className="text-2xl font-bold text-blue-400 mt-1 font-mono">{reportData.utilizationRatePercent}%</div>
                </div>
              </div>
            )}

            {/* 5. PATIENT RETENTION */}
            {activeTab === "PATIENT_RETENTION" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <div className="text-xs text-slate-400 uppercase">{isAr ? "المرضى الجدد المسجلين" : "New Patients Registered"}</div>
                  <div className="text-3xl font-bold text-teal-400 mt-1 font-mono">{reportData.newPatientsRegistered}</div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <div className="text-xs text-slate-400 uppercase">{isAr ? "إجمالي المرضى النشطين" : "Active Patients"}</div>
                  <div className="text-3xl font-bold text-white mt-1 font-mono">{reportData.totalActivePatients}</div>
                </div>
              </div>
            )}

            {/* 6. EXPENSES SUMMARY */}
            {activeTab === "EXPENSES_SUMMARY" && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <span className="text-sm font-bold text-slate-200">{isAr ? "المصروفات حسب البند والتصنيف" : "Expenses by Category"}</span>
                  <span className="text-lg font-bold text-rose-400 font-mono">
                    {(reportData.totalExpensesPiasters / 100).toLocaleString()} ج.م
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {Object.entries(reportData.byCategory || {}).map(([cat, amount]: [string, any]) => (
                    <div key={cat} className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 flex justify-between">
                      <span className="text-slate-300 font-semibold">{cat}</span>
                      <span className="font-mono text-white font-bold">{(amount / 100).toLocaleString()} ج.م</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
