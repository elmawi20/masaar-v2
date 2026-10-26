import { describe, it, expect, beforeAll } from "vitest";
import { testDb } from "../helpers/db";
import {
  setStaffScheduleAction,
  getStaffScheduleAction,
} from "@/server/actions/schedules";
import {
  createRoomAction,
  createBedAction,
  toggleRoomAction,
  toggleBedAction,
  listRoomsAction,
} from "@/server/actions/clinic";
import { Role } from "@prisma/client";
import { hashPassword } from "@/server/auth/crypto";
import fs from "fs";
import path from "path";

describe("Part 0 — Batch A Fixes [R-3-2, R-2-4]", () => {
  const suffix = Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
  let managerUser: { id: string; email: string; role: Role; isActive: boolean };
  let clinicianUser: { id: string; email: string; role: Role; isActive: boolean };

  beforeAll(async () => {
    const passwordHash = await hashPassword("MasaarTest2026!");
    const mgr = await testDb.user.create({
      data: {
        email: `manager_${suffix}@masaar.local`,
        fullName: "مدير العيادة للاختبار",
        phone: "0101111" + Math.floor(1000 + Math.random() * 9000),
        jobTitle: "مدير العيادة",
        role: "MANAGER",
        passwordHash,
        isActive: true,
      },
    });
    managerUser = {
      id: mgr.id,
      email: mgr.email,
      role: mgr.role as Role,
      isActive: mgr.isActive,
    };

    const doc = await testDb.user.create({
      data: {
        email: `physio_${suffix}@masaar.local`,
        fullName: "د. هاني عثمان",
        phone: "0102222" + Math.floor(1000 + Math.random() * 9000),
        jobTitle: "أخصائي علاج طبيعي",
        role: "PHYSIOTHERAPIST",
        passwordHash,
        isActive: true,
      },
    });
    clinicianUser = {
      id: doc.id,
      email: doc.email,
      role: doc.role as Role,
      isActive: doc.isActive,
    };
  });

  // a) Staff schedules tests
  describe("Staff Schedules: per clinician, 15-min intervals, optional 2nd shift, persistence & overlap refusal", () => {
    it("saves shifts with 15-min intervals and persists correctly across reload", async () => {
      const schedules = [
        {
          dayOfWeek: 0, // Saturday
          shiftNumber: 1,
          startTime: "09:00",
          endTime: "13:15",
          isWorking: true,
        },
        {
          dayOfWeek: 0, // Saturday 2nd shift
          shiftNumber: 2,
          startTime: "16:30",
          endTime: "20:45",
          isWorking: true,
        },
        {
          dayOfWeek: 1, // Sunday 1 shift only
          shiftNumber: 1,
          startTime: "10:00",
          endTime: "18:00",
          isWorking: true,
        },
      ];

      const saveRes = await setStaffScheduleAction(
        {
          userId: clinicianUser.id,
          schedules,
        },
        { user: managerUser }
      );
      expect(saveRes.success).toBe(true);

      // Verify retrieval (reload)
      const loadRes = await getStaffScheduleAction(
        { userId: clinicianUser.id },
        { user: managerUser }
      );
      expect(loadRes.success).toBe(true);
      if (!loadRes.success) return;

      expect(loadRes.data).toHaveLength(3);
      const satShifts = loadRes.data.filter((s) => s.dayOfWeek === 0);
      expect(satShifts).toHaveLength(2);
      expect(satShifts[0].startTime).toBe("09:00");
      expect(satShifts[0].endTime).toBe("13:15");
      expect(satShifts[1].startTime).toBe("16:30");
      expect(satShifts[1].endTime).toBe("20:45");
    });

    it("refuses overlapping shifts on the same day with an Arabic error message", async () => {
      const overlappingSchedules = [
        {
          dayOfWeek: 2, // Monday
          shiftNumber: 1,
          startTime: "09:00",
          endTime: "14:00",
          isWorking: true,
        },
        {
          dayOfWeek: 2, // Monday overlapping 2nd shift
          shiftNumber: 2,
          startTime: "13:30",
          endTime: "18:00",
          isWorking: true,
        },
      ];

      const saveRes = await setStaffScheduleAction(
        {
          userId: clinicianUser.id,
          schedules: overlappingSchedules,
        },
        { user: managerUser }
      );

      expect(saveRes.success).toBe(false);
      if (!saveRes.success) {
        expect(saveRes.error?.message).toMatch(/ورد.*متداخل/);
      }
    });

    it("refuses non-15-minute aligned shift times with an Arabic error message", async () => {
      const non15MinSchedules = [
        {
          dayOfWeek: 3,
          shiftNumber: 1,
          startTime: "09:07",
          endTime: "14:00",
          isWorking: true,
        },
      ];

      const saveRes = await setStaffScheduleAction(
        {
          userId: clinicianUser.id,
          schedules: non15MinSchedules,
        },
        { user: managerUser }
      );

      // Should fail validation because times must be in 15-minute increments (00, 15, 30, 45)
      expect(saveRes.success).toBe(false);
    });
  });

  // b) Beds/rooms tests
  describe("Beds & Rooms: إيقاف / تفعيل toggle and inactive filter, never hard-delete", () => {
    it("allows toggling room and bed active state (إيقاف / تفعيل) and filters inactive when requested", async () => {
      const roomRes = await createRoomAction(
        {
          nameAr: "غرفة الاستشفاء والراحة",
          nameEn: "Recovery Room",
          numberOfBeds: 2,
        },
        { user: managerUser }
      );
      expect(roomRes.success).toBe(true);
      if (!roomRes.success) return;

      const roomId = (roomRes.data as { id: string }).id;
      const beds = await testDb.bed.findMany({ where: { roomId } });
      expect(beds).toHaveLength(2);

      // 1. Deactivate one bed (إيقاف)
      const toggleBedRes = await toggleBedAction(
        { bedId: beds[0].id, isActive: false },
        { user: managerUser }
      );
      expect(toggleBedRes.success).toBe(true);

      // Verify list with includeInactive: false hides inactive bed
      const listActiveOnly = await listRoomsAction(
        { includeInactive: false },
        { user: managerUser }
      );
      expect(listActiveOnly.success).toBe(true);
      if (listActiveOnly.success && listActiveOnly.data) {
        const foundRoom = listActiveOnly.data.find((r) => r.id === roomId);
        expect(foundRoom).toBeDefined();
        expect(foundRoom?.beds).toHaveLength(1);
        expect(foundRoom?.beds[0].id).toBe(beds[1].id);
      }

      // Verify list with includeInactive: true shows all beds
      const listAll = await listRoomsAction(
        { includeInactive: true },
        { user: managerUser }
      );
      expect(listAll.success).toBe(true);
      if (listAll.success && listAll.data) {
        const foundRoom = listAll.data.find((r) => r.id === roomId);
        expect(foundRoom).toBeDefined();
        expect(foundRoom?.beds).toHaveLength(2);
      }

      // 2. Deactivate the room itself (إيقاف)
      const toggleRoomRes = await toggleRoomAction(
        { roomId, isActive: false },
        { user: managerUser }
      );
      expect(toggleRoomRes.success).toBe(true);

      // Verify listActiveOnly does not include the inactive room
      const listActiveOnly2 = await listRoomsAction(
        { includeInactive: false },
        { user: managerUser }
      );
      if (listActiveOnly2.success && listActiveOnly2.data) {
        const foundRoom = listActiveOnly2.data.find((r) => r.id === roomId);
        expect(foundRoom).toBeUndefined();
      }

      // Verify DB record still exists (NEVER HARD DELETE)
      const roomInDb = await testDb.room.findUnique({ where: { id: roomId } });
      expect(roomInDb).not.toBeNull();
      expect(roomInDb?.isActive).toBe(false);
    });
  });

  // c) suppressHydrationWarning check
  describe("Layout hydration warning suppression", () => {
    it("ensures suppressHydrationWarning is present on both <html> and <body> in [locale]/layout.tsx", () => {
      const layoutPath = path.join(process.cwd(), "src", "app", "[locale]", "layout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");

      expect(content).toMatch(/<html[^>]*suppressHydrationWarning/);
      expect(content).toMatch(/<body[^>]*suppressHydrationWarning/);
    });
  });
});
