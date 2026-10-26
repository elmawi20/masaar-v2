"use server";

import { z } from "zod";
import { defineAction } from "../defineAction";
import { SessionCategory } from "@prisma/client";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const phoneRegex = /^01[0125][0-9]{8}$|^(\+20|0020)1[0125][0-9]{8}$|^02[0-9]{8}$/;

// ============================================================================
// 1. Clinic Settings & Profile (R-1.1-19, R-2-1, R-2-6, R-2-7, R-2-8)
// ============================================================================

export const getClinicSettingsAction = defineAction({
  actionKey: "admin.settings.manage_clinic",
  schema: z.object({}).optional().default({}),
  handler: async ({ tx }) => {
    let settings = await tx.clinicSetting.findFirst();
    if (!settings) {
      settings = await tx.clinicSetting.create({
        data: {
          nameAr: "عيادة مسار للعلاج الطبيعي والتغذية",
          nameEn: "Masaar Clinic for Physiotherapy & Nutrition",
          phone: "01012345678",
          defaultPackageExpiryDays: 60,
          doctorDailySoftLimit: 10,
          receiptPrefix: "INV",
          timezone: "Africa/Cairo",
        },
      });
    }
    return settings;
  },
});

export const updateClinicSettingsAction = defineAction({
  actionKey: "admin.settings.manage_clinic",
  schema: z.object({
    nameAr: z.string().min(2).max(120),
    nameEn: z.string().min(2).max(120),
    addressAr: z.string().optional().nullable(),
    addressEn: z.string().optional().nullable(),
    phone: z.string().regex(phoneRegex, "رقم الهاتف يجب أن يطابق أرقام الهواتف المصرية"),
    logoUrl: z.string().optional().nullable(),
    timezone: z.string().default("Africa/Cairo"),
    defaultPackageExpiryDays: z.number().int().min(1).default(60),
    doctorDailySoftLimit: z.number().int().min(1).default(10),
    receiptPrefix: z.string().min(1).max(10).regex(/^[A-Z0-9]+$/).default("INV"),
    noteEditWindowHours: z.number().int().min(1).default(24),
  }),
  audit: {
    entityType: "ClinicSetting",
    actionName: "CLINIC_SETTINGS_UPDATED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    const existing = await tx.clinicSetting.findFirst();

    if (existing) {
      return tx.clinicSetting.update({
        where: { id: existing.id },
        data: {
          nameAr: input.nameAr,
          nameEn: input.nameEn,
          addressAr: input.addressAr,
          addressEn: input.addressEn,
          phone: input.phone,
          logoUrl: input.logoUrl,
          timezone: input.timezone,
          defaultPackageExpiryDays: input.defaultPackageExpiryDays,
          doctorDailySoftLimit: input.doctorDailySoftLimit,
          receiptPrefix: input.receiptPrefix,
          noteEditWindowHours: input.noteEditWindowHours,
          updatedByUserId: ctx.user.id,
        },
      });
    }

    return tx.clinicSetting.create({
      data: {
        ...input,
        updatedByUserId: ctx.user.id,
      },
    });
  },
});

// ============================================================================
// 2. Weekly Operating Hours (R-1.1-19, R-2-2)
// ============================================================================

export const getOpeningHoursAction = defineAction({
  actionKey: "admin.settings.manage_clinic",
  schema: z.object({}).optional().default({}),
  handler: async ({ tx }) => {
    return tx.clinicOpeningHour.findMany({
      orderBy: { dayOfWeek: "asc" },
    });
  },
});

export const updateOpeningHoursAction = defineAction({
  actionKey: "admin.settings.manage_clinic",
  schema: z.object({
    hours: z.array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        isOpen: z.boolean(),
        openTime: z.string().regex(timeRegex),
        closeTime: z.string().regex(timeRegex),
      })
    ),
  }),
  audit: {
    entityType: "ClinicOpeningHour",
    actionName: "OPENING_HOURS_UPDATED",
  },
  handler: async ({ input, ctx, tx }) => {
    for (const h of input.hours) {
      if (h.isOpen && h.openTime >= h.closeTime) {
        throw new Error("وقت الإغلاق يجب أن يكون بعد وقت الفتح");
      }
    }
    const results = [];
    for (const h of input.hours) {
      const updated = await tx.clinicOpeningHour.upsert({
        where: { dayOfWeek: h.dayOfWeek },
        update: {
          isOpen: h.isOpen,
          openTime: h.openTime,
          closeTime: h.closeTime,
          updatedByUserId: ctx.user.id,
        },
        create: {
          dayOfWeek: h.dayOfWeek,
          isOpen: h.isOpen,
          openTime: h.openTime,
          closeTime: h.closeTime,
          updatedByUserId: ctx.user.id,
        },
      });
      results.push(updated);
    }
    return results;
  },
});

