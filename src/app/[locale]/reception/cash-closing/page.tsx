"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import {
  getCurrentUserCashShiftStatusAction,
  closeCashShiftAction,
} from "@/server/actions/billing";

export default function CashClosingPage() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [loading, setLoading] = useState(true);
  const [shiftData, setShiftData] = useState<any>(null);
  const [countedCashEgp, setCountedCashEgp] = useState<string>("");
  const [closingNotes, setClosingNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [closedResult, setClosedResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchShiftStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCurrentUserCashShiftStatusAction({});
      if (res.success && res.data) {
        setShiftData(res.data);
        // Pre-fill counted cash with expected cash for convenience
        setCountedCashEgp((res.data.expectedCashPiasters / 100).toFixed(2));
      } else if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل تحميل حالة الوردية" : "Failed to load shift status"));
      }
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع" : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    fetchShiftStatus();
  }, [fetchShiftStatus]);

  const expectedEgp = shiftData ? shiftData.expectedCashPiasters / 100 : 0;
  const countedNum = parseFloat(countedCashEgp) || 0;
  const differenceEgp = countedNum - expectedEgp;

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const countedCashPiasters = Math.round(countedNum * 100);
      const res = await closeCashShiftAction({
        countedCashPiasters,
        closingNotes: closingNotes || undefined,
      });

      if (res.success && res.data) {
        setClosedResult(res.data);
      } else if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل تقفيل الوردية" : "Failed to close cash shift"));
      }
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع أثناء تقفيل الوردية" : "Error closing shift");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#0E6251] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            {isAr ? "تقفيل الوردية النقدية (مطابقة درج الخزينة)" : "Cash Shift Closing & Drawer Audit"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAr
              ? "حساب النقدية المتوقعة وتجميد اللقطة المالية (Frozen Snapshot) وترحيل المعاملات [R-8.4-1, R-8.4-3]."
              : "Calculates expected drawer balance, creates frozen snapshot, and locks transactions."}
          </p>
        </div>
        <Link
          href="/reception/today"
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
        >
          &larr; {isAr ? "العودة لشاشة اليوم" : "Back to Today"}
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Success View: Closed Shift Snapshot */}
      {closedResult ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-300 dark:border-emerald-800 p-8 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center text-3xl mx-auto">
            ✓
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            {isAr ? "تم إغلاق الوردية النقدية بنجاح" : "Cash Shift Closed Successfully"}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isAr
              ? `تم حفظ اللقطة المالية المجمدة للوردية رقم (${closedResult.shiftNumber}) وتثبيت الفارق وإقفال المعاملات عن التعديل.`
              : `Frozen snapshot recorded for Shift #${closedResult.shiftNumber}. Transactions locked from further modifications.`}
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto py-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-[11px] text-slate-400">{isAr ? "المتوقع" : "Expected"}</div>
              <div className="font-mono font-bold text-sm text-slate-700 dark:text-slate-300">
                {(closedResult.expectedCashPiasters / 100).toFixed(2)} ج.م
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">{isAr ? "الفعلي المحصى" : "Counted"}</div>
              <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                {(closedResult.countedCashPiasters / 100).toFixed(2)} ج.م
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">{isAr ? "الفارق" : "Difference"}</div>
              <div
                className={`font-mono font-bold text-sm ${
                  closedResult.differencePiasters === 0
                    ? "text-emerald-600"
                    : closedResult.differencePiasters > 0
                    ? "text-blue-600"
                    : "text-rose-600"
                }`}
              >
                {(closedResult.differencePiasters / 100).toFixed(2)} ج.م
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-3">
            <Link
              href="/reception/today"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#0E6251] text-white hover:bg-[#117A65]"
            >
              {isAr ? "العودة للاستقبال" : "Return to Reception"}
            </Link>
            <button
              onClick={() => {
                setClosedResult(null);
                fetchShiftStatus();
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
            >
              {isAr ? "تحديث الحالة" : "Refresh Status"}
            </button>
          </div>
        </div>
      ) : (
        /* Form View: Unclosed Transactions & Closing */
        <div className="space-y-6">
          {/* Summary Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Cash Payments */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold block">
                {isAr ? "المقبوضات النقدية (+)" : "Cash In (+)"}
              </span>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {((shiftData?.cashPaymentsTotal || 0) / 100).toFixed(2)} EGP
              </div>
              <span className="text-[10px] text-slate-400">
                {shiftData?.paymentsCount || 0} {isAr ? "إيصالات تحصيل" : "receipts"}
              </span>
            </div>

            {/* 2. Cash Refunds */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold block">
                {isAr ? "الاستردادات المصروفة (-)" : "Cash Refunds (-)"}
              </span>
              <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                {((shiftData?.cashRefundsTotal || 0) / 100).toFixed(2)} EGP
              </div>
              <span className="text-[10px] text-slate-400">
                {shiftData?.refundsCount || 0} {isAr ? "عمليات استرداد" : "refunds"}
              </span>
            </div>

            {/* 3. Cash Expenses */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold block">
                {isAr ? "مصروفات النثرية (-)" : "Cash Expenses (-)"}
              </span>
              <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                {((shiftData?.cashExpensesTotal || 0) / 100).toFixed(2)} EGP
              </div>
              <span className="text-[10px] text-slate-400">
                {shiftData?.expensesCount || 0} {isAr ? "مصروفات مسجلة" : "expenses"}
              </span>
            </div>

            {/* 4. Expected Cash */}
            <div className="bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 p-4 space-y-1">
              <span className="text-[11px] text-teal-800 dark:text-teal-300 font-semibold block">
                {isAr ? "النقدية المتوقعة بالدرج (=)" : "Expected Drawer Cash (=)"}
              </span>
              <div className="text-2xl font-black font-mono text-[#0E6251] dark:text-teal-400">
                {expectedEgp.toFixed(2)} EGP
              </div>
              <span className="text-[10px] text-teal-700/70">
                {isAr ? "رصيد الدرج المطلوب عده" : "Target drawer cash"}
              </span>
            </div>
          </div>

          {/* Form: Counted Cash & Submit */}
          <form
            onSubmit={handleCloseShift}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5"
          >
            <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              {isAr ? "بيانات الإغلاق وعد الخزينة" : "Closing Details & Physical Count"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "النقدية الفعلية المحصاة في الدرج (ج.م)" : "Actual Counted Cash (EGP)"} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={countedCashEgp}
                  onChange={(e) => setCountedCashEgp(e.target.value)}
                  className="w-full px-3 py-2 text-base font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#0E6251]"
                />
              </div>

              {/* Difference Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "الفارق بين الفعلي والمتوقع" : "Count Difference / Variance"}
                </label>
                <div
                  className={`px-4 py-2 rounded-xl border font-mono font-bold text-base flex justify-between items-center ${
                    Math.abs(differenceEgp) < 0.001
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : differenceEgp > 0
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  <span>
                    {Math.abs(differenceEgp) < 0.001
                      ? isAr
                        ? "متطابق تماماً (0.00)"
                        : "Exact Match (0.00)"
                      : differenceEgp > 0
                      ? isAr
                        ? `فائض (+${differenceEgp.toFixed(2)})`
                        : `Surplus (+${differenceEgp.toFixed(2)})`
                      : isAr
                      ? `عجز (${differenceEgp.toFixed(2)})`
                      : `Deficit (${differenceEgp.toFixed(2)})`}
                  </span>
                  <span>{differenceEgp.toFixed(2)} EGP</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? "ملاحظات إغلاق الوردية" : "Shift Closing Notes"}
              </label>
              <textarea
                rows={2}
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder={
                  isAr
                    ? "توضيح أي فروقات في النقدية أو تسليم العهدة للموظف التالي..."
                    : "Notes on variance or drawer handover..."
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/reception/today"
                className="px-4 py-2 text-xs rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
              >
                {isAr ? "إلغاء والعودة" : "Cancel"}
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 text-xs font-bold rounded-xl bg-[#0E6251] text-white hover:bg-[#117A65] shadow-md transition disabled:opacity-50"
              >
                {submitting
                  ? isAr
                    ? "جارٍ الإقفال والحفظ..."
                    : "Closing Shift..."
                  : isAr
                  ? "تأكيد إغلاق الوردية وترحيل الخزينة"
                  : "Confirm Shift Closing"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
