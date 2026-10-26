"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { useRole } from "@/context/RoleContext";
import {
  listRoomsAction,
  createRoomAction,
  toggleRoomAction,
  createBedAction,
  toggleBedAction,
  updateBedAction,
} from "@/server/actions/clinic";

type BedItem = {
  id: string;
  name: string;
  isActive: boolean;
};

type RoomItem = {
  id: string;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  beds: BedItem[];
};

export default function ResourcesPage() {
  const locale = useLocale();
  const { role: currentRole } = useRole();
  const isAr = locale === "ar";

  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newRoomNameAr, setNewRoomNameAr] = useState("");
  const [newRoomNameEn, setNewRoomNameEn] = useState("");
  const [newNumberOfBeds, setNewNumberOfBeds] = useState(1);

  const [showBedModal, setShowBedModal] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [newBedName, setNewBedName] = useState("");

  const [showEditBedModal, setShowEditBedModal] = useState(false);
  const [editingBed, setEditingBed] = useState<{ id: string; name: string; roomId: string } | null>(null);
  const [editBedName, setEditBedName] = useState("");

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listRoomsAction({});
      if (res.success && res.data) {
        setRooms(res.data as unknown as RoomItem[]);
      }
    } catch {
      setError(isAr ? "فشل تحميل قائمة الغرف والأسرة." : "Failed to load rooms.");
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Guard for OWNER & MANAGER (R-1.1-19, R-2-4)
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
            ? "إدارة الغرف وأسرّة العلاج مخصصة لمالك العيادة ومدير العيادة فقط."
            : "Room and bed management is strictly restricted to Owner and Manager."}
        </p>
      </div>
    );
  }

  // Handle Add Room
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await createRoomAction({
        nameAr: newRoomNameAr,
        nameEn: newRoomNameEn,
        numberOfBeds: newNumberOfBeds,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل إنشاء الغرفة." : "Failed to create room."));
        return;
      }

      setSuccessMessage(isAr ? "تمت إضافة الغرفة بنجاح." : "Room added successfully.");
      setShowRoomModal(false);
      setNewRoomNameAr("");
      setNewRoomNameEn("");
      setNewNumberOfBeds(1);
      fetchRooms();
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع." : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Edit Bed (Rename)
  const handleEditBedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBed) return;
    setSaving(true);
    setError(null);

    try {
      const res = await updateBedAction({
        bedId: editingBed.id,
        name: editBedName.trim(),
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل تعديل اسم السرير." : "Failed to rename bed."));
        return;
      }

      setSuccessMessage(isAr ? "تم تعديل اسم السرير بنجاح." : "Bed renamed successfully.");
      setShowEditBedModal(false);
      setEditingBed(null);
      setEditBedName("");
      fetchRooms();
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع." : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Add Bed
  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await createBedAction({
        roomId: selectedRoomId,
        name: newBedName,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل إضافة السرير." : "Failed to add bed."));
        return;
      }

      setSuccessMessage(isAr ? "تمت إضافة السرير للغرفة بنجاح." : "Bed added successfully.");
      setShowBedModal(false);
      setNewBedName("");
      fetchRooms();
    } catch {
      setError(isAr ? "حدث خطأ غير متوقع." : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Toggle Room Active
  const handleToggleRoom = async (roomId: string, currentStatus: boolean) => {
    try {
      const res = await toggleRoomAction({ roomId, isActive: !currentStatus });
      if (res.success) {
        fetchRooms();
      } else {
        setError(res.error?.message);
      }
    } catch {
      setError(isAr ? "حدث خطأ أثناء تغيير الحالة." : "Error toggling status.");
    }
  };

  // Handle Toggle Bed Active
  const handleToggleBed = async (bedId: string, currentStatus: boolean) => {
    try {
      const res = await toggleBedAction({ bedId, isActive: !currentStatus });
      if (res.success) {
        fetchRooms();
      } else {
        setError(res.error?.message);
      }
    } catch {
      setError(isAr ? "حدث خطأ أثناء تغيير الحالة." : "Error toggling status.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {isAr ? "إدارة الغرف وأسرّة العلاج" : "Facility Rooms & Beds Resources"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? "إضافة غرف العيادة وتوزيع أسرّة العلاج عليها والتحكم في تفعيلها دون حذف السجلات التاريخية"
              : "Manage treatment rooms and beds. Soft-deactivate resources to preserve booking history."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRoomModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#0E6251] text-white hover:bg-[#117A65] shadow-sm transition-colors"
          >
            <span>+</span>
            <span>{isAr ? "إضافة غرفة جديدة" : "Add Room"}</span>
          </button>
        </div>
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

      {/* Rooms & Beds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            {isAr ? "جارٍ تحميل الغرف والأسرّة..." : "Loading resources..."}
          </div>
        ) : rooms.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            {isAr ? "لا توجد غرف مسجلة حالياً." : "No rooms configured."}
          </div>
        ) : (
          rooms.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl border p-4 transition-all shadow-sm ${
                r.isActive
                  ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60"
              }`}
            >
              {/* Room Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{r.nameAr}</h3>
                    {r.beds.filter((b) => b.isActive).length === 1 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        {isAr ? "غرفة مفردة" : "Single Bed"}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block">{r.nameEn}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleRoom(r.id, r.isActive)}
                    className="px-2 py-0.5 text-[10px] font-medium rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {r.isActive ? (isAr ? "تعطيل الغرفة" : "Deactivate") : (isAr ? "تفعيل الغرفة" : "Activate")}
                  </button>
                </div>
              </div>

              {/* Beds in Room */}
              <div className="pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">
                    {isAr ? `الأسرّة (${r.beds.length})` : `Beds (${r.beds.length})`}
                  </span>
                  {r.isActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoomId(r.id);
                        setShowBedModal(true);
                      }}
                      className="text-[11px] text-[#0E6251] dark:text-[#48C9B0] font-semibold hover:underline"
                    >
                      {isAr ? "+ سرير" : "+ Bed"}
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  {r.beds.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic block py-2 text-center">
                      {isAr ? "لا توجد أسرّة بهذه الغرفة" : "No beds in this room"}
                    </span>
                  ) : (
                    r.beds.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            🛏️ {b.name}
                          </span>
                          {r.isActive && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBed({ id: b.id, name: b.name, roomId: r.id });
                                setEditBedName(b.name);
                                setShowEditBedModal(true);
                              }}
                              className="text-[10px] text-slate-500 hover:text-[#0E6251] dark:hover:text-[#48C9B0] underline px-1"
                            >
                              {isAr ? "تعديل" : "Edit"}
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleBed(b.id, b.isActive)}
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            b.isActive
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                          }`}
                        >
                          {b.isActive ? (isAr ? "نشط" : "Active") : (isAr ? "معطّل" : "Disabled")}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: Add Room */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
              {isAr ? "إضافة غرفة علاج جديدة" : "Add Treatment Room"}
            </h2>

            <form onSubmit={handleAddRoom} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {isAr ? "اسم الغرفة (بالعربية)" : "Room Name (Arabic)"}
                </label>
                <input
                  type="text"
                  required
                  value={newRoomNameAr}
                  onChange={(e) => setNewRoomNameAr(e.target.value)}
                  placeholder="غرفة العلاج الكهربائي 2"
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  {isAr ? "اسم الغرفة (بالإنجليزية)" : "Room Name (English)"}
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={newRoomNameEn}
                  onChange={(e) => setNewRoomNameEn(e.target.value)}
                  placeholder="Electrotherapy Room 2"
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  {isAr ? "عدد الأسرّة في الغرفة (افتراضي 1)" : "Number of Beds (Default 1)"}
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={newNumberOfBeds}
                  onChange={(e) => setNewNumberOfBeds(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {isAr
                    ? "سيتم إنشاء الأسرّة تلقائياً بأسماء: سرير 1، سرير 2..."
                    : "Beds will be created automatically as Bed 1, Bed 2..."}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-[#0E6251] text-white disabled:opacity-50"
                >
                  {saving ? (isAr ? "جارٍ الإضافة..." : "Adding...") : (isAr ? "إضافة الغرفة" : "Add Room")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Bed to Room */}
      {showBedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
              {isAr ? "إضافة سرير إلى الغرفة" : "Add Bed to Room"}
            </h2>

            <form onSubmit={handleAddBed} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {isAr ? "اسم أو رقم السرير" : "Bed Name / Label"}
                </label>
                <input
                  type="text"
                  required
                  value={newBedName}
                  onChange={(e) => setNewBedName(e.target.value)}
                  placeholder="سرير إضافي"
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBedModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-[#0E6251] text-white disabled:opacity-50"
                >
                  {saving ? (isAr ? "جارٍ الإضافة..." : "Adding...") : (isAr ? "إضافة السرير" : "Add Bed")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Bed (Rename) */}
      {showEditBedModal && editingBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
              {isAr ? "تعديل اسم السرير" : "Rename Bed"}
            </h2>

            <form onSubmit={handleEditBedSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {isAr ? "اسم السرير الجديد" : "New Bed Name"}
                </label>
                <input
                  type="text"
                  required
                  value={editBedName}
                  onChange={(e) => setEditBedName(e.target.value)}
                  placeholder="سرير 1"
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditBedModal(false);
                    setEditingBed(null);
                  }}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-[#0E6251] text-white disabled:opacity-50"
                >
                  {saving ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ التعديل" : "Save Name")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
