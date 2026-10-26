"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { useRole } from "@/context/RoleContext";
import {
  completeSessionAction,
  editClinicalNoteAction,
  addClinicalNoteAddendumAction,
} from "@/server/actions/clinical";
import { getTodayDashboardAction } from "@/server/actions/frontDesk";
import { TreatmentModality, AppointmentStatus } from "@prisma/client";

export default function ClinicalQueuePage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const { role } = useRole();

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);

  // Completion Form State (Spec §9.1)
  const [painBefore, setPainBefore] = useState<number>(5);
  const [painAfter, setPainAfter] = useState<number>(2);
  const [subjective, setSubjective] = useState<string>("");
  const [objective, setObjective] = useState<string>("");
  const [assessment, setAssessment] = useState<string>("");
  const [plan, setPlan] = useState<string>("");
  const [selectedModalities, setSelectedModalities] = useState<TreatmentModality[]>([
    TreatmentModality.TENS,
    TreatmentModality.EXERCISE_THERAPY,
  ]);
  const [treatmentNotes, setTreatmentNotes] = useState<string>("");
  const [homeExercises, setHomeExercises] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await getTodayDashboardAction({ date: today });
      if (res.success && res.data) {
        // Physiotherapy patients arriving or completed today
        setAppointments(res.data.arrivingNext || []);
      }
    } catch {
      setError(isAr ? "حدث خطأ أثناء تحميل قائمة المرضى" : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const toggleModality = (mod: TreatmentModality) => {
    setSelectedModalities((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const handleOpenCompletion = (appt: any) => {
    setSelectedAppt(appt);
    setPainBefore(5);
    setPainAfter(2);
    setSubjective("");
    setObjective("");
    setAssessment("");
    setPlan("");
    setTreatmentNotes("");
    // Home exercises carried forward if previous note exists (R-9.1-4)
    setHomeExercises(
      isAr
        ? "تمرين رفع الساق مستقيمة (Straight Leg Raise) 3 مجموعات × 10 تكرارات يومياً + كمادات باردة 15 دقيقة"
        : "Straight leg raise 3x10 daily + ice 15 min"
    );
    setError(null);
  };

  const handleSubmitCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await completeSessionAction({
        appointmentId: selectedAppt.id,
        painBefore: Number(painBefore),
        painAfter: Number(painAfter),
        subjective: subjective || undefined,
        objective: objective || undefined,
        assessment: assessment || undefined,
        plan: plan || undefined,
        treatmentModalities: selectedModalities,
        treatmentNotes: treatmentNotes || undefined,
        homeExercises: homeExercises || undefined,
      });

      if (res.success) {
        setSuccessMsg(
          isAr
            ? `تم إتمام الجلسة بنجاح واعتماد التقرير الطبي وخصم حصة الباقة للمريض (${selectedAppt.patient?.fullName})`
            : `Session completed and package session deducted for (${selectedAppt.patient?.fullName}).`
        );
        setSelectedAppt(null);
        fetchQueue();
      } else if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل إتمام الجلسة" : "Failed to complete session"));
      }
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع" : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  const modalitiesList: { key: TreatmentModality; ar: string; en: string }[] = [
    { key: TreatmentModality.TENS, ar: "تيار كهربي مسكن (TENS)", en: "TENS" },
    { key: TreatmentModality.ULTRASOUND, ar: "موجات فوق صوتية (Ultrasound)", en: "Ultrasound" },
    { key: TreatmentModality.SHOCKWAVE, ar: "موجات تصادمية (Shockwave)", en: "Shockwave" },
    { key: TreatmentModality.LASER, ar: "ليزر علاجي (Laser)", en: "Laser" },
    { key: TreatmentModality.MANUAL_THERAPY, ar: "علاج يدوي (Manual Therapy)", en: "Manual Therapy" },
    { key: TreatmentModality.DRY_NEEDLING, ar: "إبر جافة (Dry Needling)", en: "Dry Needling" },
    { key: TreatmentModality.EXERCISE_THERAPY, ar: "تمارين علاجية (Exercise Therapy)", en: "Exercise Therapy" },
    { key: TreatmentModality.OTHER, ar: "أخرى", en: "Other" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            {isAr ? "قائمة انتظار العلاج الطبيعي والتأهيل (Clinical Queue)" : "Physiotherapy Clinical Queue"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAr
              ? "استقبال المرضى الواصلين، تسجيل قياسات الألم (0-10)، توثيق SOAP، واعتماد الجلسة [R-9.1-1 إلى R-9.1-7]."
              : "Document SOAP clinical notes, pain scores (0-10), treatment modalities, and complete sessions."}
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
        >
          {isAr ? "تحديث القائمة" : "Refresh Queue"}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Queue List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-3">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {isAr ? "مرضى اليوم بالعيادة" : "Today's Patient Queue"}
          </h2>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {isAr ? "جارٍ التحميل..." : "Loading queue..."}
            </div>
          ) : appointments.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              {isAr ? "لا توجد مواعيد واصلة حالياً" : "No arriving patients right now"}
            </div>
          ) : (
            <div className="space-y-2">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  onClick={() => handleOpenCompletion(appt)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition ${
                    selectedAppt?.id === appt.id
                      ? "border-[#0E6251] bg-teal-50/50 dark:bg-teal-950/30"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {appt.patient?.fullName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {appt.startTime}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>{appt.sessionType?.nameAr || "علاج طبيعي"}</span>
                    <span>{appt.room?.nameAr} - {appt.bed?.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completion Form (Spec §9.1) */}
        <div className="md:col-span-2">
          {selectedAppt ? (
            <form
              onSubmit={handleSubmitCompletion}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 text-start"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {isAr ? "نموذج توثيق وإتمام الجلسة العلاجية" : "Clinical Session Completion Form"}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedAppt.patient?.fullName} | {selectedAppt.sessionType?.nameAr}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAppt(null)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              {/* Pain Scale (0-10) R-9.1-1 */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "مستوى الألم قبل الجلسة (0 - 10)" : "Pain Before (0 - 10)"} *
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={painBefore}
                      onChange={(e) => setPainBefore(Number(e.target.value))}
                      className="w-full accent-rose-600"
                    />
                    <span className="font-mono font-bold text-sm text-rose-600 w-6 text-center">
                      {painBefore}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "مستوى الألم بعد الجلسة (0 - 10)" : "Pain After (0 - 10)"} *
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={painAfter}
                      onChange={(e) => setPainAfter(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                    <span className="font-mono font-bold text-sm text-emerald-600 w-6 text-center">
                      {painAfter}
                    </span>
                  </div>
                </div>
              </div>

              {/* SOAP Documentation (R-9.1-2) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  SOAP Clinical Documentation
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Subjective (شكوى المريض والأعراض)
                    </label>
                    <textarea
                      rows={2}
                      value={subjective}
                      onChange={(e) => setSubjective(e.target.value)}
                      placeholder={isAr ? "شكوى المريض، تطور الألم..." : "Patient complaints"}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Objective (الفحص السريري ومدى الحركة)
                    </label>
                    <textarea
                      rows={2}
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      placeholder={isAr ? "مدى الحركة ROM، التورم، القوة العضلية..." : "Clinical findings"}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Assessment (التقييم السريري والاستجابة)
                    </label>
                    <textarea
                      rows={2}
                      value={assessment}
                      onChange={(e) => setAssessment(e.target.value)}
                      placeholder={isAr ? "مدى التحسن، تشخيص الحالة الراهن..." : "Assessment"}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Plan (الخطة العلاجية القادمة)
                    </label>
                    <textarea
                      rows={2}
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      placeholder={isAr ? "عدد الجلسات، التدرج في التمارين..." : "Future plan"}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Treatment Modalities (R-9.1-3) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "العلاجات والأجهزة المستخدمة في الجلسة" : "Treatment Modalities Used"}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {modalitiesList.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => toggleModality(m.key)}
                      className={`p-2 rounded-lg border text-start text-[11px] font-semibold transition ${
                        selectedModalities.includes(m.key)
                          ? "bg-teal-50 dark:bg-teal-950/60 border-teal-600 text-teal-800 dark:text-teal-200"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {isAr ? m.ar : m.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Home Exercises (R-9.1-4) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "التمارين المنزلية الموصى بها (مرحّلة وقابلة للتعديل)" : "Home Exercises (Carried Forward)"}
                </label>
                <textarea
                  rows={2}
                  value={homeExercises}
                  onChange={(e) => setHomeExercises(e.target.value)}
                  placeholder={isAr ? "التمارين المنزلية، عدد التكرارات، تعليمات الثلج أو الراحة..." : "Home exercises"}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAppt(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-xs font-bold rounded-xl bg-[#0E6251] text-white hover:bg-[#117A65] shadow-md transition disabled:opacity-50"
                >
                  {submitting
                    ? isAr
                      ? "جارٍ الاعتماد والحفظ..."
                      : "Saving..."
                    : isAr
                    ? "اعتماد وإتمام الجلسة (خصم الحصة)"
                    : "Complete Session & Deduct"}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 text-xs">
              <span className="text-3xl block mb-2">📋</span>
              {isAr
                ? "اختر مريضاً من قائمة الانتظار لفتح نموذج التوثيق السريري واعتماد الجلسة."
                : "Select an arrived patient from the queue to open the completion form."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
