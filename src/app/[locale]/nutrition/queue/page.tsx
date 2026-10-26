"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocale } from "next-intl";
import { useRole } from "@/context/RoleContext";
import {
  saveInBodyRecordAction,
  getPatientInBodyHistoryAction,
} from "@/server/actions/clinical";
import { getTodayDashboardAction } from "@/server/actions/frontDesk";
import { DietaryProtocol, Gender } from "@prisma/client";

export default function NutritionQueuePage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const { role } = useRole();

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);

  // InBody & Nutrition Form State (Spec §9.4, DEC-028)
  const [testDate, setTestDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [heightCm, setHeightCm] = useState<number>(170);
  const [weightKg, setWeightKg] = useState<number>(75);
  const [targetWeightKg, setTargetWeightKg] = useState<number>(70);
  const [skeletalMuscleMassKg, setSkeletalMuscleMassKg] = useState<number>(32);
  const [bodyFatPercentage, setBodyFatPercentage] = useState<number>(24);
  const [visceralFatLevel, setVisceralFatLevel] = useState<number>(7);

  // Targets & Macros
  const [calorieTargetKcal, setCalorieTargetKcal] = useState<number>(1800);
  const [targetProteinGrams, setTargetProteinGrams] = useState<number>(130);
  const [targetCarbsGrams, setTargetCarbsGrams] = useState<number>(160);
  const [targetFatGrams, setTargetFatGrams] = useState<number>(60);
  const [protocol, setProtocol] = useState<DietaryProtocol>(DietaryProtocol.BALANCED_LIFESTYLE);
  const [protocolNotes, setProtocolNotes] = useState<string>("");
  const [clinicalNotes, setClinicalNotes] = useState<string>("");

  // History & Metrics
  const [inBodyHistory, setInBodyHistory] = useState<any[]>([]);
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
        setAppointments(res.data.arrivingNext || []);
      }
    } catch {
      setError(isAr ? "حدث خطأ أثناء تحميل قائمة العيادة" : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // When an appointment / patient is selected, load their InBody history and pre-fill height
  const handleSelectPatient = async (appt: any) => {
    setSelectedAppt(appt);
    setError(null);
    setSuccessMsg(null);

    try {
      const historyRes = await getPatientInBodyHistoryAction({
        patientId: appt.patientId,
      });
      if (historyRes.success && historyRes.data) {
        setInBodyHistory(historyRes.data.records || []);
        // Pre-fill height from latest record if available (R-9.4-1)
        if (historyRes.data.latestHeightCm) {
          setHeightCm(historyRes.data.latestHeightCm);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Live Auto-Calculations (calculations.md §6.1, §6.2)
  const patientGender = selectedAppt?.patient?.gender || Gender.MALE;
  const patientAge = useMemo(() => {
    if (!selectedAppt?.patient?.dateOfBirth) return 30;
    const dob = new Date(selectedAppt.patient.dateOfBirth);
    const diff = Date.now() - dob.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }, [selectedAppt]);

  const liveBmi = useMemo(() => {
    if (!heightCm || !weightKg || heightCm <= 0) return 0;
    const hM = heightCm / 100;
    return Math.round((weightKg / (hM * hM)) * 10) / 10;
  }, [heightCm, weightKg]);

  const liveBmr = useMemo(() => {
    if (!heightCm || !weightKg || heightCm <= 0) return 0;
    const s = patientGender === Gender.MALE ? 5 : -161;
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * patientAge + s);
  }, [heightCm, weightKg, patientAge, patientGender]);

  // Live Macro Calorie Divergence Check (DEC-028)
  const macroCalories = useMemo(() => {
    return (targetProteinGrams || 0) * 4 + (targetCarbsGrams || 0) * 4 + (targetFatGrams || 0) * 9;
  }, [targetProteinGrams, targetCarbsGrams, targetFatGrams]);

  const calorieDivergence = useMemo(() => {
    if (!calorieTargetKcal || calorieTargetKcal <= 0 || macroCalories <= 0) {
      return { hasWarning: false, percent: 0 };
    }
    const diff = Math.abs(macroCalories - calorieTargetKcal);
    const ratio = diff / calorieTargetKcal;
    return {
      hasWarning: ratio > 0.1,
      percent: Math.round(ratio * 100),
      isHigher: macroCalories > calorieTargetKcal,
    };
  }, [calorieTargetKcal, macroCalories]);

  const handleSaveInBody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await saveInBodyRecordAction({
        patientId: selectedAppt.patientId,
        appointmentId: selectedAppt.id,
        testDate,
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
        skeletalMuscleMassKg: skeletalMuscleMassKg ? Number(skeletalMuscleMassKg) : undefined,
        bodyFatPercentage: bodyFatPercentage ? Number(bodyFatPercentage) : undefined,
        visceralFatLevel: visceralFatLevel ? Number(visceralFatLevel) : undefined,
        calorieTargetKcal: calorieTargetKcal ? Number(calorieTargetKcal) : undefined,
        targetProteinGrams: targetProteinGrams ? Number(targetProteinGrams) : undefined,
        targetCarbsGrams: targetCarbsGrams ? Number(targetCarbsGrams) : undefined,
        targetFatGrams: targetFatGrams ? Number(targetFatGrams) : undefined,
        protocol,
        protocolNotes: protocolNotes || undefined,
        clinicalNotes: clinicalNotes || undefined,
      });

      if (res.success) {
        setSuccessMsg(
          isAr
            ? "تم حفظ قياسات InBody والنظام الغذائي بنجاح"
            : "InBody record and dietary plan saved successfully"
        );
        // Refresh history
        handleSelectPatient(selectedAppt);
      } else {
        setError(res.error?.message || "فشل حفظ القياسات");
      }
    } catch (err: any) {
      setError(err?.message || "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xl">
              🥗
            </span>
            {isAr ? "عيادة التغذية والقياسات الحيوية (InBody)" : "Nutrition & InBody Clinic"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isAr
              ? "تسجيل قياسات الـ InBody، حساب مؤشر كتلة الجسم ومعدل الحرق، وتوزيع الماكروز"
              : "Record InBody scans, calculate BMI/BMR, and distribute macronutrient targets"}
          </p>
        </div>
      </div>

      {/* Main Grid: Left Patient Queue, Right InBody Form & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Arriving Patients Queue */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center justify-between">
              <span>{isAr ? "مرضى اليوم بالانتظار" : "Today's Patient Queue"}</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {appointments.length}
              </span>
            </h2>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                {isAr ? "جاري تحميل المواعيد..." : "Loading appointments..."}
              </div>
            ) : appointments.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                {isAr ? "لا يوجد مواعيد في قائمة الانتظار حالياً" : "No appointments in queue"}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-150 overflow-y-auto pr-1">
                {appointments.map((appt) => {
                  const isSelected = selectedAppt?.id === appt.id;
                  return (
                    <div
                      key={appt.id}
                      onClick={() => handleSelectPatient(appt)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500/40 shadow-md ring-1 ring-emerald-500/30"
                          : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-slate-100 text-sm">
                            {appt.patient?.fullName}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {appt.service?.nameAr || appt.service?.name}
                          </div>
                        </div>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-700/60 text-slate-300">
                          {new Date(appt.startsAt).toLocaleTimeString(isAr ? "ar-EG" : "en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/30 text-xs text-slate-400">
                        <span>📱 {appt.patient?.phone}</span>
                        {appt.package && (
                          <span className="text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded text-[11px]">
                            {isAr ? "ضمن باقة" : "Package"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: InBody Form & Dynamic Calculations */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedAppt ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-100">
              <span className="text-5xl mb-4">⚖️</span>
              <h3 className="text-lg font-semibold text-slate-200">
                {isAr ? "اختر مريضاً من القائمة لبدء فحص InBody" : "Select a patient to start InBody"}
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                {isAr
                  ? "سيتم استرجاع سجل الفحوصات السابقة وملء الطول تلقائياً"
                  : "Previous test history will be loaded and height pre-filled automatically"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Patient Banner with Live Quick Stats */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <span>{selectedAppt.patient?.fullName}</span>
                      <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-full text-slate-300 border border-slate-700">
                        {patientAge} {isAr ? "سنة" : "yrs"} •{" "}
                        {patientGender === Gender.MALE
                          ? isAr ? "ذكر" : "Male"
                          : isAr ? "أنثى" : "Female"}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {isAr ? "تاريخ الفحص:" : "Scan Date:"} {testDate}
                    </p>
                  </div>

                  {/* Calculated KPI Cards */}
                  <div className="flex items-center gap-3">
                    <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
                      <div className="text-[11px] text-slate-400 uppercase tracking-wider">BMI</div>
                      <div className="text-base font-bold text-emerald-400">{liveBmi}</div>
                    </div>
                    <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
                      <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {isAr ? "الحرق الأساسي BMR" : "BMR (MSJ)"}
                      </div>
                      <div className="text-base font-bold text-blue-400">{liveBmr} <span className="text-[10px] text-slate-400 font-normal">kcal</span></div>
                    </div>
                  </div>
                </div>

                {/* Soft Calorie Divergence Warning Banner (DEC-028) */}
                {calorieDivergence.hasWarning && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
                    <span className="text-base">⚠️</span>
                    <div className="space-y-0.5">
                      <div className="font-semibold">
                        {isAr
                          ? `تنبيه توافق السعرات والماكروز (فارق ${calorieDivergence.percent}%)`
                          : `Calorie & Macro Divergence Notice (${calorieDivergence.percent}% difference)`}
                      </div>
                      <p className="text-amber-200/80">
                        {isAr
                          ? `إجمالي سعرات الماكروز المحسوبة (${macroCalories} kcal) يختلف بأكثر من 10% عن الهدف اليومي المحدد (${calorieTargetKcal} kcal). يمكنك المتابعة وحفظ القياسات حسب التقدير السريري.`
                          : `Macronutrient total calories (${macroCalories} kcal) differs by over 10% from the target (${calorieTargetKcal} kcal). You can proceed and save according to clinical judgment.`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Form & Tabs */}
              <form onSubmit={handleSaveInBody} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                {error && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                {successMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                    {successMsg}
                  </div>
                )}

                {/* Section 1: Body Composition Measurements */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    {isAr ? "1. قياسات الجسم الحيوية (InBody Scan)" : "1. Body Composition Measurements"}
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {isAr ? "الطول (سم) - مسبق الملء" : "Height (cm)"}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={heightCm}
                        onChange={(e) => setHeightCm(Number(e.target.value))}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {isAr ? "الوزن الحالي (كجم)" : "Weight (kg)"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={weightKg}
                        onChange={(e) => setWeightKg(Number(e.target.value))}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {isAr ? "الوزن المستهدف (كجم)" : "Target Weight (kg)"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={targetWeightKg}
                        onChange={(e) => setTargetWeightKg(Number(e.target.value))}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {isAr ? "الكتلة العضلية (SMM كجم)" : "Muscle Mass (SMM kg)"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={skeletalMuscleMassKg}
                        onChange={(e) => setSkeletalMuscleMassKg(Number(e.target.value))}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {isAr ? "نسبة الدهون (%)" : "Body Fat (%)"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={bodyFatPercentage}
                        onChange={(e) => setBodyFatPercentage(Number(e.target.value))}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {isAr ? "الدهون الحشوية (مستوى 1-20)" : "Visceral Fat (1-20)"}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={visceralFatLevel}
                        onChange={(e) => setVisceralFatLevel(Number(e.target.value))}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Nutrition Targets & Macros (DEC-028) */}
                <div className="pt-4 border-t border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    {isAr ? "2. خطة السعرات والماكروز اليومية" : "2. Daily Calories & Macronutrients"}
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {isAr ? "الهدف اليومي (سعرة)" : "Calorie Target (kcal)"}
                      </label>
                      <input
                        type="number"
                        value={calorieTargetKcal}
                        onChange={(e) => setCalorieTargetKcal(Number(e.target.value))}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {isAr ? "البروتين (جرام)" : "Protein (g)"}
                      </label>
                      <input
                        type="number"
                        value={targetProteinGrams}
                        onChange={(e) => setTargetProteinGrams(Number(e.target.value))}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {isAr ? "الكربوهيدرات (جرام)" : "Carbs (g)"}
                      </label>
                      <input
                        type="number"
                        value={targetCarbsGrams}
                        onChange={(e) => setTargetCarbsGrams(Number(e.target.value))}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {isAr ? "الدهون الصحية (جرام)" : "Fats (g)"}
                      </label>
                      <input
                        type="number"
                        value={targetFatGrams}
                        onChange={(e) => setTargetFatGrams(Number(e.target.value))}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-400 flex items-center justify-between bg-slate-800/40 px-3.5 py-2 rounded-xl border border-slate-700/50">
                    <span>
                      {isAr ? "مجموع سعرات الماكروز:" : "Macro Calories Sum:"}{" "}
                      <strong className="text-white font-mono">{macroCalories} kcal</strong>
                    </span>
                    <span>
                      P: {targetProteinGrams * 4} kcal | C: {targetCarbsGrams * 4} kcal | F: {targetFatGrams * 9} kcal
                    </span>
                  </div>
                </div>

                {/* Section 3: Protocol & Clinical Notes */}
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    {isAr ? "3. النظام الغذائي والملاحظات السريرية" : "3. Dietary Protocol & Notes"}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {isAr ? "نوع النظام الغذائي" : "Dietary Protocol"}
                      </label>
                      <select
                        value={protocol}
                        onChange={(e) => setProtocol(e.target.value as DietaryProtocol)}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value={DietaryProtocol.BALANCED_LIFESTYLE}>
                          {isAr ? "نمط حياة متوازن (Balanced Lifestyle)" : "Balanced Lifestyle"}
                        </option>
                        <option value={DietaryProtocol.LOW_CARB_ANTI_INFLAMMATORY}>
                          {isAr ? "قليل الكربوهيدرات ومضاد للالتهاب (Low Carb)" : "Low Carb Anti-Inflammatory"}
                        </option>
                        <option value={DietaryProtocol.KETO}>
                          {isAr ? "كيتو (Ketogenic)" : "Ketogenic"}
                        </option>
                        <option value={DietaryProtocol.INTERMITTENT_FASTING}>
                          {isAr ? "صيام متقطع (Intermittent Fasting)" : "Intermittent Fasting"}
                        </option>
                        <option value={DietaryProtocol.SPORTS_NUTRITION}>
                          {isAr ? "تغذية رياضية (Sports Nutrition)" : "Sports Nutrition"}
                        </option>
                        <option value={DietaryProtocol.DIABETIC_INSULIN_RESISTANCE}>
                          {isAr ? "مقاومة إنسولين وسكري (Diabetic/IR)" : "Diabetic / Insulin Resistance"}
                        </option>
                        <option value={DietaryProtocol.POST_BARIATRIC}>
                          {isAr ? "ما بعد جراحات السمنة (Post Bariatric)" : "Post Bariatric"}
                        </option>
                        <option value={DietaryProtocol.OTHER}>
                          {isAr ? "نظام مخصص / أخرى (Other)" : "Other"}
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {isAr ? "توجيهات النظام الغذائي للمريض" : "Protocol Guidelines"}
                      </label>
                      <input
                        type="text"
                        placeholder={
                          isAr
                            ? "مثال: وجبتين رئيسيتين + سناك، شرب 3 لتر ماء"
                            : "e.g., 2 main meals + snack, 3L water"
                        }
                        value={protocolNotes}
                        onChange={(e) => setProtocolNotes(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {isAr ? "ملاحظات وتوصيات أخصائي التغذية" : "Clinical Notes"}
                    </label>
                    <textarea
                      rows={2}
                      placeholder={
                        isAr
                          ? "تقييم العادات الغذائية، التحاليل الطبية، والتوجيهات السريرية..."
                          : "Clinical assessment, bloodwork considerations..."
                      }
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {submitting
                      ? isAr ? "جاري الحفظ..." : "Saving..."
                      : isAr ? "حفظ الفحص والقياسات الحيوية" : "Save InBody & Nutrition Plan"}
                  </button>
                </div>
              </form>

              {/* Progress History Cards / Table */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-semibold text-white flex items-center justify-between">
                  <span>{isAr ? "سجل القياسات السابقة وتطور الحالة" : "InBody History & Progress"}</span>
                  <span className="text-xs text-slate-400">
                    {inBodyHistory.length} {isAr ? "فحوصات مسجلة" : "scans"}
                  </span>
                </h3>

                {inBodyHistory.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-sm">
                    {isAr ? "لا توجد قياسات سابقة مسجلة لهذا المريض" : "No previous InBody scans"}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right text-slate-300">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400 bg-slate-800/40">
                          <th className="p-2.5">{isAr ? "التاريخ" : "Date"}</th>
                          <th className="p-2.5">{isAr ? "الوزن" : "Weight"}</th>
                          <th className="p-2.5">BMI</th>
                          <th className="p-2.5">{isAr ? "العضل (SMM)" : "Muscle"}</th>
                          <th className="p-2.5">{isAr ? "الدهون %" : "Fat %"}</th>
                          <th className="p-2.5">{isAr ? "الحشوية" : "Visceral"}</th>
                          <th className="p-2.5">BMR</th>
                          <th className="p-2.5">{isAr ? "النظام" : "Protocol"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {inBodyHistory.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-800/40">
                            <td className="p-2.5 font-mono">
                              {new Date(rec.testDate).toLocaleDateString(
                                isAr ? "ar-EG" : "en-US"
                              )}
                            </td>
                            <td className="p-2.5 font-semibold text-white">
                              {rec.weightKg} kg
                            </td>
                            <td className="p-2.5 text-emerald-400 font-bold">{rec.bmi}</td>
                            <td className="p-2.5">{rec.skeletalMuscleMassKg ?? "-"} kg</td>
                            <td className="p-2.5 text-amber-400 font-bold">
                              {rec.bodyFatPercentage ? `${rec.bodyFatPercentage}%` : "-"}
                            </td>
                            <td className="p-2.5">{rec.visceralFatLevel ?? "-"}</td>
                            <td className="p-2.5 font-mono">{rec.bmr} kcal</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                                {rec.protocol}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
