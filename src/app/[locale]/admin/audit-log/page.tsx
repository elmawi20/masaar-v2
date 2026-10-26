"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { getAuditLogsAction } from "@/server/actions/backoffice";

const ENTITY_OPTIONS = [
  { value: "", labelAr: "كافة السجلات والكيانات", labelEn: "All Entity Types" },
  { value: "Appointment", labelAr: "المواعيد والحجوزات (Appointment)", labelEn: "Appointment" },
  { value: "Payment", labelAr: "المدفوعات والمقبوضات (Payment)", labelEn: "Payment" },
  { value: "Expense", labelAr: "المصروفات النثرية (Expense)", labelEn: "Expense" },
  { value: "ClinicalNote", labelAr: "الملاحظات السريرية (ClinicalNote)", labelEn: "ClinicalNote" },
  { value: "InBodyRecord", labelAr: "فحوصات InBody والتغذية", labelEn: "InBodyRecord" },
  { value: "Patient", labelAr: "ملفات المرضى (Patient)", labelEn: "Patient" },
  { value: "User", labelAr: "حسابات الموظفين (User)", labelEn: "User" },
  { value: "Package", labelAr: "الباقات والعلاجات (Package)", labelEn: "Package" },
  { value: "CommissionPayout", labelAr: "صرف عمولات الأطباء (Payout)", labelEn: "CommissionPayout" },
  { value: "CashClosing", labelAr: "إغلاق الدرج والورديات (CashClosing)", labelEn: "CashClosing" },
];

