"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { useRole } from "@/context/RoleContext";
import {
  createExpenseAction,
  editExpenseAction,
  voidExpenseAction,
  getExpensesAction,
} from "@/server/actions/backoffice";
import { ExpenseCategory, PaymentMethod } from "@prisma/client";

export default function ExpensesPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const { role } = useRole();
  const isReceptionist = role === "RECEPTIONIST";

  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalActivePiasters, setTotalActivePiasters] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal: Create Expense
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createCategory, setCreateCategory] = useState<ExpenseCategory>(ExpenseCategory.SUPPLIES);
  const [createAmountEgp, setCreateAmountEgp] = useState<number>(50);
  const [createMethod, setCreateMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [createDate, setCreateDate] = useState(todayStr);
  const [createReason, setCreateReason] = useState("");
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Modal: Edit Expense
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmountEgp, setEditAmountEgp] = useState<number>(0);
  const [editCategory, setEditCategory] = useState<ExpenseCategory>(ExpenseCategory.SUPPLIES);
  const [editReason, setEditReason] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Modal: Void Expense
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [submittingVoid, setSubmittingVoid] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getExpensesAction({
        startDate,
        endDate,
        category: categoryFilter !== "ALL" ? (categoryFilter as ExpenseCategory) : undefined,
        includeVoided: true,
      });

      if (res.success && res.data) {
        setExpenses(res.data.expenses || []);
        setTotalActivePiasters(res.data.totalActivePiasters || 0);
      } else if (!res.success) {
        setError(res.error?.message || "فشل تحميل قائمة المصروفات");
      }
    } catch {
      setError(isAr ? "حدث خطأ أثناء تحميل المصروفات" : "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, categoryFilter, isAr]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleOpenCreate = () => {
    setCreateTitle("");
    setCreateCategory(ExpenseCategory.SUPPLIES);
    setCreateAmountEgp(50);
    setCreateMethod(PaymentMethod.CASH);
    setCreateDate(todayStr);
    setCreateReason("");
    setShowCreateModal(true);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCreate(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await createExpenseAction({
        title: createTitle,
        category: createCategory,
        amountPiasters: Math.round(Number(createAmountEgp) * 100),
        paymentMethod: createMethod,
        expenseDate: createDate,
        reason: createReason || undefined,
      });

      if (res.success) {
        setShowCreateModal(false);
        setSuccessMsg(isAr ? "تم تسجيل المصروف بنجاح" : "Expense recorded successfully");
        fetchExpenses();
      } else {
        setError(res.error?.message || "فشل تسجيل المصروف");
      }
    } catch (err: any) {
      setError(err?.message || "حدث خطأ غير متوقع");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleOpenEdit = (exp: any) => {
    setSelectedExpense(exp);
    setEditTitle(exp.title);
    setEditAmountEgp(exp.amountPiasters / 100);
    setEditCategory(exp.category);
    setEditReason("");
    setShowEditModal(true);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;

    setSubmittingEdit(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await editExpenseAction({
        expenseId: selectedExpense.id,
        title: editTitle,
        category: editCategory,
        amountPiasters: Math.round(Number(editAmountEgp) * 100),
        editReason,
      });

      if (res.success) {
        setShowEditModal(false);
        setSuccessMsg(isAr ? "تم تعديل المصروف وحفظ سجل التدقيق" : "Expense edited and logged");
        fetchExpenses();
      } else {
        setError(res.error?.message || "فشل تعديل المصروف");
      }
    } catch (err: any) {
      setError(err?.message || "حدث خطأ غير متوقع");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleOpenVoid = (exp: any) => {
    setSelectedExpense(exp);
    setVoidReason("");
    setShowVoidModal(true);
  };

  const handleSubmitVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;

    setSubmittingVoid(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await voidExpenseAction({
        expenseId: selectedExpense.id,
        voidReason,
      });

      if (res.success) {
        setShowVoidModal(false);
        setSuccessMsg(isAr ? "تم إلغاء المصروف بنجاح (مع الاحتفاظ بالسجل)" : "Expense voided successfully");
        fetchExpenses();
      } else {
        setError(res.error?.message || "فشل إلغاء المصروف");
      }
    } catch (err: any) {
      setError(err?.message || "حدث خطأ غير متوقع");
    } finally {
      setSubmittingVoid(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      SUPPLIES: { ar: "مستلزمات وأدوات", en: "Supplies" },
      EQUIPMENT: { ar: "أجهزة ومعدات", en: "Equipment" },
      MAINTENANCE: { ar: "صيانة وتشغيل", en: "Maintenance" },
      RENT: { ar: "إيجار مقرات", en: "Rent" },
      UTILITIES: { ar: "فواتير ومرافق", en: "Utilities" },
      SALARIES: { ar: "رواتب ومكافآت", en: "Salaries" },
      DOCTOR_COMMISSION: { ar: "عمولات أطباء", en: "Doctor Commission" },
      HOSPITALITY: { ar: "ضيافة وبوفيه", en: "Hospitality" },
      MARKETING: { ar: "تسويق وإعلانات", en: "Marketing" },
      OTHER: { ar: "نثريات أخرى", en: "Other" },
    };
    return isAr ? map[cat]?.ar || cat : map[cat]?.en || cat;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xl">
              💸
            </span>
            {isAr ? "المصروفات النثرية والتشغيلية" : "Operational Expenses"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isAr
              ? "تسجيل مصروفات الخزينة، التعديل الموثق، والإلغاء الرقابي دون حذف"
              : "Record petty cash expenses, logged edits, and audited voids"}
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white font-medium text-sm transition-all shadow-lg shadow-rose-500/20 flex items-center gap-2"
        >
          <span>+</span>
          {isAr ? "تسجيل مصروف جديد" : "New Expense"}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            {isAr ? "إجمالي المصروفات النشطة" : "Active Expenses Total"}
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2 font-mono">
            {(totalActivePiasters / 100).toLocaleString(isAr ? "ar-EG" : "en-US")}{" "}
            <span className="text-xs text-slate-400 font-normal">ج.م</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            {isAr ? "عدد العمليات المسجلة" : "Total Transactions"}
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {expenses.filter((e) => !e.isVoided).length}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            {isAr ? "المصروفات الملغاة" : "Voided Expenses"}
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">
            {expenses.filter((e) => e.isVoided).length}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {isAr ? "من تاريخ" : "Start Date"}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {isAr ? "إلى تاريخ" : "End Date"}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {isAr ? "البند والتصنيف" : "Category"}
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
            >
              <option value="ALL">{isAr ? "كافة البنود" : "All Categories"}</option>
              {Object.values(ExpenseCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={fetchExpenses}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
        >
          {isAr ? "تحديث القائمة" : "Refresh"}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
          {successMsg}
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg overflow-x-auto">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            {isAr ? "جاري تحميل المصروفات..." : "Loading expenses..."}
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            {isAr ? "لا توجد مصروفات مسجلة في هذه الفترة" : "No expenses recorded in this period"}
          </div>
        ) : (
          <table className="w-full text-xs text-right text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-800/40">
                <th className="p-3">{isAr ? "التاريخ" : "Date"}</th>
                <th className="p-3">{isAr ? "البيان / العنوان" : "Title"}</th>
                <th className="p-3">{isAr ? "البند" : "Category"}</th>
                <th className="p-3">{isAr ? "طريقة الدفع" : "Method"}</th>
                <th className="p-3">{isAr ? "المبلغ" : "Amount"}</th>
                <th className="p-3">{isAr ? "المسؤول" : "Recorded By"}</th>
                <th className="p-3">{isAr ? "الحالة" : "Status"}</th>
                <th className="p-3 text-center">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {expenses.map((exp) => (
                <tr
                  key={exp.id}
                  className={`hover:bg-slate-800/30 ${
                    exp.isVoided ? "opacity-50 line-through bg-slate-950/40" : ""
                  }`}
                >
                  <td className="p-3 font-mono">
                    {new Date(exp.expenseDate).toLocaleDateString(isAr ? "ar-EG" : "en-US")}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-white">{exp.title}</div>
                    {exp.reason && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{exp.reason}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                      {getCategoryLabel(exp.category)}
                    </span>
                  </td>
                  <td className="p-3 font-mono">{exp.paymentMethod}</td>
                  <td className="p-3 font-bold text-white font-mono text-sm">
                    {(exp.amountPiasters / 100).toLocaleString(isAr ? "ar-EG" : "en-US")} ج.م
                  </td>
                  <td className="p-3 text-slate-400">
                    {exp.createdByUser?.fullName || "—"}
                  </td>
                  <td className="p-3">
                    {exp.isVoided ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px]">
                        {isAr ? "ملغى" : "Voided"}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                        {isAr ? "معتمد" : "Active"}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {!exp.isVoided && (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700"
                        >
                          {isAr ? "تعديل" : "Edit"}
                        </button>
                        <button
                          onClick={() => handleOpenVoid(exp)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs border border-rose-500/30"
                        >
                          {isAr ? "إلغاء" : "Void"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL 1: Create Expense */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">
              {isAr ? "تسجيل مصروف تشغيلي جديد" : "Record New Expense"}
            </h2>

            <form onSubmit={handleSubmitCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {isAr ? "البيان / عنوان المصروف" : "Title"} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? "مثال: شراء أدوات تعقيم ونظافة..." : "e.g. Clinic cleaning supplies"}
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {isAr ? "بند المصروف" : "Category"} *
                  </label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    {Object.values(ExpenseCategory).map((cat) => (
                      <option key={cat} value={cat}>
                        {getCategoryLabel(cat)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {isAr ? "المبلغ (ج.م)" : "Amount (EGP)"} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={createAmountEgp}
                    onChange={(e) => setCreateAmountEgp(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {isAr ? "طريقة الصرف" : "Payment Method"} *
                  </label>
                  <select
                    value={createMethod}
                    onChange={(e) => setCreateMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value={PaymentMethod.CASH}>{isAr ? "خزينة نقدية (درج الكاش)" : "Cash Drawer"}</option>
                    <option value={PaymentMethod.CARD}>{isAr ? "فيزا / شبكة / بطاقة" : "Card"}</option>
                    <option value={PaymentMethod.INSTAPAY}>Instapay</option>
                    <option value={PaymentMethod.VODAFONE_CASH}>Vodafone Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {isAr ? "تاريخ الصرف" : "Date"} *
                  </label>
                  <input
                    type="date"
                    disabled={isReceptionist}
                    value={createDate}
                    onChange={(e) => setCreateDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {isAr ? "ملاحظات وتفاصيل إضافية" : "Reason / Notes"}
                </label>
                <textarea
                  rows={2}
                  value={createReason}
                  onChange={(e) => setCreateReason(e.target.value)}
                  placeholder={isAr ? "تفاصيل الشراء أو رقم الفاتورة..." : "Details"}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {submittingCreate ? (isAr ? "جاري الحفظ..." : "Saving...") : isAr ? "تسجيل المصروف" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Expense (with mandatory audit editReason R-10-3) */}
      {showEditModal && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">
              {isAr ? "تعديل المصروف وتوثيق السبب" : "Edit Expense"}
            </h2>

            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {isAr ? "البيان / العنوان الجديد" : "Title"}
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {isAr ? "البند" : "Category"}
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    {Object.values(ExpenseCategory).map((cat) => (
                      <option key={cat} value={cat}>
                        {getCategoryLabel(cat)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {isAr ? "المبلغ المعدل (ج.م)" : "Amount (EGP)"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={editAmountEgp}
                    onChange={(e) => setEditAmountEgp(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-amber-400 mb-1">
                  {isAr ? "سبب التعديل (إلزامي للرقابة والتدقيق) [R-10-3]" : "Edit Reason (Mandatory)"} *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder={isAr ? "مثال: تصحيح خطأ في تسعير الفاتورة بناء على إيصال المورد..." : "Audit reason"}
                  className="w-full bg-slate-800 border border-amber-500/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {submittingEdit ? (isAr ? "جاري الحفظ..." : "Saving...") : isAr ? "حفظ التعديل" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Void Expense (Soft Delete with mandatory voidReason R-10-3) */}
      {showVoidModal && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-rose-500">⚠️</span>
              {isAr ? "إلغاء اعتماد المصروف (Void)" : "Void Expense"}
            </h2>

            <p className="text-xs text-slate-400">
              {isAr
                ? `سيتم تحويل المصروف "${selectedExpense.title}" بقيمة ${(selectedExpense.amountPiasters / 100)} ج.م إلى ملغى مع حفظ كامل السجل الرقابي [R-10-3].`
                : `This will mark "${selectedExpense.title}" as voided and keep the audit history.`}
            </p>

            <form onSubmit={handleSubmitVoid} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-rose-400 mb-1">
                  {isAr ? "سبب الإلغاء (إلزامي للرقابة) [R-10-3]" : "Void Reason"} *
                </label>
                <textarea
                  rows={3}
                  required
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder={isAr ? "مثال: تم إرجاع الأصناف واسترداد المبلغ نقداً..." : "Reason for voiding"}
                  className="w-full bg-slate-800 border border-rose-500/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVoidModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  {isAr ? "تراجع" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submittingVoid}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {submittingVoid ? (isAr ? "جاري الإلغاء..." : "Voiding...") : isAr ? "تأكيد الإلغاء" : "Confirm Void"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
