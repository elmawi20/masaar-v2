"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useRole } from "@/context/RoleContext";
import {
  registerPatientAction,
  searchPatientsAction,
} from "@/server/actions/patients";
import { listStaffAccountsAction } from "@/server/actions/staff";
import {
  Gender,
  PreferredLanguage,
  ReferralSource,
  GuardianRelation,
  PatientStatus,
} from "@prisma/client";
import { normalizeEgyptianPhone } from "@/domain/patients/phone";
import { areArabicNamesSimilar } from "@/domain/patients/arabicName";
import { calculatePatientAge } from "@/domain/patients/age";

type PatientItem = {
  id: string;
  fileNumber: number;
  fullName: string;
  mobilePhone: string | null;
  isDependent: boolean;
  guardianName: string | null;
  guardianRelation: GuardianRelation | null;
  guardianPhone: string | null;
  dateOfBirth: Date | string;
  gender: Gender;
  status: PatientStatus;
  hasAnyAlert: boolean;
  initialComplaint: string;
  preferredLanguage: PreferredLanguage;
};

type StaffOption = {
  id: string;
  fullName: string;
  role: string;
};

export default function PatientsDirectoryPage() {
  const locale = useLocale();
  const { role: currentRole } = useRole();
  const isAr = locale === "ar";

  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Registration Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clinicians, setClinicians] = useState<StaffOption[]>([]);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [isDependent, setIsDependent] = useState(false);
  const [mobilePhone, setMobilePhone] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelation, setGuardianRelation] = useState<GuardianRelation>(GuardianRelation.FATHER);
  const [guardianPhone, setGuardianPhone] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("1995-01-01");
  const [gender, setGender] = useState<Gender>(Gender.MALE);
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<PreferredLanguage>(PreferredLanguage.AR);
  const [referralSource, setReferralSource] = useState<ReferralSource>(ReferralSource.WALK_IN);
  const [referralSourceDetails, setReferralSourceDetails] = useState("");
  const [referringDoctor, setReferringDoctor] = useState("");
  const [initialComplaint, setInitialComplaint] = useState("");

  // Medical Alerts
  const [hasDiabetes, setHasDiabetes] = useState(false);
  const [hasPacemaker, setHasPacemaker] = useState(false);
  const [hasHypertension, setHasHypertension] = useState(false);
  const [hasOsteoporosis, setHasOsteoporosis] = useState(false);
  const [hasFallRisk, setHasFallRisk] = useState(false);
  const [isPregnant, setIsPregnant] = useState(false);
  const [medicalAlertsNotes, setMedicalAlertsNotes] = useState("");

  // Assigned Clinicians
  const [assignedPhysioId, setAssignedPhysioId] = useState("");
  const [assignedNutriId, setAssignedNutriId] = useState("");

  // Consents (R-4.1-20, R-4.1-21)
  const [dataConsent, setDataConsent] = useState(true);
  const [whatsappConsent, setWhatsappConsent] = useState(true);

  // Soft Warnings & Duplicate Info
  const [similarWarning, setSimilarWarning] = useState<string | null>(null);
  const [duplicatePatientId, setDuplicatePatientId] = useState<string | null>(null);

  // Fetch Patients
  const fetchPatients = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await searchPatientsAction({ query: query || " " });
      if (res.success && res.data) {
        setPatients(res.data as unknown as PatientItem[]);
      }
    } catch {
      setError(isAr ? "فشل تحميل دليل المرضى." : "Failed to load patients.");
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    fetchPatients(searchQuery);
  }, [searchQuery, fetchPatients]);

  // Load Clinicians for Assignment Dropdowns
  useEffect(() => {
    async function loadClinicians() {
      try {
        const res = await listStaffAccountsAction({});
        if (res.success && res.data) {
          const staff = res.data as unknown as StaffOption[];
          setClinicians(staff);
        }
      } catch {
        // optional
      }
    }
    loadClinicians();
  }, []);

  // Live Similar Name Check (R-4.2-5)
  useEffect(() => {
    if (!fullName.trim() || fullName.length < 3) {
      setSimilarWarning(null);
      return;
    }

    const found = patients.find((p) => areArabicNamesSimilar(p.fullName, fullName));
    if (found && found.fullName !== fullName) {
      setSimilarWarning(
        isAr
          ? `تنبيه: يوجد مريض مسجل باسم مشابه ("${found.fullName}")`
          : `Notice: Existing patient with similar name ("${found.fullName}")`
      );
    } else {
      setSimilarWarning(null);
    }
  }, [fullName, patients, isAr]);

  // Live Age Calculation
  let calculatedAge: number | null = null;
  try {
    if (dateOfBirth) {
      calculatedAge = calculatePatientAge(new Date(dateOfBirth));
    }
  } catch {
    calculatedAge = null;
  }

  // Handle Register Patient Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setDuplicatePatientId(null);

    try {
      const res = await registerPatientAction({
        fullName,
        isDependent,
        mobilePhone: isDependent ? null : mobilePhone,
        guardianName: isDependent ? guardianName : null,
        guardianRelation: isDependent ? guardianRelation : null,
        guardianPhone: isDependent ? guardianPhone : null,
        whatsappPhone: whatsappPhone || null,
        dateOfBirth,
        gender,
        address: address || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        preferredLanguage,
        referralSource,
        referralSourceDetails: referralSourceDetails || null,
        referringDoctor: referringDoctor || null,
        initialComplaint,
        hasDiabetes,
        hasPacemaker,
        hasHypertension,
        hasOsteoporosis,
        hasFallRisk,
        isPregnant,
        medicalAlertsNotes: medicalAlertsNotes || null,
        assignedPhysiotherapistId: assignedPhysioId || null,
        assignedNutritionistId: assignedNutriId || null,
        dataConsent,
        whatsappConsent,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل تسجيل المريض." : "Failed to register patient."));
        return;
      }

      setSuccessMessage(isAr ? "تم تسجيل المريض وفتح الملف بنجاح." : "Patient registered successfully.");
      setShowAddModal(false);
      resetForm();
      fetchPatients("");
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع." : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFullName("");
    setIsDependent(false);
    setMobilePhone("");
    setGuardianName("");
    setGuardianPhone("");
    setWhatsappPhone("");
    setDateOfBirth("1995-01-01");
    setGender(Gender.MALE);
    setAddress("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setInitialComplaint("");
    setHasDiabetes(false);
    setHasPacemaker(false);
    setHasHypertension(false);
    setHasOsteoporosis(false);
    setHasFallRisk(false);
    setIsPregnant(false);
    setMedicalAlertsNotes("");
    setDataConsent(true);
    setWhatsappConsent(true);
  };

  // Filtered List
  const filteredPatients = patients.filter((p) => {
    if (statusFilter === "ALL") return true;
    return p.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {isAr ? "سجل وملفات المرضى" : "Patients Directory & Medical Records"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? "البحث عن المرضى بالاسم أو رقم المحمول، وتسجيل المرضى الجدد والمرافقين مع فحص التشابه والتنبيهات الطبية"
              : "Search patients by name or phone, register new adult/dependent patients with phone normalization and duplicate checks."}
          </p>
        </div>

        {/* Action Button: Register Patient (Owner, Manager, Receptionist) */}
        {(currentRole === "OWNER" || currentRole === "MANAGER" || currentRole === "RECEPTIONIST") && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0E6251] text-white hover:bg-[#117A65] shadow-sm transition-colors"
          >
            <span>+</span>
            <span>{isAr ? "تسجيل مريض جديد" : "New Patient"}</span>
          </button>
        )}
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

      {/* Search & Filters Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "ابحث بالاسم الكامل أو رقم المحمول / هاتف ولي الأمر..." : "Search by name, mobile, or guardian phone..."}
            className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-e-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: "ALL", ar: "الكل", en: "All" },
            { id: "LEAD", ar: "عملاء محتملون (جدد)", en: "Leads" },
            { id: "ACTIVE", ar: "نشطون", en: "Active" },
            { id: "DISCHARGED", ar: "تم إنهاء علاجهم", en: "Discharged" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusFilter === st.id
                  ? "bg-[#0E6251] text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {isAr ? st.ar : st.en}
            </button>
          ))}
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold text-start">{isAr ? "رقم الملف" : "File #"}</th>
                <th className="py-3 px-4 font-semibold text-start">{isAr ? "اسم المريض" : "Patient Name"}</th>
                <th className="py-3 px-4 font-semibold text-start">{isAr ? "رقم التواصل" : "Contact Phone"}</th>
                <th className="py-3 px-4 font-semibold text-start">{isAr ? "العمر / النوع" : "Age / Gender"}</th>
                <th className="py-3 px-4 font-semibold text-start">{isAr ? "الحالة" : "Status"}</th>
                <th className="py-3 px-4 font-semibold text-start">{isAr ? "تنبيهات" : "Alerts"}</th>
                <th className="py-3 px-4 font-semibold text-end">{isAr ? "الإجراء" : "Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {isAr ? "جارٍ تحميل سجلات المرضى..." : "Loading patients..."}
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {isAr ? "لا توجد ملفات مرضى مطابقة للبحث." : "No matching patient files found."}
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => {
                  let ageDisplay = "—";
                  try {
                    ageDisplay = `${calculatePatientAge(new Date(p.dateOfBirth))} ${isAr ? "سنة" : "y/o"}`;
                  } catch {
                    // fallback
                  }

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        M-{p.fileNumber.toString().padStart(4, "0")}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {p.fullName}
                        {p.isDependent && (
                          <span className="ms-2 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            {isAr ? "مريض تابع" : "Dependent"}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {p.isDependent ? (
                          <div>
                            <span className="text-slate-900 dark:text-slate-100">{p.guardianPhone || "—"}</span>
                            <span className="block text-[10px] text-slate-400">
                              {isAr ? `ولي الأمر: ${p.guardianName || "—"}` : `Guardian: ${p.guardianName || "—"}`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-900 dark:text-slate-100">{p.mobilePhone || "—"}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span>{ageDisplay}</span>
                        <span className="text-slate-400 text-[11px] ms-1">
                          ({p.gender === "MALE" ? (isAr ? "ذكر" : "M") : (isAr ? "أنثى" : "F")})
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : p.status === "DISCHARGED"
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}
                        >
                          {p.status === "LEAD"
                            ? (isAr ? "مسجل جديد" : "Lead")
                            : p.status === "ACTIVE"
                            ? (isAr ? "نشط" : "Active")
                            : (isAr ? "تم التخريج" : "Discharged")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {p.hasAnyAlert ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
                            ⚠️ {isAr ? "تنبيه طبي" : "Medical Alert"}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-end">
                        <Link
                          href={`/${locale}/reception/patients/${p.id}`}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-[#0E6251] text-[#0E6251] dark:border-[#48C9B0] dark:text-[#48C9B0] hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
                        >
                          {isAr ? "فتح الملف" : "Open File"}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Register New Patient (R-4.1-1 to R-4.1-21) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl my-8">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              {isAr ? "تسجيل مريض جديد وفتح ملف" : "Register New Patient File"}
            </h2>

            {similarWarning && (
              <div className="p-3 mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs">
                {similarWarning}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Full Name & Dependent Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "الاسم الكامل (رباعي)" : "Full Name"} *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isAr ? "مثال: أحمد محمد علي حسن" : "Full patient name"}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={isDependent}
                      onChange={(e) => setIsDependent(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0E6251]"
                    />
                    <span>{isAr ? "مريض تابع (طفل / مسن)" : "Dependent (Child/Elderly)"}</span>
                  </label>
                </div>
              </div>

              {/* Phone Fields */}
              {isDependent ? (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? "اسم ولي الأمر" : "Guardian Name"} *
                    </label>
                    <input
                      type="text"
                      required
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder={isAr ? "اسم الأب / الأم" : "Parent / Guardian name"}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? "صلة القرابة" : "Relationship"} *
                    </label>
                    <select
                      value={guardianRelation}
                      onChange={(e) => setGuardianRelation(e.target.value as GuardianRelation)}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="FATHER">{isAr ? "أب" : "Father"}</option>
                      <option value="MOTHER">{isAr ? "أم" : "Mother"}</option>
                      <option value="SON">{isAr ? "ابن" : "Son"}</option>
                      <option value="DAUGHTER">{isAr ? "ابنة" : "Daughter"}</option>
                      <option value="SPOUSE">{isAr ? "زوج / زوجة" : "Spouse"}</option>
                      <option value="OTHER">{isAr ? "آخر" : "Other"}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? "رقم محمول ولي الأمر" : "Guardian Mobile"} *
                    </label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? "رقم المحمول المصري" : "Mobile Phone"} *
                    </label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      value={mobilePhone}
                      onChange={(e) => setMobilePhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? "رقم الواتساب (اختياري، يطابق المحمول)" : "WhatsApp Phone (Optional)"}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* DOB, Gender & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "تاريخ الميلاد" : "Date of Birth"} *
                    {calculatedAge !== null && (
                      <span className="ms-1 text-[#0E6251] font-bold">({calculatedAge} {isAr ? "سنة" : "y/o"})</span>
                    )}
                  </label>
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "النوع" : "Gender"} *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="MALE">{isAr ? "ذكر" : "Male"}</option>
                    <option value="FEMALE">{isAr ? "أنثى" : "Female"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "اللغة المفضلة" : "Preferred Language"}
                  </label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value as PreferredLanguage)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="AR">العربية (Default)</option>
                    <option value="EN">English</option>
                  </select>
                </div>
              </div>

              {/* Referral Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "مصدر الإحالة / التعرف على العيادة" : "Referral Source"} *
                  </label>
                  <select
                    value={referralSource}
                    onChange={(e) => setReferralSource(e.target.value as ReferralSource)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="DOCTOR">{isAr ? "تحويل من طبيب" : "Doctor Referral"}</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="GOOGLE">Google Search / Maps</option>
                    <option value="FRIEND_FAMILY">{isAr ? "ترشيح من صديق / عائلة" : "Friend / Family"}</option>
                    <option value="WALK_IN">{isAr ? "زيارة مباشرة" : "Walk-in"}</option>
                    <option value="OTHER">{isAr ? "أخرى" : "Other"}</option>
                  </select>
                </div>

                {referralSource === "DOCTOR" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? "اسم الطبيب المحوّل" : "Referring Doctor"}
                    </label>
                    <input
                      type="text"
                      value={referringDoctor}
                      onChange={(e) => setReferringDoctor(e.target.value)}
                      placeholder={isAr ? "د. فلان الفلاني" : "Doctor name"}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? "تفاصيل إضافية عن المصدر" : "Referral Details"}
                    </label>
                    <input
                      type="text"
                      value={referralSourceDetails}
                      onChange={(e) => setReferralSourceDetails(e.target.value)}
                      placeholder={isAr ? "ملاحظة اختيارية" : "Optional details"}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Initial Complaint */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "الشكوى الأساسية / سبب الزيارة (ملحوظة استقبال)" : "Initial Complaint / Reason for Visit"} *
                </label>
                <textarea
                  required
                  rows={2}
                  value={initialComplaint}
                  onChange={(e) => setInitialComplaint(e.target.value)}
                  placeholder={isAr ? "مثال: ألم في أسفل الظهر يمتد للساق منذ أسبوعين، تحسن قليل مع المسكنات..." : "Describe the reason for visit"}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              {/* Medical Alerts (R-4.1-16) */}
              <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 space-y-2">
                <span className="text-xs font-bold text-red-800 dark:text-red-300 block">
                  {isAr ? "التنبيهات والمحاذير الطبية (تظهر مؤشراتها للاستقبال وتفاصيلها للأطباء)" : "Medical Alerts & Precautions"}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={hasDiabetes} onChange={(e) => setHasDiabetes(e.target.checked)} />
                    <span>{isAr ? "سكري" : "Diabetes"}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={hasPacemaker} onChange={(e) => setHasPacemaker(e.target.checked)} />
                    <span className="font-bold text-red-600 dark:text-red-400">{isAr ? "منظم ضربات قلب" : "Pacemaker"}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={hasHypertension} onChange={(e) => setHasHypertension(e.target.checked)} />
                    <span>{isAr ? "ضغط دم مرتفع" : "Hypertension"}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={hasOsteoporosis} onChange={(e) => setHasOsteoporosis(e.target.checked)} />
                    <span>{isAr ? "هشاشة عظام" : "Osteoporosis"}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={hasFallRisk} onChange={(e) => setHasFallRisk(e.target.checked)} />
                    <span>{isAr ? "خطر السقوط" : "Fall Risk"}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={isPregnant} onChange={(e) => setIsPregnant(e.target.checked)} />
                    <span>{isAr ? "حمل" : "Pregnancy"}</span>
                  </label>
                </div>

                <div>
                  <input
                    type="text"
                    value={medicalAlertsNotes}
                    onChange={(e) => setMedicalAlertsNotes(e.target.value)}
                    placeholder={isAr ? "ملاحظات طبية سريرية خاصة بالتنبيهات (للأطباء فقط)..." : "Clinicians-only alert notes..."}
                    className="w-full px-3 py-1 text-xs rounded-md border border-red-300 dark:border-red-900 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Assigned Clinicians */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "أخصائي العلاج الطبيعي المخصص" : "Assigned Physiotherapist"}
                  </label>
                  <select
                    value={assignedPhysioId}
                    onChange={(e) => setAssignedPhysioId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="">{isAr ? "-- بدون تخصيص مسبق --" : "-- None --"}</option>
                    {clinicians
                      .filter((c) => c.role === "PHYSIOTHERAPIST" || c.role === "OWNER")
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.fullName}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "أخصائي التغذية العلاجية المخصص" : "Assigned Nutritionist"}
                  </label>
                  <select
                    value={assignedNutriId}
                    onChange={(e) => setAssignedNutriId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="">{isAr ? "-- بدون تخصيص مسبق --" : "-- None --"}</option>
                    {clinicians
                      .filter((c) => c.role === "NUTRITIONIST" || c.role === "OWNER")
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.fullName}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Consents (R-4.1-20, R-4.1-21) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="flex items-start gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    required
                    checked={dataConsent}
                    onChange={(e) => setDataConsent(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0E6251] mt-0.5"
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {isAr
                      ? "إقرار موافقة المريض الصريحة على معالجة البيانات الطبية الشخصية داخل نظام العيادة [إلزامي]"
                      : "Mandatory patient consent for medical data processing [Required]"}
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={whatsappConsent}
                    onChange={(e) => setWhatsappConsent(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0E6251] mt-0.5"
                  />
                  <span className="text-slate-600 dark:text-slate-400">
                    {isAr
                      ? "الموافقة على استلام تذكيرات المواعيد ورسائل المتابعة عبر الواتساب"
                      : "Consent to receive appointment reminders and follow-ups via WhatsApp"}
                  </span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#0E6251] text-white hover:bg-[#117A65] shadow-sm disabled:opacity-50"
                >
                  {saving ? (isAr ? "جارٍ الحفظ..." : "Registering...") : (isAr ? "حفظ وفتح الملف" : "Register Patient")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
