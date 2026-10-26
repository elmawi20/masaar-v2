"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useRole } from "@/context/RoleContext";
import {
  getPatientProfileAction,
  addPatientDiagnosisAction,
  grantCoveringAccessAction,
  uploadPatientDocumentAction,
  dischargePatientAction,
} from "@/server/actions/patients";
import { DocumentCategory } from "@prisma/client";
import { calculatePatientAge } from "@/domain/patients/age";

type TabType =
  | "OVERVIEW"
  | "APPOINTMENTS"
  | "PACKAGES"
  | "PAYMENTS"
  | "DOCUMENTS"
  | "CLINICAL"
  | "NUTRITION"
  | "ACTIVITY";

export default function PatientProfilePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id: patientId } = use(params);
  const locale = useLocale();
  const { role: currentRole } = useRole();
  const isAr = locale === "ar";

  const isClinician =
    currentRole === "PHYSIOTHERAPIST" ||
    currentRole === "NUTRITIONIST" ||
    currentRole === "OWNER";
  const isOwnerOrManager = currentRole === "OWNER" || currentRole === "MANAGER";

  const [activeTab, setActiveTab] = useState<TabType>("OVERVIEW");
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Diagnosis Modal / Form
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [diagnosisText, setDiagnosisText] = useState("");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [savingDiag, setSavingDiag] = useState(false);

  // Covering Access Modal
  const [showCoveringModal, setShowCoveringModal] = useState(false);
  const [coveringReason, setCoveringReason] = useState("");
  const [savingCovering, setSavingCovering] = useState(false);

  // Document Upload Modal
  const [showDocModal, setShowDocModal] = useState(false);
  const [docCategory, setDocCategory] = useState<DocumentCategory>(DocumentCategory.ID_ADMINISTRATIVE);
  const [docTitle, setDocTitle] = useState("");
  const [docFileName, setDocFileName] = useState("");
  const [savingDoc, setSavingDoc] = useState(false);

  // Discharge Modal
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargeReason, setDischargeReason] = useState("");
  const [savingDischarge, setSavingDischarge] = useState(false);

  const fetchPatientProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPatientProfileAction({ patientId });
      if (res.success) {
        setPatient(res.data);
      } else {
        setError(res.error?.message || (isAr ? "فشل تحميل ملف المريض." : "Failed to load patient."));
      }
    } catch {
      setError(isAr ? "حدث خطأ أثناء تحميل الملف." : "Error loading profile.");
    } finally {
      setLoading(false);
    }
  }, [patientId, isAr]);

  useEffect(() => {
    fetchPatientProfile();
  }, [fetchPatientProfile]);

  // Handle Add Diagnosis
  const handleAddDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDiag(true);
    setError(null);

    try {
      const res = await addPatientDiagnosisAction({
        patientId,
        diagnosisText,
        notes: diagnosisNotes || null,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل إضافة التشخيص." : "Failed to add diagnosis."));
        return;
      }

      setSuccessMessage(isAr ? "تم تسجيل التشخيص الطبي بنجاح." : "Diagnosis recorded successfully.");
      setShowDiagModal(false);
      setDiagnosisText("");
      setDiagnosisNotes("");
      fetchPatientProfile();
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع." : "Unexpected error.");
    } finally {
      setSavingDiag(false);
    }
  };

  // Handle Request Covering Access
  const handleGrantCovering = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCovering(true);
    setError(null);

    try {
      const res = await grantCoveringAccessAction({
        patientId,
        reason: coveringReason,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل طلب التغطية." : "Failed to grant covering."));
        return;
      }

      setSuccessMessage(isAr ? "تم تفعيل صلاحية التغطية المؤقتة بنجاح." : "Covering access granted.");
      setShowCoveringModal(false);
      setCoveringReason("");
      fetchPatientProfile();
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع." : "Unexpected error.");
    } finally {
      setSavingCovering(false);
    }
  };

  // Handle Upload Document
  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDoc(true);
    setError(null);

    try {
      const res = await uploadPatientDocumentAction({
        patientId,
        category: docCategory,
        title: docTitle,
        fileName: docFileName || "document.pdf",
        fileSizeBytes: 250000,
        mimeType: "application/pdf",
        fileKey: `uploads/${Date.now()}_${docFileName || "document.pdf"}`,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل رفع المستند." : "Failed to upload document."));
        return;
      }

      setSuccessMessage(isAr ? "تم حفظ المستند في ملف المريض بنجاح." : "Document uploaded successfully.");
      setShowDocModal(false);
      setDocTitle("");
      setDocFileName("");
      fetchPatientProfile();
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع." : "Unexpected error.");
    } finally {
      setSavingDoc(false);
    }
  };

  // Handle Discharge Patient
  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDischarge(true);
    setError(null);

    try {
      const res = await dischargePatientAction({
        patientId,
        dischargeReason,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل إنهاء العلاج." : "Failed to discharge."));
        return;
      }

      setSuccessMessage(isAr ? "تم إنهاء البرنامج العلاجي وتخريج المريض." : "Patient discharged.");
      setShowDischargeModal(false);
      setDischargeReason("");
      fetchPatientProfile();
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع." : "Unexpected error.");
    } finally {
      setSavingDischarge(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-slate-400">
        {isAr ? "جارٍ تحميل ملف المريض..." : "Loading patient file..."}
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="py-12 text-center text-xs text-slate-500">
        {error || (isAr ? "الملف غير موجود." : "Patient not found.")}
      </div>
    );
  }

  let ageDisplay = "—";
  try {
    ageDisplay = `${calculatePatientAge(new Date(patient.dateOfBirth))} ${isAr ? "سنة" : "y/o"}`;
  } catch {
    // fallback
  }

  // Target WhatsApp phone
  const rawTargetPhone = patient.isDependent ? patient.guardianPhone : patient.mobilePhone;
  const waTarget = rawTargetPhone ? `2${rawTargetPhone}` : "";
  const waGreeting = encodeURIComponent(
    isAr
      ? `أهلاً بك يا ${patient.fullName}، نتمنى لك دوام الصحة والعافية من مسار كلينك.`
      : `Hello ${patient.fullName}, wishing you good health from Masaar Clinic.`
  );
  const waUrl = waTarget ? `https://wa.me/${waTarget}?text=${waGreeting}` : "#";

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back Link */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href={`/${locale}/reception/patients`} className="hover:underline">
          {isAr ? "دليل المرضى" : "Patients Directory"}
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          M-{patient.fileNumber.toString().padStart(4, "0")} · {patient.fullName}
        </span>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center justify-between shadow-sm">
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)} className="font-bold">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between shadow-sm">
          <span>✓ {successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Patient Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold text-[#0E6251] dark:text-[#48C9B0] text-sm">
              M-{patient.fileNumber.toString().padStart(4, "0")}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{patient.fullName}</h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    patient.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : patient.status === "DISCHARGED"
                      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                  }`}
                >
                  {patient.status}
                </span>

                {patient.hasAnyAlert && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
                    ⚠️ {isAr ? "تنبيه طبي" : "Medical Alert"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                <span>{ageDisplay}</span>
                <span>•</span>
                <span>{patient.gender === "MALE" ? (isAr ? "ذكر" : "Male") : (isAr ? "أنثى" : "Female")}</span>
                <span>•</span>
                <span className="font-mono">
                  {patient.isDependent ? `${patient.guardianPhone} (${patient.guardianName})` : patient.mobilePhone}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {/* WhatsApp wa.me Link (R-6-4) */}
            {patient.whatsappConsent ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
              >
                <span>💬</span>
                <span>WhatsApp</span>
              </a>
            ) : (
              <span className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                {isAr ? "غير مشترك بالواتساب" : "WhatsApp Opted Out"}
              </span>
            )}

            {/* Discharge Button (Clinicians & Owner) */}
            {isClinician && patient.status === "ACTIVE" && (
              <button
                type="button"
                onClick={() => setShowDischargeModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {isAr ? "إنهاء العلاج (تخريج)" : "Discharge"}
              </button>
            )}
          </div>
        </div>

        {/* Medical Alert Banner */}
        {patient.hasAnyAlert && (
          <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-xs space-y-1">
            <span className="font-bold text-red-800 dark:text-red-300 block">
              ⚠️ {isAr ? "تنبيه طبي ومحاذير علاجية خاصة بهذا المريض:" : "Medical Precautions & Alerts:"}
            </span>
            <div className="flex items-center gap-2 flex-wrap text-red-700 dark:text-red-300">
              {patient.hasDiabetes && <span className="bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded font-semibold">• السكري</span>}
              {patient.hasPacemaker && <span className="bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded font-bold">• منظم ضربات قلب</span>}
              {patient.hasHypertension && <span className="bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded font-semibold">• ضغط دم مرتفع</span>}
              {patient.hasOsteoporosis && <span className="bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded font-semibold">• هشاشة عظام</span>}
              {patient.hasFallRisk && <span className="bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded font-semibold">• خطر السقوط</span>}
              {patient.isPregnant && <span className="bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded font-semibold">• حمل</span>}
            </div>
            {patient.medicalAlertsNotes && (
              <p className="text-red-800 dark:text-red-200 pt-1 border-t border-red-200/50 dark:border-red-800/50 font-medium">
                {patient.medicalAlertsNotes}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Profile Tabs Navigation (R-4.3-1) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("OVERVIEW")}
          className={`pb-2.5 px-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "OVERVIEW"
              ? "border-[#0E6251] text-[#0E6251] dark:border-[#48C9B0] dark:text-[#48C9B0]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {isAr ? "نظرة عامة" : "Overview"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("APPOINTMENTS")}
          className={`pb-2.5 px-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "APPOINTMENTS"
              ? "border-[#0E6251] text-[#0E6251] dark:border-[#48C9B0] dark:text-[#48C9B0]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {isAr ? `المواعيد (${patient.appointments?.length || 0})` : `Appointments (${patient.appointments?.length || 0})`}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PACKAGES")}
          className={`pb-2.5 px-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "PACKAGES"
              ? "border-[#0E6251] text-[#0E6251] dark:border-[#48C9B0] dark:text-[#48C9B0]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {isAr ? `الباقات (${patient.packages?.length || 0})` : `Packages (${patient.packages?.length || 0})`}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PAYMENTS")}
          className={`pb-2.5 px-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "PAYMENTS"
              ? "border-[#0E6251] text-[#0E6251] dark:border-[#48C9B0] dark:text-[#48C9B0]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {isAr ? "الحسابات والفواتير" : "Billing & Payments"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("DOCUMENTS")}
          className={`pb-2.5 px-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "DOCUMENTS"
              ? "border-[#0E6251] text-[#0E6251] dark:border-[#48C9B0] dark:text-[#48C9B0]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {isAr ? `المستندات (${patient.documents?.length || 0})` : `Documents (${patient.documents?.length || 0})`}
        </button>

        {/* Clinical Tab (Clinicians & Owner Only - Strictly Hidden from Reception & Manager) */}
        {isClinician && (
          <button
            type="button"
            onClick={() => setActiveTab("CLINICAL")}
            className={`pb-2.5 px-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "CLINICAL"
                ? "border-[#0E6251] text-[#0E6251] dark:border-[#48C9B0] dark:text-[#48C9B0]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {isAr ? `الملف الطبي والتشخيصات (${patient.diagnoses?.length || 0})` : `Clinical Records (${patient.diagnoses?.length || 0})`}
          </button>
        )}

        {/* Nutrition Tab (Nutritionist & Owner Only) */}
        {(currentRole === "NUTRITIONIST" || currentRole === "OWNER") && (
          <button
            type="button"
            onClick={() => setActiveTab("NUTRITION")}
            className={`pb-2.5 px-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "NUTRITION"
                ? "border-[#0E6251] text-[#0E6251] dark:border-[#48C9B0] dark:text-[#48C9B0]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {isAr ? "التغذية وInBody" : "Nutrition & InBody"}
          </button>
        )}

        {/* Activity Tab (Owner & Manager Only) */}
        {isOwnerOrManager && (
          <button
            type="button"
            onClick={() => setActiveTab("ACTIVITY")}
            className={`pb-2.5 px-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "ACTIVITY"
                ? "border-[#0E6251] text-[#0E6251] dark:border-[#48C9B0] dark:text-[#48C9B0]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {isAr ? "سجل التعديلات" : "Audit Activity"}
          </button>
        )}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "OVERVIEW" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 text-xs shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
              {isAr ? "البيانات الإدارية والاتصال" : "Demographics & Contact"}
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? "رقم المحمول الأساسي:" : "Mobile Phone:"}</span>
                <span className="font-mono font-semibold">{patient.mobilePhone || "— (مريض تابع)"}</span>
              </div>

              {patient.isDependent && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? "ولي الأمر:" : "Guardian Name:"}</span>
                    <span className="font-semibold">{patient.guardianName} ({patient.guardianRelation})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? "هاتف ولي الأمر:" : "Guardian Phone:"}</span>
                    <span className="font-mono font-semibold">{patient.guardianPhone}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? "رقم الواتساب:" : "WhatsApp Phone:"}</span>
                <span className="font-mono">{patient.whatsappPhone || "—"}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? "جهة الاتصال في الطوارئ:" : "Emergency Contact:"}</span>
                <span>{patient.emergencyContactName ? `${patient.emergencyContactName} (${patient.emergencyContactPhone || ""})` : "—"}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? "العنوان السكني:" : "Address:"}</span>
                <span>{patient.address || "—"}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 text-xs shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
              {isAr ? "بيانات الزيارة والإحالة" : "Visit & Clinical Overview"}
            </h3>

            <div className="space-y-2">
              <div>
                <span className="text-slate-500 block mb-0.5">{isAr ? "شكوى المريض الأساسية (استقبال):" : "Initial Complaint:"}</span>
                <p className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {patient.initialComplaint}
                </p>
              </div>

              <div className="flex justify-between pt-1">
                <span className="text-slate-500">{isAr ? "مصدر الإحالة:" : "Referral Source:"}</span>
                <span className="font-semibold">
                  {patient.referralSource}
                  {patient.referringDoctor && ` (${patient.referringDoctor})`}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? "أخصائي العلاج الطبيعي:" : "Physiotherapist:"}</span>
                <span className="font-semibold">{patient.assignedPhysiotherapist?.fullName || "—"}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? "أخصائي التغذية:" : "Nutritionist:"}</span>
                <span className="font-semibold">{patient.assignedNutritionist?.fullName || "—"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPOINTMENTS */}
      {activeTab === "APPOINTMENTS" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isAr ? "سجل المواعيد والزيارات" : "Appointments History"}
            </h3>
            <Link
              href={`/${locale}/reception/calendar?patientId=${patient.id}`}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#0E6251] text-white hover:bg-[#117A65]"
            >
              + {isAr ? "حجز موعد جديد" : "Book Appointment"}
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-start">{isAr ? "التاريخ" : "Date"}</th>
                  <th className="py-2.5 px-3 font-semibold text-start">{isAr ? "الوقت" : "Time"}</th>
                  <th className="py-2.5 px-3 font-semibold text-start">{isAr ? "نوع الجلسة" : "Session"}</th>
                  <th className="py-2.5 px-3 font-semibold text-start">{isAr ? "المعالج" : "Clinician"}</th>
                  <th className="py-2.5 px-3 font-semibold text-start">{isAr ? "الغرفة / السرير" : "Room / Bed"}</th>
                  <th className="py-2.5 px-3 font-semibold text-start">{isAr ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {!patient.appointments || patient.appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {isAr ? "لا توجد مواعيد سابقة أو قادمة مسجلة." : "No appointments recorded."}
                    </td>
                  </tr>
                ) : (
                  patient.appointments.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono">
                        {new Date(a.appointmentDate).toISOString().slice(0, 10)}
                      </td>
                      <td className="py-3 px-3 font-mono">{a.startTime} - {a.endTime}</td>
                      <td className="py-3 px-3 font-medium">{a.sessionType?.nameAr || a.sessionType?.code}</td>
                      <td className="py-3 px-3">{a.clinician?.fullName}</td>
                      <td className="py-3 px-3">{a.room?.nameAr} - {a.bed?.name}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PACKAGES */}
      {activeTab === "PACKAGES" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isAr ? "باقات الجلسات المشتراة" : "Treatment Packages"}
            </h3>
          </div>

          {!patient.packages || patient.packages.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              {isAr ? "لا توجد باقات علاجية للمريض حالياً." : "No active or past packages."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patient.packages.map((pkg: any) => (
                <div key={pkg.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{pkg.sessionType?.nameAr}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold">
                      {pkg.totalSessions} {isAr ? "جلسات" : "sessions"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>{isAr ? "تاريخ البداية:" : "Start Date:"}</span>
                    <span className="font-mono">{new Date(pkg.startDate).toISOString().slice(0, 10)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PAYMENTS & BILLING */}
      {activeTab === "PAYMENTS" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {isAr ? "سجل الفواتير والإيصالات" : "Charges & Payment Receipts"}
          </h3>

          {!patient.charges || patient.charges.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              {isAr ? "لا توجد حركات مالية مسجلة بعد." : "No financial transactions recorded."}
            </div>
          ) : (
            <div className="space-y-3">
              {patient.charges.map((c: any) => (
                <div key={c.id} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">{c.description || "مطالبة علاجية"}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className="font-bold font-mono text-[#0E6251]">
                    {(c.amountPiasters / 100).toFixed(2)} EGP
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DOCUMENTS (R-9.5-1) */}
      {activeTab === "DOCUMENTS" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isAr ? "المستندات والمرفقات" : "Patient Documents & Attachments"}
            </h3>

            <button
              type="button"
              onClick={() => setShowDocModal(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#0E6251] text-white hover:bg-[#117A65]"
            >
              + {isAr ? "رفع مستند جديد" : "Upload Document"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {!patient.documents || patient.documents.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400">
                {isAr ? "لا توجد مستندات مرفوعة بملف المريض." : "No documents uploaded."}
              </div>
            ) : (
              patient.documents.map((d: any) => (
                <div key={d.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{d.title}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {d.category}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 block font-mono">{d.fileName}</span>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">
                      {new Date(d.createdAt).toISOString().slice(0, 10)}
                    </span>

                    <a
                      href={`/api/documents/${d.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0E6251] dark:text-[#48C9B0] font-semibold hover:underline text-[11px]"
                    >
                      {isAr ? "عرض المستند" : "View"}
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: CLINICAL RECORDS & DIAGNOSES (Clinicians Only) */}
      {isClinician && activeTab === "CLINICAL" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isAr ? "التشخيصات والملف الطبي السريري" : "Clinical Diagnoses & Medical History"}
            </h3>

            {patient.canViewClinical ? (
              <button
                type="button"
                onClick={() => setShowDiagModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#0E6251] text-white hover:bg-[#117A65]"
              >
                + {isAr ? "إضافة تشخيص جديد" : "Add Diagnosis"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCoveringModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
              >
                🔒 {isAr ? "طلب صلاحية تغطية طبية" : "Request Covering Access"}
              </button>
            )}
          </div>

          {!patient.canViewClinical ? (
            <div className="p-8 text-center max-w-md mx-auto bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl my-4 space-y-2">
              <span className="text-2xl block">🔒</span>
              <h4 className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                {isAr ? "الملف السريري مخصص للمعالج الأساسي" : "Treating Clinician Privacy Guard"}
              </h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                {isAr
                  ? "للاطلاع على التشخيصات والملاحظات السريرية لهذا المريض، يلزم طلب صلاحية تغطية مؤقتة مع تبرير سريري موثق."
                  : "To view clinical notes for non-assigned patients, covering access with logged clinical justification is required."}
              </p>
              <button
                type="button"
                onClick={() => setShowCoveringModal(true)}
                className="mt-2 px-4 py-1.5 text-xs font-semibold rounded-md bg-amber-600 text-white"
              >
                {isAr ? "طلب صلاحية التغطية الآن" : "Request Covering Access"}
              </button>
            </div>
          ) : patient.diagnoses?.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              {isAr ? "لا توجد تشخيصات مسجلة للمريض بعد." : "No clinical diagnoses recorded."}
            </div>
          ) : (
            <div className="space-y-3">
              {patient.diagnoses.map((d: any) => (
                <div key={d.id} className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/20 text-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {d.diagnosisText}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {new Date(d.diagnosedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {d.notes && <p className="text-slate-700 dark:text-slate-300 text-xs">{d.notes}</p>}

                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                    <span>{isAr ? `المعالج: ${d.diagnosedByUser?.fullName || "—"}` : `Clinician: ${d.diagnosedByUser?.fullName}`}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {d.isActive ? (isAr ? "تشخيص نشط" : "Active") : (isAr ? "تم الشفاء" : "Resolved")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: NUTRITION & INBODY */}
      {(currentRole === "NUTRITIONIST" || currentRole === "OWNER") && activeTab === "NUTRITION" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm text-center py-12 text-xs text-slate-400">
          {isAr ? "قسم التغذية وقياسات InBody — جاهز لربط السجلات السريرية" : "Nutrition protocols & InBody charts module."}
        </div>
      )}

      {/* TAB 8: AUDIT ACTIVITY */}
      {isOwnerOrManager && activeTab === "ACTIVITY" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm text-center py-12 text-xs text-slate-400">
          {isAr ? "سجل العمليات والتدقيق لملف المريض (Audit Log)" : "Audit trail viewer for this patient record."}
        </div>
      )}

      {/* MODAL 1: Add Diagnosis */}
      {showDiagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
              {isAr ? "إضافة تشخيص سريري للمريض" : "Add Clinical Diagnosis"}
            </h3>

            <form onSubmit={handleAddDiagnosis} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "نص التشخيص الطبي" : "Diagnosis Statement"} *
                </label>
                <input
                  type="text"
                  required
                  value={diagnosisText}
                  onChange={(e) => setDiagnosisText(e.target.value)}
                  placeholder={isAr ? "مثال: انزلاق غضروفي قطني L4-L5" : "e.g. Lumbar disc herniation"}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "ملاحظات إضافية وتوصيات" : "Clinical Notes"}
                </label>
                <textarea
                  rows={2}
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDiagModal(false)}
                  className="px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingDiag}
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-[#0E6251] text-white hover:bg-[#117A65]"
                >
                  {savingDiag ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ التشخيص" : "Save Diagnosis")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Request Covering Access */}
      {showCoveringModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
              {isAr ? "طلب صلاحية تغطية طبية مؤقتة" : "Request Covering Access"}
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              {isAr
                ? "يتم توثيق هذا الإجراء وتبريره السريري في سجل الرقابة وتكون الصلاحية سارية لجلسة العمل الحالية فقط (بحد أقصى 12 ساعة) [R-1.1-21]."
                : "This request is logged in the audit trail with clinical reason and valid for current session (max 12h) [R-1.1-21]."}
            </p>

            <form onSubmit={handleGrantCovering} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "السبب السريري لطلب التغطية" : "Clinical Justification"} *
                </label>
                <textarea
                  required
                  rows={3}
                  value={coveringReason}
                  onChange={(e) => setCoveringReason(e.target.value)}
                  placeholder={isAr ? "مثال: المعالج الأساسي في إجازة، مطلوب مراجعة الأشعة لبدء جلسة تأهيل عاجلة..." : "Enter reason"}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCoveringModal(false)}
                  className="px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingCovering}
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-amber-600 text-white hover:bg-amber-700"
                >
                  {savingCovering ? (isAr ? "جارٍ التوثيق..." : "Granting...") : (isAr ? "توثيق التغطية وفتح الملف" : "Grant Access")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Upload Document */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
              {isAr ? "رفع مستند أو مرفق لملف المريض" : "Upload Patient Document"}
            </h3>

            <form onSubmit={handleUploadDoc} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "تصنيف المستند" : "Category"} *
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="ID_ADMINISTRATIVE">{isAr ? "إداري / بطاقة تحقيق شخصية" : "ID / Administrative"}</option>
                  <option value="PAYMENT_PROOF">{isAr ? "إثبات دفع / تحويل بنكي" : "Payment Proof"}</option>
                  {isClinician && (
                    <>
                      <option value="PRESCRIPTION">{isAr ? "روشتة طبية" : "Prescription"}</option>
                      <option value="X_RAY">{isAr ? "أشعة سينية (X-Ray)" : "X-Ray"}</option>
                      <option value="MRI">{isAr ? "رنين مغناطيسي (MRI)" : "MRI"}</option>
                      <option value="LAB_REPORT">{isAr ? "تقرير معمل / تحاليل" : "Lab Report"}</option>
                      <option value="REFERRAL">{isAr ? "تقرير إحالة" : "Referral"}</option>
                      <option value="OTHER">{isAr ? "أخرى سريرية" : "Other Clinical"}</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "عنوان المستند" : "Document Title"} *
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder={isAr ? "مثال: تقرير رنين قطني 2026" : "Title"}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "اسم الملف" : "File Name"}
                </label>
                <input
                  type="text"
                  value={docFileName}
                  onChange={(e) => setDocFileName(e.target.value)}
                  placeholder="scan_2026.pdf"
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingDoc}
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-[#0E6251] text-white hover:bg-[#117A65]"
                >
                  {savingDoc ? (isAr ? "جارٍ الحفظ..." : "Uploading...") : (isAr ? "حفظ المستند" : "Upload Document")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Discharge Patient */}
      {showDischargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
              {isAr ? "إنهاء البرنامج العلاجي (تخريج المريض)" : "Discharge Patient"}
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              {isAr
                ? "يتم تحويل حالة المريض إلى تم التخريج (DISCHARGED) مع حفظ كامل السجل الطبي. حجز موعد جديد يعيد تفعيل الملف [R-4.2-6]."
                : "Concludes treatment and sets status to DISCHARGED. Future booking will re-activate the file."}
            </p>

            <form onSubmit={handleDischarge} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "سبب إنهاء العلاج والتوصيات السريرية" : "Discharge Reason & Clinical Summary"} *
                </label>
                <textarea
                  required
                  rows={3}
                  value={dischargeReason}
                  onChange={(e) => setDischargeReason(e.target.value)}
                  placeholder={isAr ? "مثال: تحسن كامل في مدى الحركة واختفاء الألم، توصية بتمارين منزلية..." : "Discharge reason"}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDischargeModal(false)}
                  className="px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingDischarge}
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-slate-800 text-white hover:bg-slate-900"
                >
                  {savingDischarge ? (isAr ? "جارٍ التخريج..." : "Discharging...") : (isAr ? "تأكيد تخريج المريض" : "Confirm Discharge")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
