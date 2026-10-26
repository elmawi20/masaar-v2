"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { useRole } from "@/context/RoleContext";
import {
  calculateClinicianCommissionsAction,
  createCommissionPayoutAction,
  voidCommissionPayoutAction,
} from "@/server/actions/backoffice";
import { getCalendarMetadataAction } from "@/server/actions/scheduling";
import { PaymentMethod } from "@prisma/client";

export default function CommissionsManagementPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const { role } = useRole();
  const isOwner = role === "OWNER";

  const todayStr = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);

  const [clinicians, setClinicians] = useState<any[]>([]);
  const [selectedClinicianId, setSelectedClinicianId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [calculationData, setCalculationData] = useState<any | null>(null);
  const [selectedApptIds, setSelectedApptIds] = useState<string[]>([]);

  // Payout confirmation modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [payoutNotes, setPayoutNotes] = useState("");
  const [submittingPayout, setSubmittingPayout] = useState(false);

  // Void payout modal
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [payoutToVoidId, setPayoutToVoidId] = useState<string>("");
  const [voidReason, setVoidReason] = useState("");
  const [submittingVoid, setSubmittingVoid] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load Clinicians list
  useEffect(() => {
    async function loadClinicians() {
      const res = await getCalendarMetadataAction({});
      if (res.success && res.data && res.data.clinicians?.length > 0) {
        setClinicians(res.data.clinicians);
        setSelectedClinicianId(res.data.clinicians[0].id);
      }
    }
    loadClinicians();
  }, []);

  const fetchCommissions = useCallback(async () => {
    if (!selectedClinicianId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await calculateClinicianCommissionsAction({
        clinicianId: selectedClinicianId,
        startDate,
        endDate,
      });

      if (res.success && res.data) {
        setCalculationData(res.data);
        // By default, select all unpaid sessions
        setSelectedApptIds(res.data.unpaidSessions.map((s: any) => s.appointmentId));
      } else if (!res.success) {
        setError(res.error?.message || "فشل احتساب العمولات");
      }
    } catch {
      setError(isAr ? "حدث خطأ أثناء احتساب العمولات" : "Error calculating commissions");
    } finally {
      setLoading(false);
    }
  }, [selectedClinicianId, startDate, endDate, isAr]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  const toggleSelectSession = (id: string) => {
    setSelectedApptIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (calculationData) {
      setSelectedApptIds(calculationData.unpaidSessions.map((s: any) => s.appointmentId));
    }
  };

  const deselectAll = () => {
    setSelectedApptIds([]);
  };

  // Selected sessions total
  const selectedTotalCommissionPiasters = React.useMemo(() => {
    if (!calculationData) return 0;
    return calculationData.unpaidSessions
      .filter((s: any) => selectedApptIds.includes(s.appointmentId))
      .reduce((sum: number, s: any) => sum + s.commissionAmountPiasters, 0);
  }, [calculationData, selectedApptIds]);

  const handleOpenPayoutModal = () => {
    if (selectedApptIds.length === 0) return;
    setPayoutMethod(PaymentMethod.CASH);
    setPayoutNotes(
      isAr
        ? `صرف عمولة ${selectedApptIds.length} جلسة عن الفترة ${startDate} إلى ${endDate}`
        : `Commission payout for ${selectedApptIds.length} sessions`
    );
    setShowPayoutModal(true);
  };

  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinicianId || selectedApptIds.length === 0) return;

    setSubmittingPayout(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await createCommissionPayoutAction({
        clinicianId: selectedClinicianId,
        periodStartDate: startDate,
        periodEndDate: endDate,
        appointmentIds: selectedApptIds,
        paymentMethod: payoutMethod,
        notes: payoutNotes || undefined,
      });

      if (res.success) {
        setShowPayoutModal(false);
        setSuccessMsg(
          isAr
            ? `تم اعتماد صرف الدفعة بنجاح بقيمة ${(selectedTotalCommissionPiasters / 100)} ج.م وتسجيلها كمصروف [R-11-2]`
            : `Payout created and recorded as expense`
        );
        fetchCommissions();
      } else {
        setError(res.error?.message || "فشل اعتماد صرف الدفعة");
      }
    } catch (err: any) {
      setError(err?.message || "حدث خطأ غير متوقع");
    } finally {
      setSubmittingPayout(false);
    }
  };

  const handleOpenVoidModal = (payoutId: string) => {
    setPayoutToVoidId(payoutId);
    setVoidReason("");
    setShowVoidModal(true);
  };

  const handleSubmitVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutToVoidId) return;

    setSubmittingVoid(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await voidCommissionPayoutAction({
        payoutId: payoutToVoidId,
        voidReason,
      });

      if (res.success) {
        setShowVoidModal(false);
        setSuccessMsg(
          isAr
            ? "تم إلغاء صرف الدفعة وإعادة الجلسات لحالة غير مدفوعة بنجاح [Q-16]"
            : "Payout voided and sessions released"
        );
        fetchCommissions();
      } else {
        setError(res.error?.message || "فشل إلغاء الدفعة");
      }
    } catch (err: any) {
      setError(err?.message || "حدث خطأ غير متوقع");
    } finally {
      setSubmittingVoid(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xl">
              💰
            </span>
            {isAr ? "إدارة واعتماد عمولات الأطباء والمعالجين" : "Clinician Commission Payout Run"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isAr
              ? "احتساب الجلسات المكتملة، منع تكرار الصرف، وتوليد مصروف العمولات تلقائياً"
              : "Audit completed sessions, prevent double payments, and issue payout batches"}
          </p>
        </div>

        {calculationData && selectedApptIds.length > 0 && (
          <button
            onClick={handleOpenPayoutModal}
            className="px-5 py-2.5 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <span>✓</span>
            {isAr
              ? `صرف الدفعة المحددة (${(selectedTotalCommissionPiasters / 100).toLocaleString()} ج.م)`
              : `Approve Payout (${(selectedTotalCommissionPiasters / 100).toLocaleString()} EGP)`}
          </button>
        )}
      </div>

      {/* Filter / Clinician Selection */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {isAr ? "المعالج / الطبيب" : "Clinician"}
            </label>
            <select
              value={selectedClinicianId}
              onChange={(e) => setSelectedClinicianId(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white min-w-50"
            >
              {clinicians.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.jobTitle})
                </option>
              ))}
            </select>
          </div>

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
          onClick={fetchCommissions}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
        >
          {isAr ? "إعادة الاحتساب" : "Recalculate"}
        </button>
      </div>

      {/* KPI Cards */}
      {calculationData && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="text-xs text-slate-400 uppercase tracking-wider">
              {isAr ? "نظام العمولة المتفق عليه" : "Commission Scheme"}
            </div>
            <div className="text-lg font-bold text-white mt-1">
              {calculationData.clinician.commissionType === "PERCENT"
                ? `${calculationData.clinician.commissionRate}% نسبة مئوية`
                : calculationData.clinician.commissionType === "FIXED_PER_SESSION"
                ? `${calculationData.clinician.commissionRate} ج.م / جلسة`
                : isAr ? "لا يوجد (راتب ثابت)" : "None"}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="text-xs text-slate-400 uppercase tracking-wider">
              {isAr ? "الجلسات المكتملة غير المصروفة" : "Unpaid Sessions Count"}
            </div>
            <div className="text-2xl font-bold text-blue-400 mt-1 font-mono">
              {calculationData.unpaidCount} {isAr ? "جلسة" : "sessions"}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="text-xs text-slate-400 uppercase tracking-wider">
              {isAr ? "إجمالي إيراد الجلسات" : "Total Sessions Value"}
            </div>
            <div className="text-2xl font-bold text-slate-200 mt-1 font-mono">
              {(calculationData.totalSessionValuePiasters / 100).toLocaleString()}{" "}
              <span className="text-xs text-slate-400 font-normal">ج.م</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="text-xs text-slate-400 uppercase tracking-wider">
              {isAr ? "إجمالي العمولة المستحقة" : "Total Commission Due"}
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              {(calculationData.totalCommissionPiasters / 100).toLocaleString()}{" "}
              <span className="text-xs text-slate-400 font-normal">ج.م</span>
            </div>
          </div>
        </div>
      )}

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

      {/* Sessions Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>📋</span>
            {isAr ? "الجلسات المكتملة الجاهزة للصرف (غير مسددة)" : "Completed Sessions Eligible for Payout"}
          </h2>

          {calculationData?.unpaidSessions.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={selectAll}
                className="text-emerald-400 hover:underline px-2 py-1"
              >
                {isAr ? "تحديد الكل" : "Select All"}
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={deselectAll}
                className="text-slate-400 hover:underline px-2 py-1"
              >
                {isAr ? "إلغاء التحديد" : "Deselect All"}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            {isAr ? "جاري احتساب الجلسات المكتملة..." : "Calculating completed sessions..."}
          </div>
        ) : !calculationData || calculationData.unpaidSessions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            {isAr
              ? "لا توجد جلسات مكتملة غير مسددة لهذا المعالج خلال هذه الفترة (جميع الجلسات تم صرفها أو لا توجد جلسات) [R-11-2]"
              : "No unpaid completed sessions for this clinician in this period [R-11-2]"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-800/40">
                  <th className="p-3 w-10 text-center">اختيار</th>
                  <th className="p-3">{isAr ? "تاريخ ووقت الجلسة" : "Date & Time"}</th>
                  <th className="p-3">{isAr ? "المريض" : "Patient"}</th>
                  <th className="p-3">{isAr ? "نوع الجلسة" : "Session Type"}</th>
                  <th className="p-3">{isAr ? "قيمة الجلسة" : "Session Value"}</th>
                  <th className="p-3">{isAr ? "النسبة / الشريحة" : "Rate"}</th>
                  <th className="p-3">{isAr ? "مبلغ العمولة" : "Commission"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {calculationData.unpaidSessions.map((s: any) => {
                  const isChecked = selectedApptIds.includes(s.appointmentId);
                  return (
                    <tr
                      key={s.appointmentId}
                      onClick={() => toggleSelectSession(s.appointmentId)}
                      className={`cursor-pointer transition-colors ${
                        isChecked ? "bg-emerald-500/10" : "hover:bg-slate-800/30"
                      }`}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectSession(s.appointmentId)}
                          className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                        />
                      </td>
                      <td className="p-3 font-mono">
                        {new Date(s.startsAt).toLocaleString(isAr ? "ar-EG" : "en-US", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="p-3 font-semibold text-white">{s.patientName}</td>
                      <td className="p-3 text-slate-400">{s.sessionTypeName}</td>
                      <td className="p-3 font-mono">
                        {(s.sessionValuePiasters / 100).toLocaleString()} ج.م
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                          {s.commissionType === "PERCENT"
                            ? `${s.commissionRate}%`
                            : s.commissionType === "FIXED_PER_SESSION"
                            ? `${s.commissionRate} ج.م`
                            : "0"}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-emerald-400 font-mono text-sm">
                        {(s.commissionAmountPiasters / 100).toLocaleString()} ج.م
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Confirm Payout Batch */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">💵</span>
              {isAr ? "تأكيد اعتماد صرف دفعة العمولات" : "Confirm Commission Payout"}
            </h2>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">{isAr ? "المعالج المستحق:" : "Clinician:"}</span>
                <span className="font-semibold text-white">
                  {calculationData?.clinician.fullName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isAr ? "عدد الجلسات المحددة:" : "Sessions Count:"}</span>
                <span className="font-semibold text-white">{selectedApptIds.length} جلسة</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-700 text-sm">
                <span className="text-slate-200 font-medium">{isAr ? "إجمالي المبلغ المنصرف:" : "Total Payout:"}</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {(selectedTotalCommissionPiasters / 100).toLocaleString()} ج.م
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              {isAr
                ? "سيتم تسجيل هذه الدفعة تلقائياً كمصروف تشغيلي (عمولات أطباء)، ولن يتم احتساب هذه الجلسات في أي دفعة أخرى مستقبلاً [R-11-2]."
                : "This creates an expense entry and permanently links the completed sessions."}
            </p>

            <form onSubmit={handleSubmitPayout} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {isAr ? "طريقة صرف العمولة" : "Payout Method"} *
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value={PaymentMethod.CASH}>{isAr ? "خزينة نقدية (كاش)" : "Cash Drawer"}</option>
                  <option value={PaymentMethod.INSTAPAY}>Instapay / تحويل بنكي</option>
                  <option value={PaymentMethod.VODAFONE_CASH}>Vodafone Cash</option>
                  <option value={PaymentMethod.CARD}>{isAr ? "فيزا / شبكة / بطاقة" : "Card"}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {isAr ? "ملاحظات إضافية وتوثيق الدفعة" : "Notes"}
                </label>
                <textarea
                  rows={2}
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submittingPayout}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {submittingPayout ? (isAr ? "جاري الاعتماد..." : "Processing...") : isAr ? "تأكيد وصرف العمولة" : "Confirm Payout"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Void Payout (Owner only Q-16) */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-rose-500">⚠️</span>
              {isAr ? "إلغاء دفعة عمولة معتمدة" : "Void Commission Payout"}
            </h2>

            <p className="text-xs text-slate-400">
              {isAr
                ? "إلغاء هذه الدفعة سيلغي المصروف المرتبط بها، ويعيد جميع الجلسات المشمولة فيها إلى حالة 'غير مسددة' لإعادة صرفها مجدداً [Q-16]."
                : "Voiding releases the sessions back to unpaid and cancels the expense [Q-16]."}
            </p>

            <form onSubmit={handleSubmitVoid} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-rose-400 mb-1">
                  {isAr ? "سبب الإلغاء (إلزامي للتدقيق والرقابة) [Q-16]" : "Void Reason"} *
                </label>
                <textarea
                  rows={3}
                  required
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder={isAr ? "سبب إلغاء الصرف..." : "Reason"}
                  className="w-full bg-slate-800 border border-rose-500/50 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVoidModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  {isAr ? "تراجع" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submittingVoid}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {submittingVoid ? (isAr ? "جاري الإلغاء..." : "Voiding...") : isAr ? "تأكيد إلغاء الدفعة" : "Confirm Void"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