// ============================================================================
// 3. Clinic Closures & Holidays (R-1.1-19, R-2-3)
// ============================================================================

export const listClosuresAction = defineAction({
  actionKey: "admin.settings.manage_clinic",
  schema: z.object({}).optional().default({}),
  handler: async ({ tx }) => {
    return tx.clinicClosure.findMany({
      orderBy: { closureDate: "asc" },
    });
  },
});

export const createClosureAction = defineAction({
  actionKey: "admin.settings.manage_clinic",
  schema: z.object({
    closureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reasonAr: z.string().min(2).max(150),
    reasonEn: z.string().min(2).max(150),
  }),
  audit: {
    entityType: "ClinicClosure",
    actionName: "CLINIC_CLOSURE_CREATED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    const dateObj = new Date(input.closureDate);
    const existing = await tx.clinicClosure.findUnique({
      where: { closureDate: dateObj },
    });

    if (existing) {
      return tx.clinicClosure.update({
        where: { id: existing.id },
        data: {
          reasonAr: input.reasonAr,
          reasonEn: input.reasonEn,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    }

    return tx.clinicClosure.create({
      data: {
        closureDate: dateObj,
        reasonAr: input.reasonAr,
        reasonEn: input.reasonEn,
        isActive: true,
        createdByUserId: ctx.user.id,
      },
    });
  },
});

export const toggleClosureAction = defineAction({
  actionKey: "admin.settings.manage_clinic",
  schema: z.object({
    closureId: z.string().uuid(),
    isActive: z.boolean(),
  }),
  audit: {
    entityType: "ClinicClosure",
    actionName: "CLINIC_CLOSURE_STATUS_TOGGLED",
    getEntityId: (_, input) => input.closureId,
  },
  handler: async ({ input, tx }) => {
    return tx.clinicClosure.update({
      where: { id: input.closureId },
      data: { isActive: input.isActive },
    });
  },
});

// ============================================================================
// 4. Rooms and Beds Management (R-1.1-19, R-2-4)
// Allowed for OWNER & MANAGER
// ============================================================================

export const listRoomsAction = defineAction({
  actionKey: "admin.staff.manage_schedules",
  schema: z.object({}).optional().default({}),
  handler: async ({ tx }) => {
    return tx.room.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        beds: {
          orderBy: { name: "asc" },
        },
      },
    });
  },
});

export const createRoomAction = defineAction({
  actionKey: "admin.staff.manage_schedules",
  schema: z.object({
    nameAr: z.string().min(2).max(100),
    nameEn: z.string().min(2).max(100),
    numberOfBeds: z.number().int().min(1).max(20).default(1),
  }),
  audit: {
    entityType: "Room",
    actionName: "ROOM_CREATED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    const room = await tx.room.create({
      data: {
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        isActive: true,
        createdByUserId: ctx.user.id,
      },
    });

    const bedCount = input.numberOfBeds ?? 1;
    for (let i = 1; i <= bedCount; i++) {
      await tx.bed.create({
        data: {
          roomId: room.id,
          name: `سرير ${i}`,
          isActive: true,
          createdByUserId: ctx.user.id,
        },
      });
    }

    return room;
  },
});

export const toggleRoomAction = defineAction({
  actionKey: "admin.staff.manage_schedules",
  schema: z.object({
    roomId: z.string().uuid(),
    isActive: z.boolean(),
  }),
  audit: {
    entityType: "Room",
    actionName: "ROOM_STATUS_TOGGLED",
    getEntityId: (_, input) => input.roomId,
  },
  handler: async ({ input, tx }) => {
    return tx.room.update({
      where: { id: input.roomId },
      data: { isActive: input.isActive },
    });
  },
});

export const createBedAction = defineAction({
  actionKey: "admin.staff.manage_schedules",
  schema: z.object({
    roomId: z.string().uuid(),
    name: z.string().min(1).max(100),
  }),
  audit: {
    entityType: "Bed",
    actionName: "BED_CREATED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    const existing = await tx.bed.findUnique({
      where: {
        roomId_name: {
          roomId: input.roomId,
          name: input.name,
        },
      },
    });

    if (existing) {
      throw new Error("اسم السرير مكرر بالفعل في هذه الغرفة.");
    }

    return tx.bed.create({
      data: {
        roomId: input.roomId,
        name: input.name,
        isActive: true,
        createdByUserId: ctx.user.id,
      },
    });
  },
});

