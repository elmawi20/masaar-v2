"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { getMyCommissionsAction } from "@/server/actions/backoffice";

export default function MyCommissionsPage() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const todayStr = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);

  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [totalCommissionPiasters, setTotalCommissionPiasters] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchMyCommissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyCommissionsAction({
        startDate,
        endDate,
      });

      if (res.success && res.data) {
        setPayouts(res.data.payouts || []);
        setTotalCommissionPiasters(res.data.totalCommissionPiasters || 0);
      } else if (!res.success) {
        setError(res.error?.message || "فشل تحميل ملخص العمولات");
      }
    } catch {
      setError(isAr ? "حدث خطأ أثناء تحميل العمولات" : "Error loading commissions");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, isAr]);

  useEffect(() => {
    fetchMyCommissions();
  }, [fetchMyCommissions]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xl">
              💳
            </span>
            {isAr ? "حساب العمولات الشخصي للمعالج" : "My Commission Summary"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isAr
              ? "متابعة دفعات العمولات المعتمدة وإجمالي المستحقات المالية عن الجلسات المكتملة"
              : "Track approved commission payouts and completed sessions"}
          </p>
        </div>
      </div>

      {/* Date Filter */}
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
          onClick={fetchMyCommissions}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
        >
          {isAr ? "تحديث التقرير" : "Refresh"}
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            {isAr ? "إجمالي العمولات المصروفة خلال الفترة" : "Total Payouts in Period"}
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-2 font-mono">
            {(totalCommissionPiasters / 100).toLocaleString(isAr ? "ar-EG" : "en-US")}{" "}
            <span className="text-xs text-slate-400 font-normal">ج.م</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            {isAr ? "عدد دفعات الصرف المعتمدة" : "Approved Payout Runs"}
          </div>
          <div className="text-3xl font-bold text-white mt-2 font-mono">
            {payouts.length}
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Payouts list */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span>📜</span>
          {isAr ? "سجل دفعات العمولات المعتمدة" : "Commission Payout History"}
        </h2>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            {isAr ? "جاري تحميل الدفعات..." : "Loading payouts..."}
          </div>
        ) : payouts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            {isAr
              ? "لا توجد دفعات عمولة معتمدة ومصروفة لك خلال هذه الفترة."
              : "No commission payouts in this period."}
          </div>
        ) : (
          <div className="space-y-4">
            {payouts.map((p) => (
              <div
                key={p.id}
                className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/40 pb-3">
                  <div>
                    <span className="font-semibold text-white text-sm">
                      {isAr ? "دفعة صرف عمولات" : "Payout Run"}
                    </span>
                    <span className="text-xs text-slate-400 mr-2 font-mono">
                      (
                      {new Date(p.periodStartDate).toLocaleDateString(isAr ? "ar-EG" : "en-US")}{" "}
                      -{" "}
                      {new Date(p.periodEndDate).toLocaleDateString(isAr ? "ar-EG" : "en-US")})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono">
                      {p.paymentMethod}
                    </span>
                    <span className="text-base font-bold text-emerald-400 font-mono">
                      {(p.totalPayoutPiasters / 100).toLocaleString()} ج.م
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex flex-wrap justify-between items-center gap-2">
                  <span>
                    {isAr ? "تاريخ الصرف:" : "Date:"}{" "}
                    {new Date(p.payoutDate).toLocaleString(isAr ? "ar-EG" : "en-US")}
                  </span>
                  <span>
                    {isAr ? "عدد الجلسات المشمولة:" : "Sessions:"}{" "}
                    <strong className="text-white font-mono">{p.paidSessions?.length || 0}</strong>
                  </span>
                  {p.notes && <span>{p.notes}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
