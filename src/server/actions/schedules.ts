"use server";

import { z } from "zod";
import { defineAction } from "../defineAction";
import { LeaveType, LeaveStatus } from "@prisma/client";

const timeRegex = /^([01]\d|2[0-3]):(00|15|30|45)$/;

// ============================================================================
// 1. Staff Weekly Schedules (R-1.1-19, R-3-2)
// Allowed for OWNER & MANAGER
// Up to 2 shifts per day, non-overlapping
// ============================================================================

export const getStaffScheduleAction = defineAction({
  actionKey: "admin.staff.manage_schedules",
  schema: z.object({
    userId: z.string().uuid(),
  }),
  handler: async ({ input, tx }) => {
    return tx.staffSchedule.findMany({
      where: { userId: input.userId },
      orderBy: [{ dayOfWeek: "asc" }, { shiftNumber: "asc" }],
    });
  },
});

export const setStaffScheduleAction = defineAction({
  actionKey: "admin.staff.manage_schedules",
  schema: z.object({
    userId: z.string().uuid(),
    schedules: z.array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        shiftNumber: z.number().int().min(1).max(2),
        startTime: z.string().regex(timeRegex),
        endTime: z.string().regex(timeRegex),
        isWorking: z.boolean(),
      })
    ),
  }),
  audit: {
    entityType: "StaffSchedule",
    actionName: "STAFF_SCHEDULE_UPDATED",
    getEntityId: (_, input) => input.userId,
  },
  handler: async ({ input, tx }) => {
    // 0. Validate shift times
    for (const s of input.schedules) {
      if (s.isWorking && s.startTime >= s.endTime) {
        throw new Error("وقت انتهاء الوردية يجب أن يكون بعد وقت بدايتها");
      }
    }

    // 1. Validate shifts per day (max 2 shifts, non-overlapping)
    const shiftsByDay = new Map<number, typeof input.schedules>();
    for (const s of input.schedules) {
      const list = shiftsByDay.get(s.dayOfWeek) || [];
      list.push(s);
      shiftsByDay.set(s.dayOfWeek, list);
    }

    for (const [, shifts] of shiftsByDay.entries()) {
      if (shifts.length > 2) {
        throw new Error("لا يمكن إضافة أكثر من ورديتين في نفس اليوم للموظف.");
      }

      const activeShifts = shifts.filter((s) => s.isWorking);
      if (activeShifts.length === 2) {
        const [shift1, shift2] = activeShifts;
        // Non-overlapping check
        const overlap = !(shift1.endTime <= shift2.startTime || shift2.endTime <= shift1.startTime);
        if (overlap) {
          throw new Error("توجد ورديتان متداخلتان لنفس الموظف في نفس اليوم.");
        }
      }
    }

    // 2. Clear existing schedules for this staff member and insert new ones
    await tx.staffSchedule.deleteMany({
      where: { userId: input.userId },
    });

    const created = [];
    for (const s of input.schedules) {
      const entry = await tx.staffSchedule.create({
        data: {
          userId: input.userId,
          dayOfWeek: s.dayOfWeek,
          shiftNumber: s.shiftNumber,
          startTime: s.startTime,
          endTime: s.endTime,
          isWorking: s.isWorking,
        },
      });
      created.push(entry);
    }

    return created;
  },
});

// ============================================================================
// 2. Staff Leaves (R-1.1-19, R-3-3)
// Allowed for OWNER & MANAGER
// Zero hard-deletion; cancellation via status transition
// ============================================================================

export const listStaffLeavesAction = defineAction({
  actionKey: "admin.staff.manage_schedules",
  schema: z.object({
    userId: z.string().uuid().optional(),
  }).optional().default({}),
  handler: async ({ input, tx }) => {
    return tx.staffLeave.findMany({
      where: input?.userId ? { userId: input.userId } : undefined,
      orderBy: { startDate: "desc" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });
  },
});

export const recordStaffLeaveAction = defineAction({
  actionKey: "admin.staff.manage_schedules",
  schema: z.object({
    userId: z.string().uuid(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    leaveType: z.nativeEnum(LeaveType),
    note: z.string().optional().nullable(),
  }),
  audit: {
    entityType: "StaffLeave",
    actionName: "STAFF_LEAVE_RECORDED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    if (new Date(input.startDate).getTime() > new Date(input.endDate).getTime()) {
      throw new Error("تاريخ بداية الإجازة يجب أن يسبق أو يساوي تاريخ النهاية");
    }

    return tx.staffLeave.create({
      data: {
        userId: input.userId,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        leaveType: input.leaveType,
        status: LeaveStatus.APPROVED,
        note: input.note,
        approvedByUserId: ctx.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });
  },
});

export const cancelStaffLeaveAction = defineAction({
  actionKey: "admin.staff.manage_schedules",
  schema: z.object({
    leaveId: z.string().uuid(),
  }),
  audit: {
    entityType: "StaffLeave",
    actionName: "STAFF_LEAVE_CANCELLED",
    getEntityId: (_, input) => input.leaveId,
  },
  handler: async ({ input, tx }) => {
    return tx.staffLeave.update({
      where: { id: input.leaveId },
      data: { status: LeaveStatus.CANCELLED },
    });
  },
});