export const toggleBedAction = defineAction({
  actionKey: "admin.staff.manage_schedules",
  schema: z.object({
    bedId: z.string().uuid(),
    isActive: z.boolean(),
  }),
  audit: {
    entityType: "Bed",
    actionName: "BED_STATUS_TOGGLED",
    getEntityId: (_, input) => input.bedId,
  },
  handler: async ({ input, tx }) => {
    return tx.bed.update({
      where: { id: input.bedId },
      data: { isActive: input.isActive },
    });
  },
});

export const updateBedAction = defineAction({
  actionKey: "admin.staff.manage_schedules",
  schema: z.object({
    bedId: z.string().uuid(),
    name: z.string().min(1).max(100),
  }),
  audit: {
    entityType: "Bed",
    actionName: "BED_UPDATED",
    getEntityId: (_, input) => input.bedId,
  },
  handler: async ({ input, tx }) => {
    const bed = await tx.bed.findUnique({
      where: { id: input.bedId },
    });

    if (!bed) {
      throw new Error("السرير غير موجود.");
    }

    const trimmedName = input.name.trim();

    // Enforce bed name uniqueness within the same room
    const duplicate = await tx.bed.findFirst({
      where: {
        roomId: bed.roomId,
        name: trimmedName,
        id: { not: input.bedId },
      },
    });

    if (duplicate) {
      throw new Error("اسم السرير مكرر بالفعل في هذه الغرفة.");
    }

    return tx.bed.update({
      where: { id: input.bedId },
      data: { name: trimmedName },
    });
  },
});

// ============================================================================
// 5. Session Types Catalog (R-1.1-19, R-2-5)
// OWNER only
// ============================================================================

export const listSessionTypesAction = defineAction({
  actionKey: "admin.settings.manage_clinic",
  schema: z.object({}).optional().default({}),
  handler: async ({ tx }) => {
    return tx.sessionType.findMany({
      orderBy: { createdAt: "asc" },
    });
  },
});

export const createSessionTypeAction = defineAction({
  actionKey: "admin.settings.manage_clinic",
  schema: z.object({
    code: z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/),
    category: z.nativeEnum(SessionCategory),
    nameAr: z.string().min(2).max(120),
    nameEn: z.string().min(2).max(120),
    defaultDurationMinutes: z.number().int().min(15).max(180),
    defaultPricePiasters: z.number().int().min(0),
  }),
  audit: {
    entityType: "SessionType",
    actionName: "SESSION_TYPE_CREATED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    if (input.defaultDurationMinutes % 15 !== 0) {
      throw new Error("المدة يجب أن تكون من مضاعفات 15 دقيقة (15، 30، 45...)");
    }

    const existing = await tx.sessionType.findUnique({
      where: { code: input.code },
    });

    if (existing) {
      throw new Error("رمز الخدمة (Code) مسجل مسبقاً لنوع جلسة آخر.");
    }

    return tx.sessionType.create({
      data: {
        code: input.code,
        category: input.category,
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        defaultDurationMinutes: input.defaultDurationMinutes,
        defaultPricePiasters: input.defaultPricePiasters,
        isActive: true,
        createdByUserId: ctx.user.id,
      },
    });
  },
});

export const updateSessionTypeAction = defineAction({
  actionKey: "admin.settings.manage_clinic",
  schema: z.object({
    id: z.string().uuid(),
    category: z.nativeEnum(SessionCategory),
    nameAr: z.string().min(2).max(120),
    nameEn: z.string().min(2).max(120),
    defaultDurationMinutes: z.number().int().min(15).max(180),
    defaultPricePiasters: z.number().int().min(0),
  }),
  audit: {
    entityType: "SessionType",
    actionName: "SESSION_TYPE_UPDATED",
    getEntityId: (_, input) => input.id,
  },
  handler: async ({ input, tx }) => {
    if (input.defaultDurationMinutes % 15 !== 0) {
      throw new Error("المدة يجب أن تكون من مضاعفات 15 دقيقة (15، 30، 45...)");
    }

    return tx.sessionType.update({
      where: { id: input.id },
      data: {
        category: input.category,
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        defaultDurationMinutes: input.defaultDurationMinutes,
        defaultPricePiasters: input.defaultPricePiasters,
      },
    });
  },
});

export const toggleSessionTypeAction = defineAction({
  actionKey: "admin.settings.manage_clinic",
  schema: z.object({
    id: z.string().uuid(),
    isActive: z.boolean(),
  }),
  audit: {
    entityType: "SessionType",
    actionName: "SESSION_TYPE_STATUS_TOGGLED",
    getEntityId: (_, input) => input.id,
  },
  handler: async ({ input, tx }) => {
    return tx.sessionType.update({
      where: { id: input.id },
      data: { isActive: input.isActive },
    });
  },
});
