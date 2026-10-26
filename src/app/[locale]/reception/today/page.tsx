"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getTodayDashboardAction,
  getTomorrowRemindersAction,
  markReminderSentAction,
  generateWhatsAppLinkAction,
  getInAppNotificationsAction,
  markNotificationReadAction,
} from "@/server/actions/frontDesk";
import {
  changeAppointmentStatusAction,
  rescheduleAppointmentAction,
} from "@/server/actions/scheduling";
import {
  recordPaymentAction,
  getChargeBillingDetailsAction,
} from "@/server/actions/billing";
import { AppointmentStatus, PaymentMethod } from "@prisma/client";
import PrintableReceiptModal, { type ReceiptData } from "@/components/billing/PrintableReceiptModal";

export default function TodayPage() {
  const [activeTab, setActiveTab] = useState<"today" | "tomorrow" | "packages">("today");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Data states
  const [todayData, setTodayData] = useState<any>(null);
  const [tomorrowData, setTomorrowData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Selected appointment for Action Panel (R-6-2)
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [statusReason, setStatusReason] = useState<string>("PATIENT_REQUEST");
  const [statusNotes, setStatusNotes] = useState<string>("");
  const [targetStatus, setTargetStatus] = useState<AppointmentStatus | null>(null);

  // WhatsApp Dialog (R-6-4)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [waTemplateKey, setWaTemplateKey] = useState<
    "WELCOME" | "REMINDER" | "RESCHEDULE" | "LOW_SESSIONS" | "BALANCE_DUE" | "EXPIRING_SOON"
  >("REMINDER");
  const [waPreview, setWaPreview] = useState<any | null>(null);
  const [waCustomText, setWaCustomText] = useState<string>("");

  // Payment & Receipts (Spec §8)
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentTargetCharge, setPaymentTargetCharge] = useState<any | null>(null);
  const [paymentChargeDetails, setPaymentChargeDetails] = useState<any | null>(null);
  const [paymentAmountEgp, setPaymentAmountEgp] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [paymentRefNumber, setPaymentRefNumber] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [processingPayment, setProcessingPayment] = useState<boolean>(false);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  // Load Dashboard Data
  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    const [todayRes, remindersRes, notifsRes] = await Promise.all([
      getTodayDashboardAction({ date: selectedDate }),
      getTomorrowRemindersAction({}),
      getInAppNotificationsAction({ limit: 10 }),
    ]);

    if (todayRes.success) {
      setTodayData(todayRes.data);
    } else {
      setError(todayRes.error?.message || "فشل تحميل بيانات لوحة اليوم");
    }

    if (remindersRes.success) {
      setTomorrowData(remindersRes.data);
    }

    if (notifsRes.success && notifsRes.data) {
      setNotifications(notifsRes.data.notifications);
      setUnreadCount(notifsRes.data.unreadCount);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, [selectedDate]);

  // Polling for in-app notifications every 30 seconds (R-14-6)
  useEffect(() => {
    const interval = setInterval(() => {
      getInAppNotificationsAction({ limit: 10 }).then((res) => {
        if (res.success && res.data) {
          setNotifications(res.data.notifications);
          setUnreadCount(res.data.unreadCount);
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Fast Check-In
  const handleCheckIn = async (appt: any) => {
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await changeAppointmentStatusAction({
        appointmentId: appt.id,
        newStatus: AppointmentStatus.ARRIVED,
      });
      if (res.success) {
        setSuccessMsg(`تم تسجيل حضور المريض: ${appt.patient.fullName}`);
        loadDashboard();
      } else {
        setError(res.error?.message || "فشل تسجيل الوصول");
      }
    });
  };

  // Execute Status Transition
  const handleConfirmStatus = async () => {
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
        setSuccessMsg("تم تحديث حالة الموعد بنجاح");
        setShowStatusModal(false);
        setSelectedAppointment(null);
        loadDashboard();
      } else {
        setError(res.error?.message || "فشل تحديث الحالة");
      }
    });
  };

  // Generate WhatsApp Message
  const handleOpenWhatsAppDialog = async (appt: any, initialTemplate = "REMINDER") => {
    setSelectedAppointment(appt);
    setWaTemplateKey(initialTemplate as any);
    setError(null);

    const res = await generateWhatsAppLinkAction({
      patientId: appt.patient.id,
      templateKey: initialTemplate as any,
      customVariables: {
        appointmentDate: appt.appointmentDate?.slice ? appt.appointmentDate.slice(0, 10) : selectedDate,
        appointmentTime: appt.startTime,
        clinicianName: appt.clinician?.fullName || "",
      },
    });

    if (res.success) {
      setWaPreview(res.data);
      setWaCustomText(res.data.text || "");
      setShowWhatsAppModal(true);
    } else {
      setError(res.error?.message || "فشل إعداد رسالة واتساب");
    }
  };

  // Re-generate message when template dropdown changes
  const handleTemplateChange = async (template: any) => {
    setWaTemplateKey(template);
    if (!selectedAppointment) return;

    const res = await generateWhatsAppLinkAction({
      patientId: selectedAppointment.patient.id,
      templateKey: template,
      customVariables: {
        appointmentDate: selectedAppointment.appointmentDate?.slice
          ? selectedAppointment.appointmentDate.slice(0, 10)
          : selectedDate,
        appointmentTime: selectedAppointment.startTime,
        clinicianName: selectedAppointment.clinician?.fullName || "",
      },
    });

    if (res.success && res.data) {
      setWaPreview(res.data);
      setWaCustomText(res.data.text || "");
    }
  };

  // Mark Reminder Sent
  const handleMarkReminderSent = async (appt: any) => {
    const phone = appt.patient.guardianPhone || appt.patient.whatsappPhone || appt.patient.mobilePhone || "";
    startTransition(async () => {
      const res = await markReminderSentAction({
        appointmentId: appt.id,
        recipientPhone: phone,
        templateKey: "REMINDER",
      });

      if (res.success) {
        setSuccessMsg(`تم توثيق إرسال التذكير للمريض: ${appt.patient.fullName}`);
        loadDashboard();
      }
    });
  };

  // Mark In-App Notification Read
  const handleDismissNotif = async (notifId: string) => {
    await markNotificationReadAction({ notificationId: notifId });
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  // Payment Operations (Spec §8)
  const handleOpenPaymentModal = async (appt: any) => {
    setError(null);
    const charge = appt.charges?.[0];
    if (!charge) {
      setError("لا توجد مطالبة مالية مسجلة لهذا الموعد");
      return;
    }

    setPaymentTargetCharge({
      ...charge,
      patient: appt.patient,
    });
    setShowPaymentModal(true);
    setProcessingPayment(true);

    try {
      const detailsRes = await getChargeBillingDetailsAction({ chargeId: charge.id });
      if (detailsRes.success && detailsRes.data) {
        setPaymentChargeDetails(detailsRes.data);
        setPaymentAmountEgp((detailsRes.data.balancePiasters / 100).toFixed(2));
      }
    } catch {
      // fallback
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetCharge) return;

    setProcessingPayment(true);
    setError(null);

    try {
      const amountPiasters = Math.round((parseFloat(paymentAmountEgp) || 0) * 100);
      const res = await recordPaymentAction({
        chargeId: paymentTargetCharge.id,
        amountPiasters,
        paymentMethod,
        referenceNumber: paymentRefNumber || undefined,
        notes: paymentNotes || undefined,
      });

      if (res.success && res.data) {
        const paymentData = res.data as any;
        setSuccessMsg(`تم تحصيل المبلغ بنجاح وإصدار الإيصال رقم ${paymentData.receiptNumber}`);
        setShowPaymentModal(false);
        setActiveReceipt({
          receiptNumber: paymentData.receiptNumber,
          receiptYear: paymentData.receiptYear,
          receiptSequence: paymentData.receiptSequence,
          amountPiasters: paymentData.amountPiasters,
          paymentMethod: paymentData.paymentMethod,
          collectedAt: paymentData.collectedAt,
          patientName: paymentTargetCharge.patient?.fullName || "مريض",
          patientPhone: paymentTargetCharge.patient?.mobilePhone,
          description: paymentChargeDetails?.charge?.description || "جلسة علاج طبيعي",
          collectedByName: paymentData.collectedByUser?.fullName,
          referenceNumber: paymentRefNumber,
        });
        loadDashboard();
      } else if (!res.success) {
        setError(res.error?.message || "فشل تسجيل الدفعة");
      }
    } catch {
      setError("حدث خطأ غير متوقع أثناء تسجيل الدفعة");
    } finally {
      setProcessingPayment(false);
    }
  };

  const counts = todayData?.counts ?? {
    scheduled: 0,
    arrived: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    totalToday: 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl">🛎️</span>
            لوحة الاستقبال — اليوم في العيادة
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            تسجيل الحضور السريع، إدارة المواعيد اليومية، تذكيرات الغد وإشعارات النظام (الوحدة 3.5)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Notification Indicator */}
          <div className="relative">
            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>🔔</span>
              <span>الإشعارات</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-mono animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs font-bold"
          />
        </div>
      </div>

      {/* Notifications Banner (if unread exist) */}
      {notifications.filter((n) => !n.isRead).length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 p-4 rounded-2xl space-y-2">
          <div className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center justify-between">
            <span>🔔 تنبيهات العيادة المباشرة (تحديث تلقائي كل 30 ثانية)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {notifications
              .filter((n) => !n.isRead)
              .slice(0, 3)
              .map((n) => (
                <div
                  key={n.id}
                  className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-900 text-xs shadow-xs flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-blue-900 dark:text-blue-200">{n.titleAr}</div>
                    <div className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                      {n.bodyAr}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDismissNotif(n.id)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Alerts / Error Messages */}
      {error && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold">
          ⚠️ {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold">
          ✅ {successMsg}
        </div>
      )}

      {/* Today KPI Counters (R-6-1) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {counts.totalToday}
          </div>
          <div className="text-xs font-bold text-slate-500 mt-1">إجمالي اليوم</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900 shadow-sm text-center">
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {counts.scheduled}
          </div>
          <div className="text-xs font-bold text-blue-700 dark:text-blue-300 mt-1">مجدول</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-900 shadow-sm text-center">
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {counts.arrived}
          </div>
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-1">حضر (بالاستقبال)</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-900 shadow-sm text-center">
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
            {counts.completed}
          </div>
          <div className="text-xs font-bold text-purple-700 dark:text-purple-300 mt-1">مكتمل</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <div className="text-2xl font-black text-slate-500 font-mono">
            {counts.noShow}
          </div>
          <div className="text-xs font-bold text-slate-500 mt-1">لم يحضر</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900 shadow-sm text-center">
          <div className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">
            {counts.cancelled}
          </div>
          <div className="text-xs font-bold text-red-700 dark:text-red-300 mt-1">ملغي</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab("today")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "today"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          القادمون اليوم وقائمة الانتظار
        </button>

        <button
          onClick={() => setActiveTab("tomorrow")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "tomorrow"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          تذكيرات الغد ({tomorrowData?.appointments?.length ?? 0})
        </button>

        <button
          onClick={() => setActiveTab("packages")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "packages"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          تنبيهات الباقات (
          {(todayData?.expiringPackages?.length ?? 0) + (todayData?.lowSessionPackages?.length ?? 0)}
          )
        </button>
      </div>

      {/* TAB 1: TODAY (Arriving Next, Waitlist, Unpaid) */}
      {activeTab === "today" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Arriving Next (Queue) */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>🚶 القادمون تالياً اليوم</span>
              <span className="text-xs text-slate-500">
                {todayData?.arrivingNext?.length ?? 0} موعد قادم
              </span>
            </h2>

            {loading ? (
              <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                جاري التحميل...
              </div>
            ) : (todayData?.arrivingNext ?? []).length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                لا توجد مواعيد مجدولة متبقية لليوم
              </div>
            ) : (
              <div className="space-y-3">
                {todayData.arrivingNext.map((appt: any) => {
                  const hasAlerts =
                    appt.patient.hasDiabetes ||
                    appt.patient.hasPacemaker ||
                    appt.patient.hasHypertension ||
                    appt.patient.hasOsteoporosis ||
                    appt.patient.hasFallRisk ||
                    appt.patient.isPregnant;

                  return (
                    <div
                      key={appt.id}
                      className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {appt.patient.fullName}
                          </span>
                          {hasAlerts && (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded text-[10px] font-bold">
                              ⚠️ تنبيه طبي
                            </span>
                          )}
                          {appt.patient.isDependent && (
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded text-[10px] font-bold">
                              تابع (ولي أمر)
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                          <span>⏱️ {appt.startTime} - {appt.endTime}</span>
                          <span>👨‍⚕️ {appt.clinician.fullName}</span>
                          <span>📍 {appt.room.nameAr} ({appt.bed.name})</span>
                          <span>🏷️ {appt.sessionType.nameAr}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Check In Button */}
                        <button
                          disabled={isPending}
                          onClick={() => handleCheckIn(appt)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                        >
                          <span>✓</span>
                          تسجيل حضور
                        </button>

                        {/* WhatsApp Link Button */}
                        <button
                          onClick={() => handleOpenWhatsAppDialog(appt)}
                          className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800"
                        >
                          واتساب
                        </button>

                        {/* Action Panel Menu */}
                        <button
                          onClick={() => setSelectedAppointment(appt)}
                          className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-xl text-xs font-bold"
                        >
                          إجراءات...
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Side Column: Waitlist & Unpaid Today */}
          <div className="space-y-6">
            {/* Waitlist Panel (R-6-1) */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                <span>⏳ قائمة الانتظار اليوم</span>
                <span className="text-xs text-amber-600 font-mono">
                  {todayData?.waitingList?.length ?? 0}
                </span>
              </h3>

              {(todayData?.waitingList ?? []).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">لا يوجد مرضى بقائمة الانتظار</div>
              ) : (
                <div className="space-y-2">
                  {todayData.waitingList.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-amber-900 dark:text-amber-200">
                          {item.patient.fullName}
                        </div>
                        <div className="text-[11px] text-amber-700 dark:text-amber-400">
                          {item.sessionType.nameAr}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedAppointment(item);
                          setTargetStatus(AppointmentStatus.SCHEDULED);
                          setShowStatusModal(true);
                        }}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px]"
                      >
                        تسكين
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unpaid Charges Today (R-6-1) */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                <span>💳 مبالغ غير مسددة اليوم</span>
                <span className="text-xs text-red-600 font-mono">
                  {todayData?.unpaidToday?.length ?? 0}
                </span>
              </h3>

              {(todayData?.unpaidToday ?? []).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">جميع مبالغ اليوم مسددة بالكامل</div>
              ) : (
                <div className="space-y-2">
                  {todayData.unpaidToday.map((item: any) => {
                    const totalPiasters = item.charges.reduce(
                      (acc: number, c: any) => acc + c.amountPiasters,
                      0
                    );
                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-red-900 dark:text-red-200">
                            {item.patient.fullName}
                          </div>
                          <div className="text-[11px] text-red-700 dark:text-red-400 font-mono">
                            مستحق: {(totalPiasters / 100).toFixed(2)} ج.م
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenPaymentModal(item)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px]"
                        >
                          تحصيل
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TOMORROW'S REMINDERS (R-6-3) */}
      {activeTab === "tomorrow" && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              قائمة تذكيرات مواعيد الغد ({tomorrowData?.date})
            </h2>
            <span className="text-xs text-slate-500">
              إرسال رسائل تذكير عبر واتساب وتوثيق حالة الإرسال
            </span>
          </div>

          {(tomorrowData?.appointments ?? []).length === 0 ? (
            <div className="p-8 text-center text-slate-400">لا توجد مواعيد مجدولة للغد حتى الآن</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {tomorrowData.appointments.map((appt: any) => (
                <div key={appt.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {appt.patient.fullName}
                      </span>
                      {appt.reminderSent ? (
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 rounded text-[10px] font-bold">
                          ✓ تم إرسال التذكير
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 rounded text-[10px] font-bold">
                          لم يتم التذكير
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex gap-4">
                      <span>الوقت: {appt.startTime} - {appt.endTime}</span>
                      <span>المعالج: {appt.clinician.fullName}</span>
                      <span>الهاتف: {appt.patient.guardianPhone || appt.patient.mobilePhone}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenWhatsAppDialog(appt, "REMINDER")}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <span>💬</span>
                      فتح محادثة واتساب
                    </button>

                    {!appt.reminderSent && (
                      <button
                        onClick={() => handleMarkReminderSent(appt)}
                        className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                      >
                        توثيق كـ "تم الإرسال"
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PACKAGES EXPIRING / LOW SESSIONS (R-6-1, R-14-4, R-14-5) */}
      {activeTab === "packages" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Expiring Soon (<= 7 days) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
              <span>⚠️ باقات توشك على الانتهاء (خلال 7 أيام)</span>
              <span className="text-xs text-amber-600 font-mono">
                {todayData?.expiringPackages?.length ?? 0}
              </span>
            </h3>

            {(todayData?.expiringPackages ?? []).length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">لا توجد باقات منتهية قريباً</div>
            ) : (
              <div className="space-y-3">
                {todayData.expiringPackages.map((pkg: any) => (
                  <div
                    key={pkg.id}
                    className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2 text-xs"
                  >
                    <div className="font-bold text-amber-900 dark:text-amber-200">
                      {pkg.patient.fullName} — {pkg.sessionType.nameAr}
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400">
                      تاريخ الانتهاء: {new Date(pkg.expiryDate).toLocaleDateString("ar-EG")}
                    </div>
                    <button
                      onClick={() => handleOpenWhatsAppDialog({ patient: pkg.patient }, "EXPIRING_SOON")}
                      className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs"
                    >
                      إرسال تنبيه بالانتهاء عبر واتساب
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Sessions (<= 1 remaining) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
              <span>📉 باقات متبقي منها جلسة واحدة أو أقل</span>
              <span className="text-xs text-blue-600 font-mono">
                {todayData?.lowSessionPackages?.length ?? 0}
              </span>
            </h3>

            {(todayData?.lowSessionPackages ?? []).length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">لا توجد باقات منخفضة الجلسات</div>
            ) : (
              <div className="space-y-3">
                {todayData.lowSessionPackages.map((pkg: any) => (
                  <div
                    key={pkg.id}
                    className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2 text-xs"
                  >
                    <div className="font-bold text-blue-900 dark:text-blue-200">
                      {pkg.patient.fullName} — {pkg.sessionType.nameAr}
                    </div>
                    <div className="text-[11px] text-blue-700 dark:text-blue-400">
                      الجلسات المتبقية: {pkg.availableSessions} من {pkg.totalSessions}
                    </div>
                    <button
                      onClick={() => handleOpenWhatsAppDialog({ patient: pkg.patient }, "LOW_SESSIONS")}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs"
                    >
                      إرسال تذكير بتجديد الباقة عبر واتساب
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appointment Action Panel Modal (R-6-2) */}
      {selectedAppointment && !showStatusModal && !showWhatsAppModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                لوحة إجراءات الموعد السريعة (Front Desk Action Panel)
              </h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Demographic Summary Only (NO clinical content R-1.1-1, R-1.1-2) */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-xs">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {selectedAppointment.patient?.fullName}
              </div>
              <div className="text-slate-500">
                الهاتف: {selectedAppointment.patient?.mobilePhone || "—"}
              </div>
              <div className="text-slate-500">
                المعالج: {selectedAppointment.clinician?.fullName}
              </div>
              <div className="text-slate-500">
                الوقت: {selectedAppointment.startTime} - {selectedAppointment.endTime}
              </div>
            </div>

            {/* Grid of Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {selectedAppointment.status === "SCHEDULED" && (
                <button
                  onClick={() => {
                    handleCheckIn(selectedAppointment);
                    setSelectedAppointment(null);
                  }}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                >
                  تسجيل وصول (حضر)
                </button>
              )}

              {selectedAppointment.status === "ARRIVED" && (
                <button
                  onClick={() => {
                    setTargetStatus(AppointmentStatus.SCHEDULED);
                    setShowStatusModal(true);
                  }}
                  className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
                >
                  تراجع عن تسجيل الوصول
                </button>
              )}

              <button
                onClick={() => {
                  setTargetStatus(AppointmentStatus.CANCELLED);
                  setShowStatusModal(true);
                }}
                className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl"
              >
                إلغاء الموعد
              </button>

              <button
                onClick={() => {
                  setTargetStatus(AppointmentStatus.NO_SHOW);
                  setShowStatusModal(true);
                }}
                className="py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
              >
                تسجيل عدم حضور
              </button>

              <button
                onClick={() => handleOpenWhatsAppDialog(selectedAppointment)}
                className="py-2.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 font-bold text-xs rounded-xl"
              >
                محادثة واتساب
              </button>

              <button
                onClick={() => handleOpenPaymentModal(selectedAppointment)}
                className="py-2.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 font-bold text-xs rounded-xl"
              >
                تحصيل دفعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Reason Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              تأكيد تغيير الحالة إلى ({targetStatus})
            </h3>
            <p className="text-xs text-slate-500">
              يرجى تحديد السبب الإلزامي للتغيير في سجلات التدقيق
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
                onClick={handleConfirmStatus}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                {isPending ? "جاري الحفظ..." : "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Message Editor Modal (R-6-4) */}
      {showWhatsAppModal && waPreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>💬</span> إعداد رسالة واتساب
              </h3>
              <button onClick={() => setShowWhatsAppModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {/* Opt-Out Warning if consent === false (R-6-4) */}
            {waPreview.optedOut ? (
              <div className="p-4 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs font-bold text-red-700 dark:text-red-300 space-y-2">
                <div>⚠️ تحذير: {waPreview.warning}</div>
                <div className="text-[11px] font-normal text-slate-600 dark:text-slate-400">
                  سجل المريض يشير إلى رفض استلام رسائل الواتساب الترويجية أو التذكيرية.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Phone & Template Selector */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الرقم المستلم (E.164)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={waPreview.phone || ""}
                      className="w-full p-2 border rounded-xl text-xs bg-slate-100 dark:bg-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      النموذج
                    </label>
                    <select
                      value={waTemplateKey}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full p-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="REMINDER">تذكير بالموعد</option>
                      <option value="WELCOME">رسالة ترحيب</option>
                      <option value="RESCHEDULE">تعديل الموعد</option>
                      <option value="LOW_SESSIONS">تنبيه بقرب نفاد الباقة</option>
                      <option value="BALANCE_DUE">تنبيه بوجود مستحقات</option>
                      <option value="EXPIRING_SOON">تنبيه بقرب انتهاء صلاحية الباقة</option>
                    </select>
                  </div>
                </div>

                {/* Editable Message Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نص الرسالة (يمكنك التعديل قبل الإرسال)
                  </label>
                  <textarea
                    rows={4}
                    value={waCustomText}
                    onChange={(e) => setWaCustomText(e.target.value)}
                    className="w-full p-3 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 leading-relaxed"
                  />
                </div>

                {/* Launch wa.me Link */}
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    onClick={() => setShowWhatsAppModal(false)}
                    className="px-4 py-2 border rounded-xl text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <a
                    href={`https://wa.me/${waPreview.phone}?text=${encodeURIComponent(waCustomText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowWhatsAppModal(false)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5"
                  >
                    <span>↗️</span> فتح محادثة WhatsApp
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Real Payment Modal (Spec §8) */}
      {showPaymentModal && paymentTargetCharge && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>💳</span>
                <span>تحصيل دفعة مالية وإصدار إيصال</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Patient & Charge Summary */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">المريض:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {paymentTargetCharge.patient?.fullName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المطالبة:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {paymentChargeDetails?.charge?.description || "جلسة علاج طبيعي"}
                </span>
              </div>
              {paymentChargeDetails && (
                <div className="flex justify-between font-mono pt-1 border-t border-slate-200 dark:border-slate-700 font-bold">
                  <span className="text-slate-600 dark:text-slate-300">الرصيد المتبقي:</span>
                  <span className="text-[#0E6251] dark:text-teal-400">
                    {(paymentChargeDetails.balancePiasters / 100).toFixed(2)} EGP
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المبلغ المراد تحصيله (ج.م) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={paymentChargeDetails ? paymentChargeDetails.balancePiasters / 100 : undefined}
                  required
                  value={paymentAmountEgp}
                  onChange={(e) => setPaymentAmountEgp(e.target.value)}
                  className="w-full px-3 py-2 text-base font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#0E6251]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  طريقة الدفع *
                </label>
                <select
                  required
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value={PaymentMethod.CASH}>نقداً (درج الخزينة)</option>
                  <option value={PaymentMethod.INSTAPAY}>إنستاباي (InstaPay)</option>
                  <option value={PaymentMethod.VODAFONE_CASH}>محفظة إلكترونية (فودافون كاش)</option>
                  <option value={PaymentMethod.CARD}>بطاقة ائتمانية / فيزا</option>
                  <option value={PaymentMethod.FAWRY}>فوري (Fawry)</option>
                  <option value={PaymentMethod.BANK_TRANSFER}>تحويل بنكي</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الرقم المرجعي (اختياري للمعاملات الإلكترونية)
                </label>
                <input
                  type="text"
                  value={paymentRefNumber}
                  onChange={(e) => setPaymentRefNumber(e.target.value)}
                  placeholder="مثال: رقم تحويل إنستاباي أو كود العملية..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات التحصيل
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="ملاحظات اختيارية على الإيصال..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#0E6251] text-white hover:bg-[#117A65] shadow-md transition disabled:opacity-50"
                >
                  {processingPayment ? "جارٍ التحصيل..." : "تأكيد التحصيل وإصدار الإيصال"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal (R-8.2-4) */}
      {activeReceipt && (
        <PrintableReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
}
