"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getCalendarDayViewAction,
  getCalendarWeekViewAction,
  getClinicianDayListAction,
  getCalendarMetadataAction,
  bookAppointmentAction,
  rescheduleAppointmentAction,
  changeAppointmentStatusAction,
  previewRecurringSeriesAction,
  bookRecurringSeriesAction,
} from "@/server/actions/scheduling";
import { searchPatientsAction } from "@/server/actions/patients";
import { AppointmentStatus } from "@prisma/client";

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<"day" | "week" | "phone">("day");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Filters
  const [selectedClinicianId, setSelectedClinicianId] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedSessionTypeId, setSelectedSessionTypeId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Metadata
  const [clinicians, setClinicians] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [sessionTypes, setSessionTypes] = useState<any[]>([]);

  // Calendar Day View Data
  const [dayData, setDayData] = useState<any>(null);
  // Calendar Week View Data
  const [weekData, setWeekData] = useState<any>(null);
  // Clinician Phone Day List Data
  const [phoneData, setPhoneData] = useState<any>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Panels & Modals
  const [showWaitlist, setShowWaitlist] = useState<boolean>(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [statusReason, setStatusReason] = useState<string>("PATIENT_REQUEST");
  const [statusNotes, setStatusNotes] = useState<string>("");
  const [targetStatus, setTargetStatus] = useState<AppointmentStatus | null>(null);

  // New Booking Modal
  const [showBookModal, setShowBookModal] = useState<boolean>(false);
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState<string>("");
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  const [bookForm, setBookForm] = useState({
    clinicianId: "",
    roomId: "",
    bedId: "",
    sessionTypeId: "",
    appointmentDate: selectedDate,
    startTime: "10:00",
    durationMinutes: 45,
    daysOfWeek: [0, 2, 4], // Sat, Mon, Wed
    numberOfSessions: 6,
    notesForReception: "",
  });

  const [seriesPreview, setSeriesPreview] = useState<any | null>(null);

  // Load Metadata
  useEffect(() => {
    async function loadMeta() {
      const res = await getCalendarMetadataAction({});
      if (res.success && res.data) {
        setClinicians(res.data.clinicians);
        setRooms(res.data.rooms);
        setSessionTypes(res.data.sessionTypes);
        if (res.data.clinicians.length > 0 && !selectedClinicianId) {
          setSelectedClinicianId(res.data.clinicians[0].id);
        }
      }
    }
    loadMeta();
  }, []);

  // Fetch Calendar Data
  const loadCalendarData = async () => {
    setLoading(true);
    setError(null);

    if (viewMode === "day") {
      const res = await getCalendarDayViewAction({
        date: selectedDate,
        clinicianId: selectedClinicianId || undefined,
        roomId: selectedRoomId || undefined,
        sessionTypeId: selectedSessionTypeId || undefined,
      });
      if (res.success) {
        setDayData(res.data);
      } else {
        setError(res.error?.message || "فشل تحميل بيانات التقويم اليومي");
      }
    } else if (viewMode === "week") {
      if (selectedClinicianId) {
        const res = await getCalendarWeekViewAction({
          clinicianId: selectedClinicianId,
          startDate: selectedDate,
        });
        if (res.success) {
          setWeekData(res.data);
        } else {
          setError(res.error?.message || "فشل تحميل بيانات الأسبوع للمعالج");
        }
      }
    } else if (viewMode === "phone") {
      if (selectedClinicianId) {
        const res = await getClinicianDayListAction({
          clinicianId: selectedClinicianId,
          date: selectedDate,
        });
        if (res.success) {
          setPhoneData(res.data);
        } else {
          setError(res.error?.message || "فشل تحميل جدول المعالج للهاتف");
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCalendarData();
  }, [viewMode, selectedDate, selectedClinicianId, selectedRoomId, selectedSessionTypeId]);

  // Handle Date Navigation
  const handleShiftDate = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setUTCDate(cur.getUTCDate() + days);
    setSelectedDate(cur.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  // Patient Search in Booking Modal
  useEffect(() => {
    if (patientSearchTerm.trim().length >= 2) {
      searchPatientsAction({ query: patientSearchTerm }).then((res) => {
        if (res.success && res.data) {
          setPatientSearchResults(res.data);
        }
      });
    } else {
      setPatientSearchResults([]);
    }
  }, [patientSearchTerm]);

  // Handle Series Preview
  const handlePreviewSeries = async () => {
    setError(null);
    if (!selectedPatient || !bookForm.sessionTypeId || !bookForm.clinicianId || !bookForm.bedId) {
      setError("يرجى اختيار المريض ونوع الجلسة والمعالج والسرير أولاً");
      return;
    }
    const res = await previewRecurringSeriesAction({
      patientId: selectedPatient.id,
      sessionTypeId: bookForm.sessionTypeId,
      clinicianId: bookForm.clinicianId,
      roomId: bookForm.roomId,
      bedId: bookForm.bedId,
      startDate: bookForm.appointmentDate,
      daysOfWeek: bookForm.daysOfWeek,
      startTime: bookForm.startTime,
      durationMinutes: Number(bookForm.durationMinutes),
      numberOfSessions: Number(bookForm.numberOfSessions),
    });
    if (res.success) {
      setSeriesPreview(res.data);
    } else {
      setError(res.error?.message || "فشل فحص المواعيد المتكررة");
    }
  };

  // Submit Booking (Single or Series)
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedPatient) {
      setError("يرجى اختيار المريض");
      return;
    }

    startTransition(async () => {
      if (isRecurring) {
        const res = await bookRecurringSeriesAction({
          patientId: selectedPatient.id,
          sessionTypeId: bookForm.sessionTypeId,
          clinicianId: bookForm.clinicianId,
          roomId: bookForm.roomId,
          bedId: bookForm.bedId,
          startDate: bookForm.appointmentDate,
          daysOfWeek: bookForm.daysOfWeek,
          startTime: bookForm.startTime,
          durationMinutes: Number(bookForm.durationMinutes),
          numberOfSessions: Number(bookForm.numberOfSessions),
        });
        if (res.success) {
          const booked = (res.data as any)?.bookedAppointments ?? [];
          setSuccessMsg(`تم حجز السلسلة بنجاح (${booked.length} مواعيد مؤكدة)`);
          setShowBookModal(false);
          loadCalendarData();
        } else {
          setError(res.error?.message || "فشل حجز السلسلة المتكررة");
        }
      } else {
        const res = await bookAppointmentAction({
          patientId: selectedPatient.id,
          sessionTypeId: bookForm.sessionTypeId,
          clinicianId: bookForm.clinicianId,
          roomId: bookForm.roomId,
          bedId: bookForm.bedId,
          appointmentDate: bookForm.appointmentDate,
          startTime: bookForm.startTime,
          durationMinutes: Number(bookForm.durationMinutes),
          notesForReception: bookForm.notesForReception,
        });
        if (res.success) {
          setSuccessMsg("تم حجز الموعد بنجاح");
          setShowBookModal(false);
          loadCalendarData();
        } else {
          setError(res.error?.message || "فشل حجز الموعد");
        }
      }
    });
  };

  // Handle Status Change
  const handleExecuteStatusChange = async () => {
    if (!selectedAppointment || !targetStatus) return;
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await changeAppointmentStatusAction({
        appointmentId: selectedAppointment.id,
        newStatus: targetStatus,
        reason: statusReason,
        reasonNotes: statusNotes,
      });

      if (res.success) {
        setSuccessMsg("تم تغيير حالة الموعد بنجاح");
        setShowStatusModal(false);
        setSelectedAppointment(null);
        loadCalendarData();
      } else {
        setError(res.error?.message || "فشل تغيير حالة الموعد");
      }
    });
  };

  // Fast Check-In Shortcut
  const handleFastCheckIn = async (appt: any) => {
    startTransition(async () => {
      const res = await changeAppointmentStatusAction({
        appointmentId: appt.id,
        newStatus: AppointmentStatus.ARRIVED,
      });
      if (res.success) {
        setSuccessMsg(`تم تسجيل وصول المريض: ${appt.patient.fullName}`);
        loadCalendarData();
      } else {
        setError(res.error?.message || "فشل تسجيل الوصول");
      }
    });
  };

  // Drag & Drop / Move
  const handleDrop = async (e: React.DragEvent, targetBedId: string, targetTime: string) => {
    e.preventDefault();
    const apptId = e.dataTransfer.getData("text/plain");
    if (!apptId) return;

    startTransition(async () => {
      const res = await rescheduleAppointmentAction({
        appointmentId: apptId,
        newDate: selectedDate,
        newStartTime: targetTime,
        newBedId: targetBedId,
      });
      if (res.success) {
        setSuccessMsg("تم نقل الموعد بنجاح");
        loadCalendarData();
      } else {
        setError(res.error?.message || "تعذر نقل الموعد في هذا المكان والوقت");
      }
    });
  };

  // Render Time Slots (09:00 to 21:00 in 15-min intervals)
  const timeSlots: string[] = [];
  const openHour = 9;
  const closeHour = 21;
  for (let h = openHour; h < closeHour; h++) {
    for (const m of ["00", "15", "30", "45"]) {
      timeSlots.push(`${h.toString().padStart(2, "0")}:${m}`);
    }
  }

  // All active beds across rooms for Day View
  const allBeds = dayData?.rooms
    ? dayData.rooms.flatMap((r: any) =>
        r.beds.map((b: any) => ({
          ...b,
          roomName: r.nameAr,
          isSingleBed: r.isSingleBed,
        }))
      )
    : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl">📅</span>
            جدول المواعيد والتقويم الشامل
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            إدارة الحجوزات، الأسرّة، التقويم اليومي والأسبوعي (الوحدة 3.4)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("day")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === "day"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              عرض اليوم (أسرّة)
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === "week"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              عرض الأسبوع
            </button>
            <button
              onClick={() => setViewMode("phone")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === "phone"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              قائمة الهاتف
            </button>
          </div>

          {/* Waitlist Toggle */}
          <button
            onClick={() => setShowWaitlist(!showWaitlist)}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
              showWaitlist
                ? "bg-amber-500 text-white border-amber-600"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            }`}
          >
            <span>⏳</span>
            قائمة الانتظار ({dayData?.waitlist?.length ?? 0})
          </button>

          {/* Book Appointment Button */}
          <button
            onClick={() => {
              setBookForm({
                ...bookForm,
                appointmentDate: selectedDate,
                clinicianId: clinicians[0]?.id || "",
                roomId: rooms[0]?.id || "",
                bedId: rooms[0]?.beds[0]?.id || "",
                sessionTypeId: sessionTypes[0]?.id || "",
              });
              setShowBookModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <span>+</span>
            حجز موعد جديد
          </button>
        </div>
      </div>

      {/* Date Navigation Bar & Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleShiftDate(-1)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-bold"
            >
              ◀ السابق
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg text-sm font-bold"
            >
              اليوم
            </button>
            <button
              onClick={() => handleShiftDate(1)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-bold"
            >
              التالي ▶
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm font-medium"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Clinician Filter */}
            <select
              value={selectedClinicianId}
              onChange={(e) => setSelectedClinicianId(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs font-medium"
            >
              <option value="">جميع المعالجين</option>
              {clinicians.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.role === "PHYSIOTHERAPIST" ? "علاج طبيعي" : c.role === "NUTRITIONIST" ? "تغذية" : "إدارة/طبيب"})
                </option>
              ))}
            </select>

            {/* Room Filter */}
            {viewMode === "day" && (
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs font-medium"
              >
                <option value="">جميع الغرف</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nameAr}
                  </option>
                ))}
              </select>
            )}

            {/* Session Type Filter */}
            <select
              value={selectedSessionTypeId}
              onChange={(e) => setSelectedSessionTypeId(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs font-medium"
            >
              <option value="">جميع أنواع الجلسات</option>
              {sessionTypes.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.nameAr}
                </option>
              ))}
            </select>

            {/* Patient Search */}
            <input
              type="text"
              placeholder="بحث باسم أو هاتف المريض..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs w-48"
            />
          </div>
        </div>

        {/* Alerts / Messages */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold">
            ⚠️ {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold">
            ✅ {successMsg}
          </div>
        )}
      </div>

      {/* Main Grid View Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Main Grid (Columns 1-3 or 4) */}
        <div className={`${showWaitlist ? "lg:col-span-3" : "lg:col-span-4"}`}>
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-bold bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              جاري تحميل جدول المواعيد...
            </div>
          ) : viewMode === "day" ? (
            /* Day View (Columns = Beds, Rows = 15-min slots) */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
              {allBeds.length === 0 ? (
                <div className="p-8 text-center text-slate-400">لا توجد أسرّة متاحة في هذا اليوم أو بهذه التصفية</div>
              ) : (
                <div className="min-w-200">
                  {/* Grid Header (Beds) */}
                  <div className="grid border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-slate-50 dark:bg-slate-850 z-10"
                    style={{ gridTemplateColumns: `80px repeat(${allBeds.length}, minmax(180px, 1fr))` }}
                  >
                    <div className="p-3 font-bold text-xs text-slate-500 border-l border-slate-200 dark:border-slate-800 text-center">
                      الوقت
                    </div>
                    {allBeds.map((bed: any) => (
                      <div
                        key={bed.id}
                        className="p-3 font-bold text-xs text-slate-900 dark:text-white border-l border-slate-200 dark:border-slate-800 text-center"
                      >
                        {/* R-5.4-1: 1-bed rooms show room name only */}
                        {bed.isSingleBed ? (
                          <span className="text-blue-600 dark:text-blue-400">{bed.roomName}</span>
                        ) : (
                          <div>
                            <div className="text-[11px] text-slate-400">{bed.roomName}</div>
                            <div>{bed.name}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Grid Rows (15-min slots) */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {timeSlots.map((time) => (
                      <div
                        key={time}
                        className="grid hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                        style={{ gridTemplateColumns: `80px repeat(${allBeds.length}, minmax(180px, 1fr))` }}
                      >
                        {/* Time Column */}
                        <div className="p-2 text-[11px] font-mono text-slate-400 border-l border-slate-200 dark:border-slate-800 text-center select-none">
                          {time}
                        </div>

                        {/* Bed Slot Columns */}
                        {allBeds.map((bed: any) => {
                          const matchingAppts = (dayData?.appointments ?? []).filter(
                            (a: any) =>
                              a.bedId === bed.id &&
                              a.startTime <= time &&
                              a.endTime > time &&
                              (!searchQuery ||
                                a.patient.fullName.includes(searchQuery) ||
                                a.patient.mobilePhone?.includes(searchQuery))
                          );

                          return (
                            <div
                              key={bed.id}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleDrop(e, bed.id, time)}
                              className="p-1 min-h-11 border-l border-slate-200 dark:border-slate-800 relative group transition-colors"
                            >
                              {matchingAppts.map((appt: any) => {
                                // Only render card once at slot start
                                if (appt.startTime !== time) return null;

                                const isLead = appt.patient.status === "LEAD";
                                const isArrived = appt.status === "ARRIVED";
                                const isCompleted = appt.status === "COMPLETED";

                                return (
                                  <div
                                    key={appt.id}
                                    draggable={appt.status === "SCHEDULED" || appt.status === "ARRIVED"}
                                    onDragStart={(e) => e.dataTransfer.setData("text/plain", appt.id)}
                                    onClick={() => setSelectedAppointment(appt)}
                                    className={`p-2 rounded-xl text-xs cursor-pointer shadow-sm border transition-all ${
                                      isArrived
                                        ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200"
                                        : isCompleted
                                        ? "bg-purple-50 dark:bg-purple-950/70 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200"
                                        : "bg-blue-50 dark:bg-blue-950/70 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-bold truncate">{appt.patient.fullName}</span>
                                      <span
                                        className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${
                                          isArrived
                                            ? "bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100"
                                            : isCompleted
                                            ? "bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-100"
                                            : "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100"
                                        }`}
                                      >
                                        {appt.status === "SCHEDULED"
                                          ? "مجدول"
                                          : appt.status === "ARRIVED"
                                          ? "حضر"
                                          : appt.status === "COMPLETED"
                                          ? "مكتمل"
                                          : appt.status}
                                      </span>
                                    </div>

                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                                      <span>{appt.startTime} - {appt.endTime}</span>
                                      <span>{appt.clinician.fullName}</span>
                                    </div>

                                    {/* Medical alerts indicator */}
                                    {(appt.patient.hasDiabetes ||
                                      appt.patient.hasPacemaker ||
                                      appt.patient.hasHypertension ||
                                      appt.patient.hasOsteoporosis ||
                                      appt.patient.hasFallRisk ||
                                      appt.patient.isPregnant) && (
                                      <div className="mt-1 text-[10px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                                        <span>⚠️</span> تنبيه طبي
                                      </div>
                                    )}

                                    {/* Fast Check-In Action Button */}
                                    {appt.status === "SCHEDULED" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleFastCheckIn(appt);
                                        }}
                                        className="mt-1.5 w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-xs transition-all"
                                      >
                                        تسجيل وصول
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : viewMode === "week" ? (
            /* Week View per Clinician */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">
                جدول مواعيد الأسبوع للمعالج: {weekData?.clinician?.fullName ?? "—"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {(weekData?.days ?? []).map((day: any) => (
                  <div
                    key={day.date}
                    className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2"
                  >
                    <div className="font-bold text-xs text-slate-700 dark:text-slate-300 border-b pb-1">
                      {day.date}
                    </div>
                    {day.appointments.length === 0 ? (
                      <div className="text-[11px] text-slate-400 text-center py-4">لا توجد مواعيد</div>
                    ) : (
                      day.appointments.map((a: any) => (
                        <div
                          key={a.id}
                          onClick={() => setSelectedAppointment(a)}
                          className="p-2 bg-white dark:bg-slate-700 rounded-lg text-xs shadow-xs border border-slate-200 dark:border-slate-600 cursor-pointer"
                        >
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {a.patient.fullName}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {a.startTime} ({a.sessionType.nameAr})
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Phone List View (R-0-13) */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 max-w-lg mx-auto">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center justify-between">
                <span>📱 جدول مواعيد اليوم للمعالج</span>
                <span className="text-xs text-blue-600">{phoneData?.appointments?.length ?? 0} مواعيد</span>
              </h2>
              <div className="space-y-3">
                {(phoneData?.appointments ?? []).length === 0 ? (
                  <div className="p-8 text-center text-slate-400">لا توجد مواعيد مسجلة اليوم</div>
                ) : (
                  phoneData.appointments.map((a: any) => (
                    <div
                      key={a.id}
                      onClick={() => setSelectedAppointment(a)}
                      className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-400 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {a.patient.fullName}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-bold">
                          {a.startTime} - {a.endTime}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>{a.sessionType.nameAr}</span>
                        <span>{a.room.nameAr} ({a.bed.name})</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Waitlist Side Panel (R-5.4-5) */}
        {showWaitlist && (
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>⏳</span> قائمة الانتظار
              </h3>
              <button
                onClick={() => setShowWaitlist(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕ إغلاق
              </button>
            </div>

            <div className="space-y-3 max-h-150 overflow-y-auto">
              {(dayData?.waitlist ?? []).length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  لا يوجد مرضى في قائمة الانتظار اليوم
                </div>
              ) : (
                dayData.waitlist.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2"
                  >
                    <div className="font-bold text-xs text-amber-900 dark:text-amber-200">
                      {item.patient.fullName}
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-300">
                      {item.sessionType.nameAr}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedAppointment(item);
                        setTargetStatus(AppointmentStatus.SCHEDULED);
                        setShowStatusModal(true);
                      }}
                      className="w-full py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold transition-all"
                    >
                      تسكين في موعد مؤكد
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Appointment Action Modal */}
      {selectedAppointment && !showStatusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                تفاصيل وإجراءات الموعد
              </h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <p>
                <strong>المريض:</strong> {selectedAppointment.patient?.fullName}
              </p>
              <p>
                <strong>الهاتف:</strong> {selectedAppointment.patient?.mobilePhone || "—"}
              </p>
              <p>
                <strong>المعالج:</strong> {selectedAppointment.clinician?.fullName}
              </p>
              <p>
                <strong>الوقت:</strong> {selectedAppointment.startTime} - {selectedAppointment.endTime}
              </p>
              <p>
                <strong>الحالة الحالية:</strong> {selectedAppointment.status}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {selectedAppointment.status === "SCHEDULED" && (
                <>
                  <button
                    onClick={() => handleFastCheckIn(selectedAppointment)}
                    className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs"
                  >
                    تسجيل وصول (حضر)
                  </button>
                  <button
                    onClick={() => {
                      setTargetStatus(AppointmentStatus.WAITLISTED);
                      setShowStatusModal(true);
                    }}
                    className="py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs"
                  >
                    نقل لقائمة الانتظار
                  </button>
                  <button
                    onClick={() => {
                      setTargetStatus(AppointmentStatus.NO_SHOW);
                      setShowStatusModal(true);
                    }}
                    className="py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-bold text-xs"
                  >
                    تسجيل عدم حضور
                  </button>
                  <button
                    onClick={() => {
                      setTargetStatus(AppointmentStatus.CANCELLED);
                      setShowStatusModal(true);
                    }}
                    className="py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs"
                  >
                    إلغاء الموعد
                  </button>
                </>
              )}

              {selectedAppointment.status === "ARRIVED" && (
                <>
                  <button
                    onClick={() => {
                      setTargetStatus(AppointmentStatus.SCHEDULED);
                      setShowStatusModal(true);
                    }}
                    className="py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs"
                  >
                    تراجع عن تسجيل الوصول
                  </button>
                  <button
                    onClick={() => {
                      setTargetStatus(AppointmentStatus.CANCELLED);
                      setShowStatusModal(true);
                    }}
                    className="py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs"
                  >
                    إلغاء (مغادرة المريض)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Reason Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              تأكيد تغيير الحالة إلى ({targetStatus})
            </h3>
            <p className="text-xs text-slate-500">
              يرجى تحديد السبب الإلزامي للتغيير في سجلات النظام
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  السبب الأساسي
                </label>
                <select
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full p-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800"
                >
                  <option value="PATIENT_REQUEST">طلب المريض</option>
                  <option value="ILLNESS">مرض أو ظرف صحي</option>
                  <option value="TRANSPORT">مواصلات / تأخير</option>
                  <option value="EMERGENCY">حالة طارئة</option>
                  <option value="NO_CONTACT">تعذر التواصل</option>
                  <option value="CLINIC_INITIATED">من قِبل العيادة</option>
                  <option value="OTHER">سبب آخر</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات توضيحية
                </label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="اكتب توضيحاً إضافياً..."
                  className="w-full p-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                disabled={isPending}
                onClick={handleExecuteStatusChange}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                {isPending ? "جاري الحفظ..." : "تأكيد الحفظ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Booking Modal (Single / Recurring Series) */}
      {showBookModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-xl w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                حجز موعد {isRecurring ? "سلسلة متكررة" : "فردي"}
              </h3>
              <button onClick={() => setShowBookModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {/* Toggle Single vs Recurring */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setIsRecurring(false)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  !isRecurring ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500"
                }`}
              >
                موعد فردي واحد
              </button>
              <button
                type="button"
                onClick={() => setIsRecurring(true)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  isRecurring ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500"
                }`}
              >
                سلسلة متكررة (باقة/مواعيد متعددة)
              </button>
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              {/* Patient Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المريض *
                </label>
                {selectedPatient ? (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-blue-900 dark:text-blue-200">
                        {selectedPatient.fullName}
                      </div>
                      <div className="text-[11px] text-blue-700 dark:text-blue-400">
                        {selectedPatient.mobilePhone}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(null)}
                      className="text-xs text-red-600 hover:underline font-bold"
                    >
                      تغيير
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="ابحث بالاسم أو رقم الهاتف..."
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                      className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800"
                    />
                    {patientSearchResults.length > 0 && (
                      <div className="mt-1 border rounded-xl bg-white dark:bg-slate-800 max-h-36 overflow-y-auto divide-y text-xs">
                        {patientSearchResults.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientSearchTerm("");
                            }}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex justify-between"
                          >
                            <span className="font-bold">{p.fullName}</span>
                            <span className="text-slate-500">{p.mobilePhone}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Session Type & Clinician */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نوع الجلسة *
                  </label>
                  <select
                    value={bookForm.sessionTypeId}
                    onChange={(e) => setBookForm({ ...bookForm, sessionTypeId: e.target.value })}
                    className="w-full p-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800"
                    required
                  >
                    <option value="">اختر نوع الجلسة</option>
                    {sessionTypes.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.nameAr} ({st.defaultDurationMinutes} دقيقة)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المعالج *
                  </label>
                  <select
                    value={bookForm.clinicianId}
                    onChange={(e) => setBookForm({ ...bookForm, clinicianId: e.target.value })}
                    className="w-full p-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800"
                    required
                  >
                    <option value="">اختر المعالج</option>
                    {clinicians.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Room & Bed */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الغرفة *
                  </label>
                  <select
                    value={bookForm.roomId}
                    onChange={(e) => {
                      const rId = e.target.value;
                      const r = rooms.find((x) => x.id === rId);
                      setBookForm({
                        ...bookForm,
                        roomId: rId,
                        bedId: r?.beds[0]?.id || "",
                      });
                    }}
                    className="w-full p-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800"
                    required
                  >
                    <option value="">اختر الغرفة</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    السرير *
                  </label>
                  <select
                    value={bookForm.bedId}
                    onChange={(e) => setBookForm({ ...bookForm, bedId: e.target.value })}
                    className="w-full p-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800"
                    required
                  >
                    <option value="">اختر السرير</option>
                    {rooms
                      .find((r) => r.id === bookForm.roomId)
                      ?.beds.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Date, Time, Duration */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRecurring ? "تاريخ البداية *" : "التاريخ *"}
                  </label>
                  <input
                    type="date"
                    value={bookForm.appointmentDate}
                    onChange={(e) => setBookForm({ ...bookForm, appointmentDate: e.target.value })}
                    className="w-full p-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الوقت *
                  </label>
                  <input
                    type="text"
                    value={bookForm.startTime}
                    onChange={(e) => setBookForm({ ...bookForm, startTime: e.target.value })}
                    className="w-full p-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المدة (دقيقة)
                  </label>
                  <select
                    value={bookForm.durationMinutes}
                    onChange={(e) => setBookForm({ ...bookForm, durationMinutes: Number(e.target.value) })}
                    className="w-full p-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800"
                  >
                    <option value={15}>15 دقيقة</option>
                    <option value={30}>30 دقيقة</option>
                    <option value={45}>45 دقيقة</option>
                    <option value={60}>60 دقيقة</option>
                    <option value={90}>90 دقيقة</option>
                  </select>
                </div>
              </div>

              {/* Recurring Series Fields */}
              {isRecurring && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">أيام الأسبوع للسلسلة:</span>
                    <div className="flex gap-1">
                      {[
                        { label: "سبت", day: 0 },
                        { label: "أحد", day: 1 },
                        { label: "اثنين", day: 2 },
                        { label: "ثلاثاء", day: 3 },
                        { label: "أربعاء", day: 4 },
                        { label: "خميس", day: 5 },
                      ].map((d) => {
                        const active = bookForm.daysOfWeek.includes(d.day);
                        return (
                          <button
                            type="button"
                            key={d.day}
                            onClick={() => {
                              const updated = active
                                ? bookForm.daysOfWeek.filter((x) => x !== d.day)
                                : [...bookForm.daysOfWeek, d.day];
                              setBookForm({ ...bookForm, daysOfWeek: updated });
                            }}
                            className={`px-2 py-1 text-[11px] font-bold rounded-lg ${
                              active ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600"
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      عدد الجلسات المطلوبة
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={36}
                      value={bookForm.numberOfSessions}
                      onChange={(e) => setBookForm({ ...bookForm, numberOfSessions: Number(e.target.value) })}
                      className="w-24 p-2 border rounded-xl text-xs bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handlePreviewSeries}
                    className="w-full py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-900 dark:text-white rounded-xl text-xs font-bold transition-all"
                  >
                    🔍 معاينة التواريخ المتاحة والمحجوزة
                  </button>

                  {/* Preview Results (R-5.3-1) */}
                  {seriesPreview && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto border-t pt-2">
                      <div className="text-xs font-bold text-blue-600">
                        المواعيد المتاحة: {seriesPreview.availableCount} من {seriesPreview.dates.length}
                      </div>
                      {seriesPreview.dates.map((d: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-1.5 rounded-lg text-[11px] flex items-center justify-between ${
                            d.isValid
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
                              : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200"
                          }`}
                        >
                          <span>{d.date} ({d.startTime})</span>
                          <span>{d.isValid ? "✅ متاح" : `❌ ${d.reasonIfInvalid}`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {isPending ? "جاري الحجز..." : isRecurring ? "تأكيد حجز السلسلة" : "تأكيد حجز الموعد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
