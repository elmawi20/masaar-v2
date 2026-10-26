"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { useRole } from "@/context/RoleContext";
import { listStaffAccountsAction } from "@/server/actions/staff";
import {
  getStaffScheduleAction,
  setStaffScheduleAction,
  listStaffLeavesAction,
  recordStaffLeaveAction,
  cancelStaffLeaveAction,
} from "@/server/actions/schedules";

type ScheduleTab = "SHIFTS" | "LEAVES";

type StaffUser = {
  id: string;
  fullName: string;
  role: string;
};

type DayShiftConfig = {
  dayOfWeek: number;
  hasShift1: boolean;
  s1Start: string;
  s1End: string;
  hasShift2: boolean;
  s2Start: string;
  s2End: string;
};

type LeaveItem = {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  leaveType: "ANNUAL" | "SICK" | "UNPAID" | "OTHER";
  status: "APPROVED" | "PENDING" | "REJECTED" | "CANCELLED";
  note: string | null;
  user?: {
    id: string;
    fullName: string;
    role: string;
  };
};

export default function StaffSchedulesPage() {
  const locale = useLocale();
  const { role: currentRole } = useRole();
  const isAr = locale === "ar";

  const [activeTab, setActiveTab] = useState<ScheduleTab>("SHIFTS");
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Weekday Shifts State (Sat to Fri)
  const weekdays = [
    { id: 0, ar: "السبت", en: "Saturday" },
    { id: 1, ar: "الأحد", en: "Sunday" },
    { id: 2, ar: "الإثنين", en: "Monday" },
    { id: 3, ar: "الثلاثاء", en: "Tuesday" },
    { id: 4, ar: "الأربعاء", en: "Wednesday" },
    { id: 5, ar: "الخميس", en: "Thursday" },
    { id: 6, ar: "الجمعة", en: "Friday" },
  ];

  const [dayConfigs, setDayConfigs] = useState<DayShiftConfig[]>(
    weekdays.map((w) => ({
      dayOfWeek: w.id,
      hasShift1: w.id !== 6, // default working Sat-Thu
      s1Start: "09:00",
      s1End: "14:00",
      hasShift2: false,
      s2Start: "17:00",
      s2End: "21:00",
    }))
  );

  // Leaves State
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveStaffId, setLeaveStaffId] = useState("");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveItem["leaveType"]>("ANNUAL");
  const [leaveNote, setLeaveNote] = useState("");

  const leaveTypeLabels: Record<string, { ar: string; en: string }> = {
    ANNUAL: { ar: "سنوية اعتيادية", en: "Annual Leave" },
    SICK: { ar: "مرضية", en: "Sick Leave" },
    UNPAID: { ar: "بدون راتب", en: "Unpaid Leave" },
    OTHER: { ar: "أخرى / طارئة", en: "Other Leave" },
  };

  // Load Staff List
  useEffect(() => {
    async function loadStaff() {
      setLoading(true);
      try {
        const res = await listStaffAccountsAction({});
        if (res.success && res.data) {
          const staff = res.data as unknown as StaffUser[];
          setStaffList(staff);
          if (staff.length > 0 && !selectedStaffId) {
            setSelectedStaffId(staff[0].id);
            setLeaveStaffId(staff[0].id);
          }
        }
      } catch {
        setError(isAr ? "فشل تحميل العاملين." : "Failed to load staff.");
      } finally {
        setLoading(false);
      }
    }
    loadStaff();
  }, [isAr, selectedStaffId]);

  // Load Schedules for Selected Staff
  const loadStaffSchedule = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
      const res = await getStaffScheduleAction({ userId });
      if (res.success && res.data) {
        const existingShifts = res.data;
        const newConfigs: DayShiftConfig[] = weekdays.map((w) => {
          const shift1 = existingShifts.find((s) => s.dayOfWeek === w.id && s.shiftNumber === 1);
          const shift2 = existingShifts.find((s) => s.dayOfWeek === w.id && s.shiftNumber === 2);

          return {
            dayOfWeek: w.id,
            hasShift1: shift1 ? shift1.isWorking : false,
            s1Start: shift1 ? shift1.startTime : "09:00",
            s1End: shift1 ? shift1.endTime : "14:00",
            hasShift2: shift2 ? shift2.isWorking : false,
            s2Start: shift2 ? shift2.startTime : "17:00",
            s2End: shift2 ? shift2.endTime : "21:00",
          };
        });

        setDayConfigs(newConfigs);
      }
    } catch {
      // fallback
    }
  }, [weekdays]);

  // Load Leaves
  const loadLeaves = useCallback(async () => {
    try {
      const res = await listStaffLeavesAction({});
      if (res.success && res.data) {
        setLeaves(res.data as unknown as LeaveItem[]);
      }
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    if (selectedStaffId) {
      loadStaffSchedule(selectedStaffId);
    }
    loadLeaves();
  }, [selectedStaffId, loadStaffSchedule, loadLeaves]);

  // Guard for OWNER & MANAGER (R-1.1-19, R-3-2, R-3-3)
  if (currentRole !== "OWNER" && currentRole !== "MANAGER") {
    return (
      <div className="p-8 text-center max-w-lg mx-auto bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl my-8">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xl mx-auto mb-3">
          ⚠️
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
          {isAr ? "صلاحية غير كافية" : "Access Restricted"}
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {isAr
            ? "جداول نوبات العمل والإجازات مخصصة لمالك العيادة ومدير العيادة فقط."
            : "Staff schedules and leaves administration is restricted to Owner and Manager."}
        </p>
      </div>
    );
  }

  // Handle Save Shifts (R-3-2)
  const handleSaveShifts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const schedulesToSubmit = [];
    for (const c of dayConfigs) {
      if (c.hasShift1) {
        schedulesToSubmit.push({
          dayOfWeek: c.dayOfWeek,
          shiftNumber: 1,
          startTime: c.s1Start,
          endTime: c.s1End,
          isWorking: true,
        });
      }
      if (c.hasShift2) {
        schedulesToSubmit.push({
          dayOfWeek: c.dayOfWeek,
          shiftNumber: 2,
          startTime: c.s2Start,
          endTime: c.s2End,
          isWorking: true,
        });
      }
    }

    try {
      const res = await setStaffScheduleAction({
        userId: selectedStaffId,
        schedules: schedulesToSubmit,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل حفظ جدول النوبات." : "Failed to save schedule."));
        return;
      }

      setSuccessMessage(isAr ? "تم حفظ جدول النوبات الأسبوعية بنجاح." : "Weekly shifts saved successfully.");
      loadStaffSchedule(selectedStaffId);
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع." : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Record Leave (R-3-3)
  const handleRecordLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await recordStaffLeaveAction({
        userId: leaveStaffId,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        leaveType,
        note: leaveNote || null,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل تسجيل الإجازة." : "Failed to record leave."));
        return;
      }

      setSuccessMessage(isAr ? "تم تسجيل الإجازة واعتمادها بنجاح." : "Staff leave recorded and approved.");
      setShowLeaveModal(false);
      setLeaveStartDate("");
      setLeaveEndDate("");
      setLeaveNote("");
      loadLeaves();
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع." : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Cancel Leave (R-3-3)
  const handleCancelLeave = async (leaveId: string) => {
    if (!confirm(isAr ? "هل أنت متأكد من إلغاء هذه الإجازة؟" : "Cancel this leave?")) return;
    try {
      const res = await cancelStaffLeaveAction({ leaveId });
      if (res.success) {
        setSuccessMessage(isAr ? "تم إلغاء الإجازة." : "Leave cancelled.");
        loadLeaves();
      } else {
        setError(res.error?.message);
      }
    } catch {
      setError(isAr ? "فشل إلغاء الإجازة." : "Failed to cancel leave.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {isAr ? "جداول نوبات العمل والإجازات" : "Staff Schedules & Leave Planner"}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {isAr
            ? "تحديد نوبات عمل الموظفين أسبوعياً (حتى ورديتين يومياً) وتسجيل الإجازات الرسمية والمرضية"
            : "Configure staff weekly shifts (up to 2 shifts per day) and record staff leave."}
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)} className="font-bold">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
          <span>✓ {successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("SHIFTS")}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "SHIFTS"
              ? "border-[#0E6251] text-[#0E6251] dark:border-[#48C9B0] dark:text-[#48C9B0]"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          {isAr ? "نوبات العمل الأسبوعية (وردية 1 ووردية 2)" : "Weekly Shifts (Up to 2 Shifts)"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("LEAVES")}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "LEAVES"
              ? "border-[#0E6251] text-[#0E6251] dark:border-[#48C9B0] dark:text-[#48C9B0]"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          {isAr ? "مخطط وسجل الإجازات" : "Leave Planner & Records"}
        </button>
      </div>

      {/* TAB 1: Staff Weekly Shifts (R-3-2) */}
      {activeTab === "SHIFTS" && (
        <div className="space-y-4">
          {/* Staff Member Selector */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <label htmlFor="staffSelect" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? "اختر الموظف / المعالج:" : "Select Staff Member:"}
              </label>
              <select
                id="staffSelect"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-[11px] text-slate-400">
              {isAr
                ? "يسمح النظام بما يصل إلى ورديتين في اليوم الواحد بشرط عدم تداخلهما [R-3-2]"
                : "Up to 2 non-overlapping shifts allowed per working day [R-3-2]"}
            </span>
          </div>

          {/* Shifts Form */}
          <form onSubmit={handleSaveShifts} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {dayConfigs.map((cfg) => {
                const day = weekdays.find((w) => w.id === cfg.dayOfWeek)!;

                return (
                  <div key={cfg.dayOfWeek} className="py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 w-28">
                        {isAr ? day.ar : day.en}
                      </span>

                      <div className="flex items-center gap-4 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cfg.hasShift1}
                            onChange={(e) => {
                              const updated = dayConfigs.map((c) =>
                                c.dayOfWeek === cfg.dayOfWeek ? { ...c, hasShift1: e.target.checked } : c
                              );
                              setDayConfigs(updated);
                            }}
                            className="w-4 h-4 rounded text-[#0E6251]"
                          />
                          <span>{isAr ? "الوردية الأولى (صباحية)" : "Shift 1 (Morning)"}</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cfg.hasShift2}
                            onChange={(e) => {
                              const updated = dayConfigs.map((c) =>
                                c.dayOfWeek === cfg.dayOfWeek ? { ...c, hasShift2: e.target.checked } : c
                              );
                              setDayConfigs(updated);
                            }}
                            className="w-4 h-4 rounded text-[#0E6251]"
                          />
                          <span>{isAr ? "الوردية الثانية (مسائية)" : "Shift 2 (Evening)"}</span>
                        </label>
                      </div>
                    </div>

                    {/* Time Inputs */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-1 sm:ps-28" dir="ltr">
                      {cfg.hasShift1 && (
                        <div className="flex items-center gap-2 text-xs p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                          <span className="font-semibold text-[11px] text-[#0E6251] dark:text-[#48C9B0]">Shift 1:</span>
                          <input
                            type="time"
                            value={cfg.s1Start}
                            onChange={(e) => {
                              const updated = dayConfigs.map((c) =>
                                c.dayOfWeek === cfg.dayOfWeek ? { ...c, s1Start: e.target.value } : c
                              );
                              setDayConfigs(updated);
                            }}
                            className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                          <span>-</span>
                          <input
                            type="time"
                            value={cfg.s1End}
                            onChange={(e) => {
                              const updated = dayConfigs.map((c) =>
                                c.dayOfWeek === cfg.dayOfWeek ? { ...c, s1End: e.target.value } : c
                              );
                              setDayConfigs(updated);
                            }}
                            className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                      )}

                      {cfg.hasShift2 && (
                        <div className="flex items-center gap-2 text-xs p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                          <span className="font-semibold text-[11px] text-amber-600 dark:text-amber-400">Shift 2:</span>
                          <input
                            type="time"
                            value={cfg.s2Start}
                            onChange={(e) => {
                              const updated = dayConfigs.map((c) =>
                                c.dayOfWeek === cfg.dayOfWeek ? { ...c, s2Start: e.target.value } : c
                              );
                              setDayConfigs(updated);
                            }}
                            className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                          <span>-</span>
                          <input
                            type="time"
                            value={cfg.s2End}
                            onChange={(e) => {
                              const updated = dayConfigs.map((c) =>
                                c.dayOfWeek === cfg.dayOfWeek ? { ...c, s2End: e.target.value } : c
                              );
                              setDayConfigs(updated);
                            }}
                            className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                      )}

                      {!cfg.hasShift1 && !cfg.hasShift2 && (
                        <span className="text-xs text-slate-400 italic">
                          {isAr ? "عطلة (لا توجد نوبات عمل)" : "Day off (No shifts)"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#0E6251] text-white hover:bg-[#117A65] disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ نوبات العمل" : "Save Shifts")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Staff Leaves (R-3-3) */}
      {activeTab === "LEAVES" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {isAr
                ? "تسجيل الإجازات السنوية والمرضية لمنع حجز أي مواعيد للموظف خلال فترة إجازته [R-3-3]."
                : "Record staff leaves. The scheduling engine prevents bookings during approved leaves [R-3-3]."}
            </p>

            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#0E6251] text-white hover:bg-[#117A65]"
            >
              <span>+</span>
              <span>{isAr ? "تسجيل إجازة جديدة" : "Record Leave"}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-4 text-start">{isAr ? "الموظف" : "Staff"}</th>
                  <th className="py-2.5 px-4 text-start">{isAr ? "نوع الإجازة" : "Leave Type"}</th>
                  <th className="py-2.5 px-4 text-start">{isAr ? "من تاريخ" : "From"}</th>
                  <th className="py-2.5 px-4 text-start">{isAr ? "إلى تاريخ" : "To"}</th>
                  <th className="py-2.5 px-4 text-start">{isAr ? "ملاحظات" : "Notes"}</th>
                  <th className="py-2.5 px-4 text-start">{isAr ? "الحالة" : "Status"}</th>
                  <th className="py-2.5 px-4 text-end">{isAr ? "إجراء" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      {isAr ? "لا توجد إجازات مسجلة." : "No staff leaves recorded."}
                    </td>
                  </tr>
                ) : (
                  leaves.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {l.user?.fullName || "—"}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800">
                          {isAr ? leaveTypeLabels[l.leaveType]?.ar : leaveTypeLabels[l.leaveType]?.en}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono" dir="ltr">
                        {new Date(l.startDate).toLocaleDateString("en-CA")}
                      </td>
                      <td className="py-2.5 px-4 font-mono" dir="ltr">
                        {new Date(l.endDate).toLocaleDateString("en-CA")}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{l.note || "—"}</td>
                      <td className="py-2.5 px-4">
                        {l.status === "APPROVED" && (
                          <span className="text-emerald-700 font-semibold">{isAr ? "معتمدة" : "Approved"}</span>
                        )}
                        {l.status === "CANCELLED" && (
                          <span className="text-red-500 font-semibold">{isAr ? "ملغاة" : "Cancelled"}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-end">
                        {l.status === "APPROVED" && (
                          <button
                            type="button"
                            onClick={() => handleCancelLeave(l.id)}
                            className="px-2 py-1 text-[11px] rounded border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400"
                          >
                            {isAr ? "إلغاء الإجازة" : "Cancel"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Record Leave */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
              {isAr ? "تسجيل إجازة موظف" : "Record Staff Leave"}
            </h2>

            <form onSubmit={handleRecordLeave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">{isAr ? "الموظف" : "Staff Member"}</label>
                <select
                  value={leaveStaffId}
                  onChange={(e) => setLeaveStaffId(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{isAr ? "نوع الإجازة" : "Leave Type"}</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveItem["leaveType"])}
                  className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="ANNUAL">إجازة اعتيادية سنوية (Annual)</option>
                  <option value="SICK">إجازة مرضية (Sick)</option>
                  <option value="UNPAID">إجازة بدون أجر (Unpaid)</option>
                  <option value="OTHER">أخرى / طارئة (Other)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold mb-1">{isAr ? "من تاريخ" : "From"}</label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{isAr ? "إلى تاريخ" : "To"}</label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{isAr ? "ملاحظات الإجازة" : "Notes"}</label>
                <textarea
                  rows={2}
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  placeholder="ملاحظات الموافقة أو سبب الإجازة..."
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-[#0E6251] text-white disabled:opacity-50"
                >
                  {saving ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "تسجيل الإجازة" : "Save Leave")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