export default function AdminAuditLogPage() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const todayStr = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [actionQuery, setActionQuery] = useState("");
  const [pageOffset, setPageOffset] = useState(0);
  const pageSize = 50;

  const [logs, setLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAuditLogsAction({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        entityType: selectedEntity || undefined,
        action: actionQuery.trim() || undefined,
        limit: pageSize,
        offset: pageOffset,
      });

      if (res.success && res.data) {
        setLogs(res.data.logs);
        setTotalCount(res.data.totalCount);
      } else if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل تحميل سجلات الرقابة" : "Failed to load audit logs"));
      }
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع أثناء الاتصال بالخادم" : "Unexpected error fetching audit logs");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedEntity, actionQuery, pageOffset, isAr]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPageOffset(0);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setStartDate(firstOfMonth);
    setEndDate(todayStr);
    setSelectedEntity("");
    setActionQuery("");
    setPageOffset(0);
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat("ar-EG", {
        timeZone: "Africa/Cairo",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("CREATE") || action.includes("ADD") || action.includes("REGISTER")) {
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300";
    }
    if (action.includes("VOID") || action.includes("CANCEL") || action.includes("DEACTIVATE")) {
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300";
    }
    if (action.includes("UPDATE") || action.includes("EDIT") || action.includes("EXTEND")) {
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300";
    }
    return "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border-sky-300";
  };

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto" dir={isAr ? "rtl" : "ltr"}>
      {/* Title & Privacy Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <span className="p-2 bg-primary/10 text-primary rounded-xl text-xl">🛡️</span>
            {isAr ? "سجل الرقابة والتدقيق الأمني الشامل" : "System Security & Operations Audit Trail"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr
              ? "متابعة غير قابلة للتعديل لكافة الإجراءات والعمليات الإدارية والمالية والسريرية (R-13-1)"
              : "Immutable audit trail of all operational, financial, and clinical transactions (R-13-1)"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full bg-muted border border-border font-mono text-muted-foreground">
            {isAr ? `إجمالي القيود: ${totalCount}` : `Total entries: ${totalCount}`}
          </span>
        </div>
      </div>

      {/* Privacy Notice Banner (R-13-3) */}
      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 flex items-start gap-3 text-sm text-blue-900 dark:text-blue-200">
        <span className="text-xl">🔒</span>
        <div>
          <span className="font-semibold block mb-0.5">
            {isAr ? "حماية خصوصية المرضى والبيانات الطبية (R-13-3):" : "Patient Privacy & Clinical Masking (R-13-3):"}
          </span>
          <span>
            {isAr
              ? "يتاح للمالك فقط استعراض التفاصيل السريرية الكاملة. لمدير العيادة، يتم حجب وتشفير الملاحظات السريرية وفحوصات InBody تلقائياً لضمان الامتثال الطبي التام."
              : "Only clinic Owner can view unmasked clinical notes. Managers see automatically masked clinical entries to enforce privacy compliance."}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <form
        onSubmit={handleApplyFilter}
        className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              {isAr ? "من تاريخ" : "From Date"}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              {isAr ? "إلى تاريخ" : "To Date"}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              {isAr ? "نوع الكيان / السجل" : "Entity Type"}
            </label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {isAr ? opt.labelAr : opt.labelEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              {isAr ? "رمز الإجراء / Action" : "Action Name"}
            </label>
            <input
              type="text"
              placeholder={isAr ? "مثال: PAYMENT_VOIDED" : "e.g. PAYMENT_VOIDED"}
              value={actionQuery}
              onChange={(e) => setActionQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStartDate(todayStr);
                setEndDate(todayStr);
              }}
              className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition"
            >
              {isAr ? "اليوم" : "Today"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate(firstOfMonth);
                setEndDate(todayStr);
              }}
              className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition"
            >
              {isAr ? "هذا الشهر" : "This Month"}
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition"
            >
              {isAr ? "إعادة ضبط" : "Reset"}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
          >
            {loading ? (isAr ? "جاري البحث..." : "Filtering...") : isAr ? "تطبيق الفلتر" : "Apply Filters"}
          </button>
        </div>
      </form>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-4 py-3.5">{isAr ? "التاريخ والوقت (القاهرة)" : "Timestamp"}</th>
                <th className="px-4 py-3.5">{isAr ? "المستخدم والصفة" : "User & Role"}</th>
                <th className="px-4 py-3.5">{isAr ? "الإجراء" : "Action"}</th>
                <th className="px-4 py-3.5">{isAr ? "الكيان المستهدف" : "Entity & ID"}</th>
                <th className="px-4 py-3.5">{isAr ? "سبب التعديل / الإلغاء" : "Reason"}</th>
                <th className="px-4 py-3.5 text-center">{isAr ? "تفاصيل التغيير" : "State Diff"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    {isAr ? "جاري تحميل سجل التدقيق..." : "Loading audit trail..."}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    {isAr ? "لا توجد قيود تطابق معايير البحث المحددة" : "No audit records found matching criteria"}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const hasDetails = log.beforeState || log.afterState;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-muted/30 transition">
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-medium text-foreground text-xs">
                            {log.user?.fullName || (isAr ? "مجهول" : "Unknown")}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {log.userRole || log.user?.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-1 text-[11px] font-mono font-semibold rounded-lg border ${getActionBadgeColor(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="text-xs font-semibold block text-foreground">
                            {log.entityType}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {log.entityId ? `${log.entityId.slice(0, 12)}...` : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 max-w-xs truncate text-xs text-muted-foreground">
                          {log.reason ? (
                            <span className="text-foreground font-medium">{log.reason}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {hasDetails ? (
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="px-2.5 py-1 text-xs rounded-lg border border-border hover:bg-muted font-medium transition"
                            >
                              {isExpanded ? (isAr ? "إخفاء التفاصيل" : "Hide") : isAr ? "عرض الفروقات" : "View Diff"}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-muted/20">
                          <td colSpan={6} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                              <div className="p-3 rounded-xl bg-background border border-border">
                                <span className="font-semibold block mb-2 text-rose-600 dark:text-rose-400">
                                  {isAr ? "الحالة السابقة (Before):" : "Before State:"}
                                </span>
                                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-all text-[11px] text-muted-foreground">
                                  {log.beforeState
                                    ? JSON.stringify(log.beforeState, null, 2)
                                    : isAr
                                    ? "لا توجد حالة سابقة (إنشاء جديد)"
                                    : "None (New record created)"}
                                </pre>
                              </div>

                              <div className="p-3 rounded-xl bg-background border border-border">
                                <span className="font-semibold block mb-2 text-emerald-600 dark:text-emerald-400">
                                  {isAr ? "الحالة اللاحقة (After):" : "After State:"}
                                </span>
                                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-all text-[11px] text-muted-foreground">
                                  {log.afterState
                                    ? JSON.stringify(log.afterState, null, 2)
                                    : isAr
                                    ? "تم الحذف / التعطيل"
                                    : "None (Voided / Deactivated)"}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalCount > pageSize && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {isAr
                ? `عرض ${pageOffset + 1} إلى ${Math.min(pageOffset + pageSize, totalCount)} من ${totalCount}`
                : `Showing ${pageOffset + 1} to ${Math.min(pageOffset + pageSize, totalCount)} of ${totalCount}`}
            </span>

            <div className="flex gap-2">
              <button
                disabled={pageOffset === 0 || loading}
                onClick={() => setPageOffset(Math.max(0, pageOffset - pageSize))}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition"
              >
                {isAr ? "السابق" : "Previous"}
              </button>
              <button
                disabled={pageOffset + pageSize >= totalCount || loading}
                onClick={() => setPageOffset(pageOffset + pageSize)}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition"
              >
                {isAr ? "التالي" : "Next"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
