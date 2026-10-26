"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useRole } from "@/context/RoleContext";
import {
  createStaffAccountAction,
  listStaffAccountsAction,
  deactivateStaffAccountAction,
  activateStaffAccountAction,
} from "@/server/actions/staff";
import {
  ownerResetStaffPasswordAction,
  ownerResetStaffOtpAction,
  ownerRevokeStaffDevicesAction,
} from "@/server/actions/auth";

type StaffItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  role: "OWNER" | "MANAGER" | "RECEPTIONIST" | "PHYSIOTHERAPIST" | "NUTRITIONIST";
  isActive: boolean;
  otpStatus: "NOT_SET" | "PENDING" | "ACTIVE";
  mustChangePassword: boolean;
  canAssess: boolean;
  commissionType: "NONE" | "PERCENT" | "FIXED_PER_SESSION";
  commissionPercentBasisPoints: number;
  commissionFixedPiasters: number;
  createdAt: Date;
};

export default function AdminStaffPage() {
  const locale = useLocale();
  const { role: currentRole } = useRole();
  const isAr = locale === "ar";

  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [resetPasswordStaff, setResetPasswordStaff] = useState<StaffItem | null>(null);
  const [tempPassword, setTempPassword] = useState("MasaarTemp2026!");

  // New staff form state
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newRole, setNewRole] = useState<StaffItem["role"]>("RECEPTIONIST");
  const [newCanAssess, setNewCanAssess] = useState(false);
  const [newCommissionType, setNewCommissionType] = useState<"NONE" | "PERCENT" | "FIXED_PER_SESSION">("NONE");
  const [newCommissionPercent, setNewCommissionPercent] = useState<number>(0);
  const [newCommissionFixed, setNewCommissionFixed] = useState<number>(0);
  const [newPassword, setNewPassword] = useState("StaffPass123!");
  const [actionInProgress, setActionInProgress] = useState(false);

  const roleLabels: Record<string, { ar: string; en: string }> = {
    OWNER: { ar: "مالك العيادة", en: "Clinic Owner" },
    MANAGER: { ar: "مدير العيادة", en: "Clinic Manager" },
    RECEPTIONIST: { ar: "موظف استقبال", en: "Receptionist" },
    PHYSIOTHERAPIST: { ar: "أخصائي علاج طبيعي", en: "Physiotherapist" },
    NUTRITIONIST: { ar: "أخصائي تغذية علاجية", en: "Clinical Nutritionist" },
  };

  const otpStatusLabels: Record<string, { ar: string; en: string }> = {
    NOT_SET: { ar: "غير مفعّل", en: "Not Set" },
    PENDING: { ar: "بانتظار الإعداد", en: "Pending" },
    ACTIVE: { ar: "مفعّل 2FA", en: "Active 2FA" },
  };

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listStaffAccountsAction({});
      if (res.success && res.data) {
        setStaff(res.data as unknown as StaffItem[]);
      }
    } catch {
      setError(isAr ? "فشل تحميل قائمة العاملين." : "Failed to load staff list.");
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Guard for Owner Only (R-1.1-19)
  if (currentRole !== "OWNER") {
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
            ? "صفحة إدارة حسابات العاملين وصلاحيات الأمان مخصصة فقط لمالك العيادة (Clinic Owner)."
            : "Staff accounts and security administration is strictly restricted to the Clinic Owner."}
        </p>
      </div>
    );
  }

  // Handle Add Staff
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await createStaffAccountAction({
        fullName: newFullName,
        email: newEmail,
        phone: newPhone,
        jobTitle: newJobTitle,
        role: newRole,
        canAssess: newCanAssess,
        commissionType: newCommissionType,
        commissionPercentBasisPoints: Math.round(newCommissionPercent * 100),
        commissionFixedPiasters: Math.round(newCommissionFixed * 100),
        initialPassword: newPassword,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل إنشاء الحساب." : "Failed to create account."));
        return;
      }

      setSuccessMessage(
        isAr
          ? `تم إنشاء حساب ${newFullName} بنجاح. كلمة المرور المؤقتة هي: ${newPassword}`
          : `Account for ${newFullName} created successfully. Temporary password: ${newPassword}`
      );
      setShowAddModal(false);
      // Reset form
      setNewFullName("");
      setNewEmail("");
      setNewPhone("");
      setNewJobTitle("");
      fetchStaff();
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع." : "An unexpected error occurred.");
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordStaff) return;
    setActionInProgress(true);
    setError(null);

    try {
      const res = await ownerResetStaffPasswordAction({
        userId: resetPasswordStaff.id,
        temporaryPassword: tempPassword,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل إعادة تعيين كلمة المرور." : "Password reset failed."));
        return;
      }

      setSuccessMessage(
        isAr
          ? `تم تعيين كلمة مرور مؤقتة لـ ${resetPasswordStaff.fullName} بنجاح (${tempPassword}). سيُطلب منه تغييرها عند الدخول.`
          : `Temporary password set for ${resetPasswordStaff.fullName} successfully (${tempPassword}).`
      );
      setResetPasswordStaff(null);
      fetchStaff();
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع." : "Unexpected error.");
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle Reset 2FA
  const handleResetOtp = async (staffMember: StaffItem) => {
    if (!confirm(isAr ? `هل أنت متأكد من إعادة تعيين التحقق الثنائي لـ ${staffMember.fullName}؟` : `Reset 2FA for ${staffMember.fullName}?`)) {
      return;
    }
    setActionInProgress(true);
    try {
      const res = await ownerResetStaffOtpAction({ userId: staffMember.id });
      if (res.success) {
        setSuccessMessage(isAr ? `تمت إعادة تعيين التحقق الثنائي لـ ${staffMember.fullName}.` : `2FA reset for ${staffMember.fullName}.`);
        fetchStaff();
      } else {
        setError(res.error?.message);
      }
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle Revoke Devices
  const handleRevokeDevices = async (staffMember: StaffItem) => {
    setActionInProgress(true);
    try {
      const res = await ownerRevokeStaffDevicesAction({ userId: staffMember.id });
      if (res.success) {
        setSuccessMessage(isAr ? `تم إلغاء كافة الأجهزة الموثوقة لـ ${staffMember.fullName}.` : `Trusted devices revoked for ${staffMember.fullName}.`);
        fetchStaff();
      } else {
        setError(res.error?.message);
      }
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle Deactivate / Activate
  const handleToggleActive = async (staffMember: StaffItem) => {
    setActionInProgress(true);
    try {
      if (staffMember.isActive) {
        if (!confirm(isAr ? `تعطيل حساب ${staffMember.fullName}؟ لن يتمكن من تسجيل الدخول وسيتم إنهاء جلساته فوراً.` : `Deactivate ${staffMember.fullName}?`)) {
          setActionInProgress(false);
          return;
        }
        const res = await deactivateStaffAccountAction({ userId: staffMember.id });
        if (res.success) {
          setSuccessMessage(isAr ? `تم تعطيل حساب ${staffMember.fullName}.` : `Deactivated ${staffMember.fullName}.`);
          fetchStaff();
        } else {
          setError(res.error?.message);
        }
      } else {
        const res = await activateStaffAccountAction({ userId: staffMember.id });
        if (res.success) {
          setSuccessMessage(isAr ? `تمت إعادة تفعيل حساب ${staffMember.fullName}.` : `Activated ${staffMember.fullName}.`);
          fetchStaff();
        } else {
          setError(res.error?.message);
        }
      }
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {isAr ? "إدارة حسابات العاملين والصلاحيات" : "Staff Accounts & Access Control"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? "إنشاء حسابات الموظفين، ضبط العمولات، إدارة كلمات المرور وإعادة ضبط التحقق الثنائي (2FA)"
              : "Create staff accounts, set commissions, manage temporary passwords and 2FA resets"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0E6251] text-white hover:bg-[#117A65] shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{isAr ? "إضافة موظف جديد" : "Add New Staff"}</span>
        </button>
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

      {/* Staff Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-3 px-4 text-start font-semibold">{isAr ? "الموظف" : "Staff Member"}</th>
                <th className="py-3 px-4 text-start font-semibold">{isAr ? "الدور الوظيفي" : "Role"}</th>
                <th className="py-3 px-4 text-start font-semibold">{isAr ? "بيانات التواصل" : "Contact"}</th>
                <th className="py-3 px-4 text-start font-semibold">{isAr ? "الحالة" : "Status"}</th>
                <th className="py-3 px-4 text-start font-semibold">{isAr ? "الأمان والـ 2FA" : "Security / 2FA"}</th>
                <th className="py-3 px-4 text-end font-semibold">{isAr ? "إجراءات المالك" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {isAr ? "جارٍ تحميل البيانات..." : "Loading staff..."}
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {isAr ? "لا يوجد موظفون مسجلون." : "No staff accounts found."}
                  </td>
                </tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{s.fullName}</div>
                      <div className="text-[11px] text-slate-500">{s.jobTitle}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-[#0E6251]/10 text-[#0E6251] dark:bg-[#48C9B0]/20 dark:text-[#48C9B0]">
                        {isAr ? roleLabels[s.role]?.ar || s.role : roleLabels[s.role]?.en || s.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{s.email}</div>
                      <div className="text-[11px] text-slate-500" dir="ltr">{s.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      {s.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          {isAr ? "نشط" : "Active"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                          {isAr ? "معطّل" : "Deactivated"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px]">
                          {isAr ? otpStatusLabels[s.otpStatus]?.ar : otpStatusLabels[s.otpStatus]?.en}
                        </span>
                        {s.mustChangePassword && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            {isAr ? "• يلزم تغيير كلمة المرور" : "• Must change password"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-end">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Work Schedules for Clinicians */}
                        {(s.role === "PHYSIOTHERAPIST" || s.role === "NUTRITIONIST") && (
                          <Link
                            href={`/${locale}/management/staff-schedules?userId=${s.id}`}
                            className="px-2 py-1 text-[11px] font-semibold rounded border border-teal-200 text-[#0E6251] dark:border-teal-800 dark:text-[#48C9B0] hover:bg-teal-50 dark:hover:bg-teal-950/40 inline-flex items-center gap-1"
                            title={isAr ? "مواعيد العمل" : "Work Schedules"}
                          >
                            <span>📅</span>
                            <span>{isAr ? "مواعيد العمل" : "Schedules"}</span>
                          </Link>
                        )}

                        {/* Reset Password Button */}
                        <button
                          type="button"
                          onClick={() => setResetPasswordStaff(s)}
                          disabled={actionInProgress}
                          title={isAr ? "إعادة تعيين كلمة المرور" : "Reset Password"}
                          className="px-2 py-1 text-[11px] font-medium rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {isAr ? "كلمة المرور" : "Password"}
                        </button>

                        {/* Reset 2FA Button */}
                        <button
                          type="button"
                          onClick={() => handleResetOtp(s)}
                          disabled={actionInProgress}
                          title={isAr ? "إعادة تعيين التحقق الثنائي" : "Reset 2FA"}
                          className="px-2 py-1 text-[11px] font-medium rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {isAr ? "2FA" : "2FA"}
                        </button>

                        {/* Revoke Devices */}
                        <button
                          type="button"
                          onClick={() => handleRevokeDevices(s)}
                          disabled={actionInProgress}
                          title={isAr ? "إلغاء الأجهزة الموثوقة" : "Revoke Devices"}
                          className="px-2 py-1 text-[11px] font-medium rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {isAr ? "الأجهزة" : "Devices"}
                        </button>

                        {/* Deactivate / Activate Button */}
                        {s.role !== "OWNER" && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(s)}
                            disabled={actionInProgress}
                            className={`px-2 py-1 text-[11px] font-medium rounded border ${
                              s.isActive
                                ? "border-red-200 text-red-600 dark:border-red-900/60 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                                : "border-emerald-200 text-emerald-600 dark:border-emerald-900/60 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            }`}
                          >
                            {s.isActive ? (isAr ? "تعطيل" : "Deactivate") : (isAr ? "تفعيل" : "Activate")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Add New Staff Member */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl my-8">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
              {isAr ? "إضافة موظف جديد إلى العيادة" : "Add New Staff Member"}
            </h2>

            <form onSubmit={handleAddStaffSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "الاسم الكامل" : "Full Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "البريد الإلكتروني" : "Email Address"}
                  </label>
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "رقم الهاتف" : "Phone Number"}
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "المسمى الوظيفي" : "Job Title"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    placeholder="أخصائي علاج طبيعي أول"
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "الدور الوظيفي والصلاحيات" : "Role & Permissions"}
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as StaffItem["role"])}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                  >
                    <option value="RECEPTIONIST">{isAr ? "موظف استقبال (Receptionist)" : "Receptionist"}</option>
                    <option value="PHYSIOTHERAPIST">{isAr ? "أخصائي علاج طبيعي (Physiotherapist)" : "Physiotherapist"}</option>
                    <option value="NUTRITIONIST">{isAr ? "أخصائي تغذية علاجية (Nutritionist)" : "Nutritionist"}</option>
                    <option value="MANAGER">{isAr ? "مدير عيادة (Clinic Manager)" : "Clinic Manager"}</option>
                    <option value="OWNER">{isAr ? "مالك عيادة شريك (Owner)" : "Clinic Owner"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "كلمة المرور المبدئية (8 أحرف فأكثر)" : "Initial Password (min 8 chars)"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                  />
                </div>
              </div>

              {/* Clinician Specific Options */}
              {newRole === "PHYSIOTHERAPIST" && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="canAssess"
                      checked={newCanAssess}
                      onChange={(e) => setNewCanAssess(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0E6251]"
                    />
                    <label htmlFor="canAssess" className="text-xs text-slate-700 dark:text-slate-300">
                      {isAr ? "مخول بإجراء الكشف الأولي وجلسات التقييم (Consultant / Assessment)" : "Authorized for Consultant Initial Assessments"}
                    </label>
                  </div>
                </div>
              )}

              {/* Commission Options */}
              {(newRole === "PHYSIOTHERAPIST" || newRole === "NUTRITIONIST") && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {isAr ? "نظام العمولة المستحقة للمعالج" : "Clinician Commission Scheme"}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <select
                        value={newCommissionType}
                        onChange={(e) => setNewCommissionType(e.target.value as "NONE" | "PERCENT" | "FIXED_PER_SESSION")}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        <option value="NONE">{isAr ? "بدون عمولة" : "No Commission"}</option>
                        <option value="PERCENT">{isAr ? "نسبة مئوية (%)" : "Percentage (%)"}</option>
                        <option value="FIXED_PER_SESSION">{isAr ? "مبلغ ثابت لكل جلسة (ج.م)" : "Fixed EGP per session"}</option>
                      </select>
                    </div>

                    {newCommissionType === "PERCENT" && (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        placeholder={isAr ? "النسبة مثلاً 25%" : "Percent e.g. 25%"}
                        value={newCommissionPercent}
                        onChange={(e) => setNewCommissionPercent(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    )}

                    {newCommissionType === "FIXED_PER_SESSION" && (
                      <input
                        type="number"
                        min="0"
                        step="10"
                        placeholder={isAr ? "المبلغ بالجنيه" : "Amount in EGP"}
                        value={newCommissionFixed}
                        onChange={(e) => setNewCommissionFixed(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-[#0E6251] text-white hover:bg-[#117A65] disabled:opacity-50"
                >
                  {actionInProgress ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "إنشاء الحساب" : "Create Account")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Reset Staff Password */}
      {resetPasswordStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
              {isAr ? "تعيين كلمة مرور مؤقتة" : "Set Temporary Password"}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {isAr
                ? `سيتم تعيين كلمة مرور مؤقتة للموظف (${resetPasswordStaff.fullName}). سيُجبر الموظف على تعيين كلمة مرور جديدة عند تسجيل دخوله القادم، كما سيتم إنهاء كافة جلساته الحالية فوراً.`
                : `Set a temporary password for ${resetPasswordStaff.fullName}. They will be forced to change it upon login.`}
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "كلمة المرور المؤقتة الجديدة" : "New Temporary Password"}
                </label>
                <input
                  type="text"
                  required
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordStaff(null)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-[#0E6251] text-white hover:bg-[#117A65] disabled:opacity-50"
                >
                  {actionInProgress ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "تأكيد وإعادة التعيين" : "Confirm Reset")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
