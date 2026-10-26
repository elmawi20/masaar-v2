"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { useRole } from "@/context/RoleContext";
import {
  getClinicSettingsAction,
  updateClinicSettingsAction,
  getOpeningHoursAction,
  updateOpeningHoursAction,
  listClosuresAction,
  createClosureAction,
  toggleClosureAction,
  listSessionTypesAction,
  createSessionTypeAction,
  toggleSessionTypeAction,
} from "@/server/actions/clinic";

type SettingTab = "PROFILE" | "HOURS" | "CLOSURES" | "SESSIONS";

type DayHour = {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

type ClosureItem = {
  id: string;
  closureDate: Date;
  reasonAr: string;
  reasonEn: string;
  isActive: boolean;
};

type SessionTypeItem = {
  id: string;
  code: string;
  category: "PHYSIOTHERAPY" | "NUTRITION" | "CONSULTANT_ASSESSMENT";
  nameAr: string;
  nameEn: string;
  defaultDurationMinutes: number;
  defaultPricePiasters: number;
  isActive: boolean;
};

export default function AdminSettingsPage() {
  const locale = useLocale();
  const { role: currentRole } = useRole();
  const isAr = locale === "ar";

  const [activeTab, setActiveTab] = useState<SettingTab>("PROFILE");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Profile State (R-2-1, R-2-6, R-2-7, R-2-8)
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [addressAr, setAddressAr] = useState("");
  const [addressEn, setAddressEn] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [defaultPackageExpiryDays, setDefaultPackageExpiryDays] = useState(60);
  const [doctorDailySoftLimit, setDoctorDailySoftLimit] = useState(10);
  const [receiptPrefix, setReceiptPrefix] = useState("INV");

  // 2. Opening Hours State (R-2-2)
  const weekdayNames = [
    { id: 0, ar: "السبت", en: "Saturday" },
    { id: 1, ar: "الأحد", en: "Sunday" },
    { id: 2, ar: "الإثنين", en: "Monday" },
    { id: 3, ar: "الثلاثاء", en: "Tuesday" },
    { id: 4, ar: "الأربعاء", en: "Wednesday" },
    { id: 5, ar: "الخميس", en: "Thursday" },
    { id: 6, ar: "الجمعة", en: "Friday" },
  ];

  const [openingHours, setOpeningHours] = useState<DayHour[]>([
    { dayOfWeek: 0, isOpen: true, openTime: "09:00", closeTime: "21:00" },
    { dayOfWeek: 1, isOpen: true, openTime: "09:00", closeTime: "21:00" },
    { dayOfWeek: 2, isOpen: true, openTime: "09:00", closeTime: "21:00" },
    { dayOfWeek: 3, isOpen: true, openTime: "09:00", closeTime: "21:00" },
    { dayOfWeek: 4, isOpen: true, openTime: "09:00", closeTime: "21:00" },
    { dayOfWeek: 5, isOpen: true, openTime: "09:00", closeTime: "21:00" },
    { dayOfWeek: 6, isOpen: false, openTime: "09:00", closeTime: "21:00" },
  ]);

  // 3. Closures State (R-2-3)
  const [closures, setClosures] = useState<ClosureItem[]>([]);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [newClosureDate, setNewClosureDate] = useState("");
  const [newReasonAr, setNewReasonAr] = useState("");
  const [newReasonEn, setNewReasonEn] = useState("");

  // 4. Session Types State (R-2-5)
  const [sessionTypes, setSessionTypes] = useState<SessionTypeItem[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newCategory, setNewCategory] = useState<SessionTypeItem["category"]>("PHYSIOTHERAPY");
  const [newSessionNameAr, setNewSessionNameAr] = useState("");
  const [newSessionNameEn, setNewSessionNameEn] = useState("");
  const [newDuration, setNewDuration] = useState(45);
  const [newPriceEgp, setNewPriceEgp] = useState(350);

  // Fetch all settings data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, hoursRes, closuresRes, sessionsRes] = await Promise.all([
        getClinicSettingsAction({}),
        getOpeningHoursAction({}),
        listClosuresAction({}),
        listSessionTypesAction({}),
      ]);

      if (settingsRes.success && settingsRes.data) {
        setNameAr(settingsRes.data.nameAr);
        setNameEn(settingsRes.data.nameEn);
        setAddressAr(settingsRes.data.addressAr || "");
        setAddressEn(settingsRes.data.addressEn || "");
        setPhone(settingsRes.data.phone);
        setLogoUrl(settingsRes.data.logoUrl || "");
        setDefaultPackageExpiryDays(settingsRes.data.defaultPackageExpiryDays);
        setDoctorDailySoftLimit(settingsRes.data.doctorDailySoftLimit);
        setReceiptPrefix(settingsRes.data.receiptPrefix);
      }

      if (hoursRes.success && hoursRes.data && hoursRes.data.length > 0) {
        setOpeningHours(hoursRes.data as DayHour[]);
      }

      if (closuresRes.success && closuresRes.data) {
        setClosures(closuresRes.data as unknown as ClosureItem[]);
      }

      if (sessionsRes.success && sessionsRes.data) {
        setSessionTypes(sessionsRes.data as unknown as SessionTypeItem[]);
      }
    } catch {
      setError(isAr ? "فشل تحميل إعدادات العيادة." : "Failed to load clinic settings.");
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Guard for OWNER role only (R-1.1-19)
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
            ? "صفحة إعدادات العيادة وساعات العمل والأسعار مخصصة لمالك العيادة فقط."
            : "Clinic profile, hours, and catalog configuration is strictly restricted to the Clinic Owner."}
        </p>
      </div>
    );
  }

  // Handle Profile Save
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await updateClinicSettingsAction({
        nameAr,
        nameEn,
        addressAr,
        addressEn,
        phone,
        logoUrl: logoUrl || null,
        defaultPackageExpiryDays,
        doctorDailySoftLimit,
        receiptPrefix,
        timezone: "Africa/Cairo",
        noteEditWindowHours: 24,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل حفظ الإعدادات." : "Failed to save settings."));
        return;
      }

      setSuccessMessage(isAr ? "تم حفظ إعدادات العيادة بنجاح." : "Clinic settings saved successfully.");
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع." : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Opening Hours Save
  const handleHoursSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await updateOpeningHoursAction({
        hours: openingHours,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل حفظ ساعات العمل." : "Failed to save opening hours."));
        return;
      }

      setSuccessMessage(isAr ? "تم تحديث ساعات العمل الأسبوعية بنجاح." : "Weekly opening hours updated.");
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع." : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Add Closure
  const handleAddClosureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await createClosureAction({
        closureDate: newClosureDate,
        reasonAr: newReasonAr,
        reasonEn: newReasonEn,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل تسجيل الإغلاق." : "Failed to record closure."));
        return;
      }

      setSuccessMessage(isAr ? "تم تسجيل العطلة بنجاح." : "Holiday closure recorded successfully.");
      setShowClosureModal(false);
      setNewClosureDate("");
      setNewReasonAr("");
      setNewReasonEn("");
      fetchData();
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع." : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Add Session Type
  const handleAddSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await createSessionTypeAction({
        code: newCode.toUpperCase().trim(),
        category: newCategory,
        nameAr: newSessionNameAr,
        nameEn: newSessionNameEn,
        defaultDurationMinutes: Number(newDuration),
        defaultPricePiasters: Math.round(newPriceEgp * 100),
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل إضافة نوع الجلسة." : "Failed to add session type."));
        return;
      }

      setSuccessMessage(isAr ? "تمت إضافة نوع الجلسة بنجاح." : "Session type added successfully.");
      setShowSessionModal(false);
      setNewCode("");
      setNewSessionNameAr("");
      setNewSessionNameEn("");
      fetchData();
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع." : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {isAr ? "إعدادات المركز وساعات العمل" : "Clinic Settings & Configuration"}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {isAr
            ? "البيانات الأساسية للمركز، مواعيد العمل الأسبوعية، العطلات، ودليل الخدمات والأسعار"
            : "Clinic profile, weekly opening schedule, holiday closures, and service catalog"}
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

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("PROFILE")}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "PROFILE"
              ? "border-[#0E6251] text-[#0E6251] dark:border-[#48C9B0] dark:text-[#48C9B0]"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          {isAr ? "بيانات المركز والافتراضيات" : "Profile & Defaults"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("HOURS")}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "HOURS"
              ? "border-[#0E6251] text-[#0E6251] dark:border-[#48C9B0] dark:text-[#48C9B0]"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          {isAr ? "ساعات العمل الأسبوعية" : "Operating Hours"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("CLOSURES")}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "CLOSURES"
              ? "border-[#0E6251] text-[#0E6251] dark:border-[#48C9B0] dark:text-[#48C9B0]"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          {isAr ? "العطلات والإغلاقات" : "Closures & Holidays"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("SESSIONS")}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "SESSIONS"
              ? "border-[#0E6251] text-[#0E6251] dark:border-[#48C9B0] dark:text-[#48C9B0]"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          {isAr ? "دليل الجلسات والتسعير" : "Session Types & Pricing"}
        </button>
      </div>

      {/* TAB 1: Profile & Defaults (R-2-1, R-2-6, R-2-7, R-2-8) */}
      {activeTab === "PROFILE" && (
        <form onSubmit={handleProfileSubmit} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? "اسم العيادة (بالعربية)" : "Clinic Name (Arabic)"}
              </label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? "اسم العيادة (بالإنجليزية)" : "Clinic Name (English)"}
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? "العنوان (بالعربية)" : "Address (Arabic)"}
              </label>
              <input
                type="text"
                value={addressAr}
                onChange={(e) => setAddressAr(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? "العنوان (بالإنجليزية)" : "Address (English)"}
              </label>
              <input
                type="text"
                dir="ltr"
                value={addressEn}
                onChange={(e) => setAddressEn(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? "رقم الهاتف الرئيسي" : "Main Phone Number"}
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? "رابط شعار العيادة (Logo URL)" : "Logo URL"}
              </label>
              <input
                type="text"
                dir="ltr"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3">
              {isAr ? "القواعد التشغيلية والافتراضات" : "Operational Defaults & Policies"}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "صلاحية الباقات الافتراضية (يوم) [R-2-6]" : "Package Validity (days) [R-2-6]"}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={defaultPackageExpiryDays}
                  onChange={(e) => setDefaultPackageExpiryDays(parseInt(e.target.value) || 60)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "الحد اليومي التنبيهي للطبيب (جلسات) [R-2-7]" : "Doctor Daily Soft Limit [R-2-7]"}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={doctorDailySoftLimit}
                  onChange={(e) => setDoctorDailySoftLimit(parseInt(e.target.value) || 10)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "بادئة أرقام الإيصالات [R-2-8]" : "Receipt Serial Prefix [R-2-8]"}
                </label>
                <input
                  type="text"
                  maxLength={10}
                  required
                  dir="ltr"
                  value={receiptPrefix}
                  onChange={(e) => setReceiptPrefix(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#0E6251] text-white hover:bg-[#117A65] disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ التعديلات" : "Save Changes")}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Weekly Operating Hours (R-2-2) */}
      {activeTab === "HOURS" && (
        <form onSubmit={handleHoursSubmit} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <p className="text-xs text-slate-500 mb-3">
            {isAr
              ? "حدد مواعيد الفتح والإغلاق لكل يوم من أيام الأسبوع السبعة (من السبت إلى الجمعة)."
              : "Define clinic opening and closing times for each weekday (Sat through Fri)."}
          </p>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {weekdayNames.map((day) => {
              const currentHour = openingHours.find((h) => h.dayOfWeek === day.id) || {
                dayOfWeek: day.id,
                isOpen: day.id !== 6,
                openTime: "09:00",
                closeTime: "21:00",
              };

              return (
                <div key={day.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 w-40">
                    <input
                      type="checkbox"
                      id={`day-${day.id}`}
                      checked={currentHour.isOpen}
                      onChange={(e) => {
                        const updated = openingHours.map((h) =>
                          h.dayOfWeek === day.id ? { ...h, isOpen: e.target.checked } : h
                        );
                        setOpeningHours(updated);
                      }}
                      className="w-4 h-4 rounded text-[#0E6251] focus:ring-[#0E6251]"
                    />
                    <label htmlFor={`day-${day.id}`} className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {isAr ? day.ar : day.en}
                    </label>
                  </div>

                  {currentHour.isOpen ? (
                    <div className="flex items-center gap-2" dir="ltr">
                      <input
                        type="time"
                        value={currentHour.openTime}
                        onChange={(e) => {
                          const updated = openingHours.map((h) =>
                            h.dayOfWeek === day.id ? { ...h, openTime: e.target.value } : h
                          );
                          setOpeningHours(updated);
                        }}
                        className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                      <span className="text-xs text-slate-400">إلى</span>
                      <input
                        type="time"
                        value={currentHour.closeTime}
                        onChange={(e) => {
                          const updated = openingHours.map((h) =>
                            h.dayOfWeek === day.id ? { ...h, closeTime: e.target.value } : h
                          );
                          setOpeningHours(updated);
                        }}
                        className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-red-500 font-medium">
                      {isAr ? "مغلق (عطلة أسبوعية)" : "Closed (Weekend)"}
                    </span>
                  )}
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
              {saving ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ ساعات العمل" : "Save Operating Hours")}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Closures & Holidays (R-2-3) */}
      {activeTab === "CLOSURES" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {isAr
                ? "قائمة الأيام التي يتم إغلاق العيادة فيها بشكل كامل، ويمنع النظام حجز أي مواعيد خلالها."
                : "Dates when the clinic is completely closed. No appointments can be booked on closure dates."}
            </p>

            <button
              type="button"
              onClick={() => setShowClosureModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#0E6251] text-white hover:bg-[#117A65]"
            >
              <span>+</span>
              <span>{isAr ? "إضافة عطلة / إغلاق" : "Add Closure"}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-4 text-start">{isAr ? "التاريخ" : "Date"}</th>
                  <th className="py-2.5 px-4 text-start">{isAr ? "السبب (عربي)" : "Reason (Ar)"}</th>
                  <th className="py-2.5 px-4 text-start">{isAr ? "السبب (إنجليزي)" : "Reason (En)"}</th>
                  <th className="py-2.5 px-4 text-start">{isAr ? "الحالة" : "Status"}</th>
                  <th className="py-2.5 px-4 text-end">{isAr ? "إجراء" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {closures.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      {isAr ? "لا توجد عطلات مسجلة." : "No closures recorded."}
                    </td>
                  </tr>
                ) : (
                  closures.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 px-4 font-mono font-semibold" dir="ltr">
                        {new Date(c.closureDate).toLocaleDateString("en-CA")}
                      </td>
                      <td className="py-2.5 px-4">{c.reasonAr}</td>
                      <td className="py-2.5 px-4" dir="ltr">{c.reasonEn}</td>
                      <td className="py-2.5 px-4">
                        {c.isActive ? (
                          <span className="text-emerald-700 font-semibold">{isAr ? "نشطة" : "Active"}</span>
                        ) : (
                          <span className="text-slate-400">{isAr ? "معطلة" : "Inactive"}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-end">
                        <button
                          type="button"
                          onClick={async () => {
                            await toggleClosureAction({ closureId: c.id, isActive: !c.isActive });
                            fetchData();
                          }}
                          className="px-2 py-1 text-[11px] rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          {c.isActive ? (isAr ? "تعطيل" : "Disable") : (isAr ? "تفعيل" : "Enable")}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Session Types Catalog (R-2-5) */}
      {activeTab === "SESSIONS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {isAr
                ? "دليل الخدمات والجلسات العلاجية بالعيادة وأسعارها الرسمية والمدة الزمنية الافتراضية."
                : "Official session catalog, default durations (15m increments), and default prices."}
            </p>

            <button
              type="button"
              onClick={() => setShowSessionModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#0E6251] text-white hover:bg-[#117A65]"
            >
              <span>+</span>
              <span>{isAr ? "إضافة خدمة / جلسة جديدة" : "Add Session Type"}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-4 text-start">{isAr ? "الرمز (Code)" : "Code"}</th>
                  <th className="py-2.5 px-4 text-start">{isAr ? "اسم الجلسة" : "Session Name"}</th>
                  <th className="py-2.5 px-4 text-start">{isAr ? "التصنيف" : "Category"}</th>
                  <th className="py-2.5 px-4 text-start">{isAr ? "المدة الافتراضية" : "Duration"}</th>
                  <th className="py-2.5 px-4 text-start">{isAr ? "السعر الافتراضي" : "Price"}</th>
                  <th className="py-2.5 px-4 text-start">{isAr ? "الحالة" : "Status"}</th>
                  <th className="py-2.5 px-4 text-end">{isAr ? "إجراء" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sessionTypes.map((st) => (
                  <tr key={st.id}>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {st.code}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold">{st.nameAr}</div>
                      <div className="text-[11px] text-slate-400">{st.nameEn}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {st.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono">{st.defaultDurationMinutes} دقيقة</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-700 dark:text-emerald-400">
                      {(st.defaultPricePiasters / 100).toFixed(2)} ج.م
                    </td>
                    <td className="py-2.5 px-4">
                      {st.isActive ? (
                        <span className="text-emerald-700 font-semibold">{isAr ? "نشطة" : "Active"}</span>
                      ) : (
                        <span className="text-slate-400">{isAr ? "معطلة" : "Inactive"}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-end">
                      <button
                        type="button"
                        onClick={async () => {
                          await toggleSessionTypeAction({ id: st.id, isActive: !st.isActive });
                          fetchData();
                        }}
                        className="px-2 py-1 text-[11px] rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        {st.isActive ? (isAr ? "تعطيل" : "Disable") : (isAr ? "تفعيل" : "Enable")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Add Closure */}
      {showClosureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
              {isAr ? "إضافة عطلة / إغلاق رسمي" : "Add Holiday Closure"}
            </h2>
            <form onSubmit={handleAddClosureSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">{isAr ? "تاريخ العطلة" : "Date"}</label>
                <input
                  type="date"
                  required
                  value={newClosureDate}
                  onChange={(e) => setNewClosureDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{isAr ? "سبب العطلة (عربي)" : "Reason (Ar)"}</label>
                <input
                  type="text"
                  required
                  value={newReasonAr}
                  onChange={(e) => setNewReasonAr(e.target.value)}
                  placeholder="عيد الفطر المبارك"
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{isAr ? "سبب العطلة (إنجليزي)" : "Reason (En)"}</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={newReasonEn}
                  onChange={(e) => setNewReasonEn(e.target.value)}
                  placeholder="Eid Al-Fitr Holiday"
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClosureModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-[#0E6251] text-white"
                >
                  {isAr ? "إضافة" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Session Type */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
              {isAr ? "إضافة نوع جلسة / خدمة جديدة" : "Add New Session Type"}
            </h2>
            <form onSubmit={handleAddSessionSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold mb-1">{isAr ? "الرمز (Code)" : "Code"}</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="PHYSIO_NEW"
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{isAr ? "التصنيف" : "Category"}</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as SessionTypeItem["category"])}
                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="PHYSIOTHERAPY">علاج طبيعي (Physio)</option>
                    <option value="NUTRITION">تغذية علاجية (Nutrition)</option>
                    <option value="CONSULTANT_ASSESSMENT">كشف استشاري (Assessment)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{isAr ? "اسم الجلسة (عربي)" : "Name (Ar)"}</label>
                <input
                  type="text"
                  required
                  value={newSessionNameAr}
                  onChange={(e) => setNewSessionNameAr(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{isAr ? "اسم الجلسة (إنجليزي)" : "Name (En)"}</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={newSessionNameEn}
                  onChange={(e) => setNewSessionNameEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {isAr ? "المدة (دقائق: مضاعفات 15)" : "Duration (15m step)"}
                  </label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value={15}>15 دقيقة</option>
                    <option value={30}>30 دقيقة</option>
                    <option value={45}>45 دقيقة</option>
                    <option value={60}>60 دقيقة (ساعة)</option>
                    <option value={90}>90 دقيقة</option>
                    <option value={120}>120 دقيقة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {isAr ? "السعر (بالجنيه)" : "Price (EGP)"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    required
                    value={newPriceEgp}
                    onChange={(e) => setNewPriceEgp(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-[#0E6251] text-white"
                >
                  {isAr ? "إضافة" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
