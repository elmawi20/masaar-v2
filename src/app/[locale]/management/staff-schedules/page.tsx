"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
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
  isWorking: boolean;
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

const weekdays = [
  { id: 0, ar: "السبت", en: "Saturday" },
  { id: 1, ar: "الأحد", en: "Sunday" },
  { id: 2, ar: "الإثنين", en: "Monday" },
  { id: 3, ar: "الثلاثاء", en: "Tuesday" },
  { id: 4, ar: "الأربعاء", en: "Wednesday" },
  { id: 5, ar: "الخميس", en: "Thursday" },
  { id: 6, ar: "الجمعة", en: "Friday" },
];

function StaffSchedulesContent() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const queryUserId = searchParams.get("userId");
  const { role: currentRole } = useRole();
  const isAr = locale === "ar";

  const [activeTab, setActiveTab] = useState<ScheduleTab>("SHIFTS");
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(queryUserId || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [dayConfigs, setDayConfigs] = useState<DayShiftConfig[]>(
    weekdays.map((w) => ({
      dayOfWeek: w.id,
      isWorking: w.id !== 6, // default working Sat-Thu, Friday off
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
          if (staff.length > 0) {
            if (queryUserId && staff.some((s) => s.id === queryUserId)) {
              setSelectedStaffId(queryUserId);
              setLeaveStaffId(queryUserId);
            } else if (!selectedStaffId) {
              setSelectedStaffId(staff[0].id);
              setLeaveStaffId(staff[0].id);
            }
          }
        }
      } catch {
        setError(isAr ? "فشل تحميل العاملين." : "Failed to load staff.");
      } finally {
        setLoading(false);
      }
    }
    loadStaff();
  }, [isAr, queryUserId, selectedStaffId]);

  // Load Schedules for Selected Staff
  const loadStaffSchedule = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
      const res = await getStaffScheduleAction({ userId });
      if (res.success && res.data) {
        const existingShifts = res.data;
        const newConfigs: DayShiftConfig[] = weekdays.map((w) => {
          const shifts = existingShifts.filter((s) => s.dayOfWeek === w.id);
          const shift1 = shifts.find((s) => s.shiftNumber === 1);
          const shift2 = shifts.find((s) => s.shiftNumber === 2);

          const hasAnyActiveShift = shifts.some((s) => s.isWorking);

          return {
            dayOfWeek: w.id,
            isWorking: existingShifts.length === 0 ? w.id !== 6 : hasAnyActiveShift,
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
  }, []);

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
            ? "مواعيد عمل الموظفين والإجازات مخصصة لمالك العيادة ومدير العيادة فقط."
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
      if (c.isWorking) {
        schedulesToSubmit.push({
          dayOfWeek: c.dayOfWeek,
          shiftNumber: 1,
          startTime: c.s1Start,
          endTime: c.s1End,
          isWorking: true,
        });

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
    }

    try {
      const res = await setStaffScheduleAction({
        userId: selectedStaffId,
        schedules: schedulesToSubmit,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل حفظ جدول المواعيد." : "Failed to save schedule."));
        return;
      }

      setSuccessMessage(isAr ? "تم حفظ مواعيد العمل الأسبوعية بنجاح." : "Weekly working schedule saved successfully.");
      await loadStaffSchedule(selectedStaffId);
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
          {isAr ? "مواعيد عمل الموظفين" : "Staff Working Schedules"}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {isAr
            ? "تحديد مواعيد ونوبات عمل الموظفين والأطباء أسبوعياً (بفواصل 15 دقيقة وبحد أقصى ورديتين يومياً) ومتابعة الإجازات"
            : "Configure staff weekly working shifts (15-min intervals, up to 2 shifts per day) and manage leave records."}
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center justify-between shadow-sm">
          <span className="font-medium">⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)} className="font-bold text-sm leading-none px-1">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between shadow-sm">
          <span className="font-medium">✓ {successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)} className="font-bold text-sm leading-none px-1">✕</button>
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
          {isAr ? "مواعيد العمل ونوبات الأسبوع" : "Weekly Working Schedules"}
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
            <div className="flex items-center gap-3">
              <label htmlFor="staffSelect" className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {isAr ? "اختر الطبيب / الموظف:" : "Select Staff / Clinician:"}
              </label>
              <select
                id="staffSelect"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr
                ? "يسمح النظام بما يصل إلى ورديتين في اليوم بفواصل 15 دقيقة مع منع التداخل [R-3-2]"
                : "Up to 2 non-overlapping shifts allowed per working day (15-min intervals) [R-3-2]"}
            </span>
          </div>

          {/* Shifts Form */}
          <form onSubmit={handleSaveShifts} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {dayConfigs.map((cfg) => {
                const day = weekdays.find((w) => w.id === cfg.dayOfWeek)!;

                return (
                  <div key={cfg.dayOfWeek} className="py-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 w-24">
                          {isAr ? day.ar : day.en}
                        </span>

                        {/* Master Day Toggle: Working or Off */}
                        <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={cfg.isWorking}
                            onChange={(e) => {
                              const updated = dayConfigs.map((c) =>
                                c.dayOfWeek === cfg.dayOfWeek ? { ...c, isWorking: e.target.checked } : c
                              );
                              setDayConfigs(updated);
                            }}
                            className="w-4 h-4 rounded text-[#0E6251] focus:ring-[#0E6251]"
                          />
                          <span className={`font-semibold ${cfg.isWorking ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"}`}>
                            {cfg.isWorking
                              ? (isAr ? "يوم عمل" : "Working Day")
                              : (isAr ? "عطلة أسبوعية" : "Day Off")}
                          </span>
                        </label>
                      </div>

                      {/* Optional Shift 2 Checkbox (only when day is working) */}
                      {cfg.isWorking && (
                        <div className="flex items-center gap-4 text-xs">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={cfg.hasShift2}
                              onChange={(e) => {
                                const updated = dayConfigs.map((c) =>
                                  c.dayOfWeek === cfg.dayOfWeek ? { ...c, hasShift2: e.target.checked } : c
                                );
                                setDayConfigs(updated);
                              }}
                              className="w-4 h-4 rounded text-[#0E6251] focus:ring-[#0E6251]"
                            />
                            <span>{isAr ? "+ وردية ثانية (مسائية)" : "+ Optional 2nd Shift"}</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Time Inputs */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-1 sm:ps-28" dir="ltr">
                      {cfg.isWorking ? (
                        <>
                          {/* Shift 1 */}
                          <div className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
                            <span className="font-semibold text-[11px] text-[#0E6251] dark:text-[#48C9B0]">
                              {isAr ? "الوردية 1:" : "Shift 1:"}
                            </span>
                            <input
                              type="time"
                              step="900"
                              value={cfg.s1Start}
                              onChange={(e) => {
                                const updated = dayConfigs.map((c) =>
                                  c.dayOfWeek === cfg.dayOfWeek ? { ...c, s1Start: e.target.value } : c
                                );
                                setDayConfigs(updated);
                              }}
                              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                            />
                            <span>-</span>
                            <input
                              type="time"
                              step="900"
                              value={cfg.s1End}
                              onChange={(e) => {
                                const updated = dayConfigs.map((c) =>
                                  c.dayOfWeek === cfg.dayOfWeek ? { ...c, s1End: e.target.value } : c
                                );
                                setDayConfigs(updated);
                              }}
                              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                            />
                          </div>

                          {/* Shift 2 */}
                          {cfg.hasShift2 && (
                            <div className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                              <span className="font-semibold text-[11px] text-amber-700 dark:text-amber-300">
                                {isAr ? "الوردية 2:" : "Shift 2:"}
                              </span>
                              <input
                                type="time"
                                step="900"
                                value={cfg.s2Start}
                                onChange={(e) => {
                                  const updated = dayConfigs.map((c) =>
                                    c.dayOfWeek === cfg.dayOfWeek ? { ...c, s2Start: e.target.value } : c
                                  );
                                  setDayConfigs(updated);
                                }}
                                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                              />
                              <span>-</span>
                              <input
                                type="time"
                                step="900"
                                value={cfg.s2End}
                                onChange={(e) => {
                                  const updated = dayConfigs.map((c) =>
                                    c.dayOfWeek === cfg.dayOfWeek ? { ...c, s2End: e.target.value } : c
                                  );
                                  setDayConfigs(updated);
                                }}
                                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic py-1">
                          {isAr ? "عطلة (لا توجد نوبات عمل مسجلة لهذا اليوم)" : "Day off (No shifts scheduled)"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={saving || loading}
                className="px-5 py-2 text-xs font-semibold rounded-md bg-[#0E6251] text-white hover:bg-[#117A65] shadow-sm disabled:opacity-50 transition-colors"
              >
                {saving
                  ? (isAr ? "جارٍ الحفظ..." : "Saving...")
                  : (isAr ? "حفظ مواعيد العمل" : "Save Working Schedule")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Leaves (R-3-3) */}
      {activeTab === "LEAVES" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {isAr ? "سجل إجازات العاملين" : "Staff Leaves Record"}
            </h2>

            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#0E6251] text-white hover:bg-[#117A65] shadow-sm transition-colors"
            >
              <span>+</span>
              <span>{isAr ? "تسجيل إجازة جديدة" : "Record Leave"}</span>
            </button>
          </div>

          {/* Leaves Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold text-start">{isAr ? "الموظف" : "Staff"}</th>
                    <th className="py-2.5 px-4 font-semibold text-start">{isAr ? "نوع الإجازة" : "Type"}</th>
                    <th className="py-2.5 px-4 font-semibold text-start">{isAr ? "من تاريخ" : "From"}</th>
                    <th className="py-2.5 px-4 font-semibold text-start">{isAr ? "إلى تاريخ" : "To"}</th>
                    <th className="py-2.5 px-4 font-semibold text-start">{isAr ? "الحالة" : "Status"}</th>
                    <th className="py-2.5 px-4 font-semibold text-start">{isAr ? "ملاحظات" : "Notes"}</th>
                    <th className="py-2.5 px-4 font-semibold text-end">{isAr ? "إجراء" : "Action"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {leaves.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        {isAr ? "لا توجد إجازات مسجلة." : "No leave records found."}
                      </td>
                    </tr>
                  ) : (
                    leaves.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                          {l.user?.fullName || "—"}
                          <span className="text-[10px] text-slate-400 block">{l.user?.role}</span>
                        </td>
                        <td className="py-3 px-4">
                          {isAr ? leaveTypeLabels[l.leaveType]?.ar : leaveTypeLabels[l.leaveType]?.en}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {new Date(l.startDate).toISOString().slice(0, 10)}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {new Date(l.endDate).toISOString().slice(0, 10)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              l.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : l.status === "CANCELLED"
                                ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-[160px] truncate">
                          {l.note || "—"}
                        </td>
                        <td className="py-3 px-4 text-end">
                          {l.status === "APPROVED" && (
                            <button
                              type="button"
                              onClick={() => handleCancelLeave(l.id)}
                              className="text-red-600 hover:text-red-800 text-[11px] underline"
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
        </div>
      )}

      {/* MODAL: Record Staff Leave */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
              {isAr ? "تسجيل إجازة لموظف" : "Record Staff Leave"}
            </h2>

            <form onSubmit={handleRecordLeave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "الموظف" : "Staff Member"}
                </label>
                <select
                  required
                  value={leaveStaffId}
                  onChange={(e) => setLeaveStaffId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "نوع الإجازة" : "Leave Type"}
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveItem["leaveType"])}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="ANNUAL">{isAr ? "سنوية اعتيادية" : "Annual Leave"}</option>
                  <option value="SICK">{isAr ? "مرضية" : "Sick Leave"}</option>
                  <option value="UNPAID">{isAr ? "بدون راتب" : "Unpaid Leave"}</option>
                  <option value="OTHER">{isAr ? "أخرى / طارئة" : "Other"}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "من تاريخ" : "From Date"}
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "إلى تاريخ" : "To Date"}
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "ملاحظات إضافية" : "Notes"}
                </label>
                <textarea
                  rows={2}
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  placeholder={isAr ? "سبب الإجازة إن وجد..." : "Optional reason..."}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-[#0E6251] text-white hover:bg-[#117A65] disabled:opacity-50"
                >
                  {saving ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "اعتماد الإجازة" : "Approve Leave")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaffSchedulesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading...</div>}>
      <StaffSchedulesContent />
    </Suspense>
  );
}
