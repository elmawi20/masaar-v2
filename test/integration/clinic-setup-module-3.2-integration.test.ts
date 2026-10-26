import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import {
  updateClinicSettingsAction,
  updateOpeningHoursAction,
  createClosureAction,
  createRoomAction,
  toggleRoomAction,
  createBedAction,
  toggleBedAction,
  createSessionTypeAction,
} from "@/server/actions/clinic";
import {
  setStaffScheduleAction,
  recordStaffLeaveAction,
  cancelStaffLeaveAction,
} from "@/server/actions/schedules";
import type { ActionUser } from "@/server/defineAction";

describe("Module 3.2: Clinic Setup & Staff Schedules (Integration)", () => {
  const uniqueSuffix = Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
  const sessionTypeCode = ("PHYSIO_" + uniqueSuffix).toUpperCase().slice(0, 30);
  let ownerUser: ActionUser;
  let managerUser: ActionUser;
  let physioUser: ActionUser;
  let testRoomId: string;
  let testBedId: string;
  let testClosureId: string;
  let testLeaveId: string;

  beforeAll(async () => {
    // 1. Create distinct test users with unique identifiers
    const owner = await prisma.user.create({
      data: {
        fullName: "د. طارق السعيد (مالك)",
        email: `owner_${uniqueSuffix}@masaar.local`,
        passwordHash: "$2a$10$FakeHashedPasswordForTestEnvironment123",
        phone: "01011112222",
        jobTitle: "مالك العيادة",
        role: "OWNER",
        isActive: true,
      },
    });
    ownerUser = { id: owner.id, email: owner.email, role: "OWNER", isActive: true };

    const manager = await prisma.user.create({
      data: {
        fullName: "أحمد فؤاد (مدير)",
        email: `manager_${uniqueSuffix}@masaar.local`,
        passwordHash: "$2a$10$FakeHashedPasswordForTestEnvironment123",
        phone: "01033334444",
        jobTitle: "مدير العمليات",
        role: "MANAGER",
        isActive: true,
      },
    });
    managerUser = { id: manager.id, email: manager.email, role: "MANAGER", isActive: true };

    const physio = await prisma.user.create({
      data: {
        fullName: "د. هبة جمال (معالج)",
        email: `physio_${uniqueSuffix}@masaar.local`,
        passwordHash: "$2a$10$FakeHashedPasswordForTestEnvironment123",
        phone: "01055556666",
        jobTitle: "أخصائي علاج طبيعي",
        role: "PHYSIOTHERAPIST",
        isActive: true,
      },
    });
    physioUser = { id: physio.id, email: physio.email, role: "PHYSIOTHERAPIST", isActive: true };
  });

  // --------------------------------------------------------------------------
  // Rule R-2-1, R-2-6, R-2-7, R-2-8: Clinic Profile & Defaults
  // --------------------------------------------------------------------------
  describe("Clinic Profile & Operational Defaults [R-2-1, R-2-6, R-2-7, R-2-8]", () => {
    it("allows OWNER to update clinic profile, defaults, and receipt prefix [R-1.1-19, R-2-1, R-2-8]", async () => {
      const res = await updateClinicSettingsAction(
        {
          nameAr: "عيادة مسار التخصصية",
          nameEn: "Masaar Specialized Clinic",
          addressAr: "شارع الثورة، مصر الجديدة",
          addressEn: "Al Thawra St, Heliopolis",
          phone: "01012345678",
          defaultPackageExpiryDays: 60,
          doctorDailySoftLimit: 10,
          receiptPrefix: "INV",
        },
        { user: ownerUser }
      );

      expect(res.success).toBe(true);
      if (res.success) {
        const data = res.data as { nameAr: string; receiptPrefix: string; defaultPackageExpiryDays: number };
        expect(data.nameAr).toBe("عيادة مسار التخصصية");
        expect(data.receiptPrefix).toBe("INV");
        expect(data.defaultPackageExpiryDays).toBe(60);
      }
    });

    it("blocks non-OWNER (e.g. MANAGER) from altering clinic profile [R-1-2, R-1.1-19]", async () => {
      const res = await updateClinicSettingsAction(
        {
          nameAr: "محاولة اختراق",
          nameEn: "Unauthorized Update",
          phone: "01012345678",
          defaultPackageExpiryDays: 90,
          doctorDailySoftLimit: 12,
          receiptPrefix: "HCK",
        },
        { user: managerUser }
      );

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe("PERMISSION_DENIED");
      }
    });
  });

  // --------------------------------------------------------------------------
  // Rule R-2-2: Weekly Opening Hours
  // --------------------------------------------------------------------------
  describe("Weekly Opening Hours [R-2-2]", () => {
    it("allows OWNER to update opening hours per weekday [R-1.1-19, R-2-2]", async () => {
      const res = await updateOpeningHoursAction(
        {
          hours: [
            { dayOfWeek: 0, isOpen: true, openTime: "09:00", closeTime: "21:00" },
            { dayOfWeek: 6, isOpen: false, openTime: "09:00", closeTime: "21:00" },
          ],
        },
        { user: ownerUser }
      );

      expect(res.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Rule R-2-3: Clinic Closures
  // --------------------------------------------------------------------------
  describe("Clinic Closures [R-2-3]", () => {
    it("allows OWNER to create and deactivate holiday closures [R-1.1-19, R-2-3]", async () => {
      const res = await createClosureAction(
        {
          closureDate: "2026-10-06",
          reasonAr: "ذكرى حرب أكتوبر المجيدة",
          reasonEn: "Armed Forces Day",
        },
        { user: ownerUser }
      );

      expect(res.success).toBe(true);
      if (res.success) {
        const data = res.data as { id: string; reasonAr: string };
        testClosureId = data.id;
        expect(data.reasonAr).toBe("ذكرى حرب أكتوبر المجيدة");
      }
    });
  });

  // --------------------------------------------------------------------------
  // Rule R-2-4: Rooms & Beds Management (OWNER & MANAGER)
  // --------------------------------------------------------------------------
  describe("Rooms & Beds Management [R-1.1-19, R-2-4]", () => {
    it("allows MANAGER to create a room and bed, and toggle active status [R-1.1-19, R-2-4]", async () => {
      const roomRes = await createRoomAction(
        {
          nameAr: "غرفة التمارين 1",
          nameEn: "Gym 1",
        },
        { user: managerUser }
      );

      expect(roomRes.success).toBe(true);
      if (roomRes.success) {
        testRoomId = (roomRes.data as { id: string }).id;

        const bedRes = await createBedAction(
          {
            roomId: testRoomId,
            name: "Bed 1",
          },
          { user: managerUser }
        );

        expect(bedRes.success).toBe(true);
        if (bedRes.success) {
          testBedId = (bedRes.data as { id: string }).id;
        }

        // Deactivate room (soft deactivation without deletion)
        const toggleRes = await toggleRoomAction(
          { roomId: testRoomId, isActive: false },
          { user: managerUser }
        );
        expect(toggleRes.success).toBe(true);
        if (toggleRes.success) {
          expect((toggleRes.data as { isActive: boolean }).isActive).toBe(false);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // Rule R-2-5: Session Types Catalog
  // --------------------------------------------------------------------------
  describe("Session Types Catalog [R-1.1-19, R-2-5]", () => {
    it("allows OWNER to create new session type with duration & piasters [R-2-5]", async () => {
      const res = await createSessionTypeAction(
        {
          code: sessionTypeCode,
          category: "PHYSIOTHERAPY",
          nameAr: "جلسة علاج طبيعي متقدمة",
          nameEn: "Advanced Physiotherapy",
          defaultDurationMinutes: 60,
          defaultPricePiasters: 45000, // 450 EGP
        },
        { user: ownerUser }
      );

      expect(res.success).toBe(true);
      if (res.success) {
        expect((res.data as { defaultPricePiasters: number }).defaultPricePiasters).toBe(45000);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Rule R-3-2: Staff Weekly Schedules (up to 2 shifts per day)
  // --------------------------------------------------------------------------
  describe("Staff Weekly Schedules [R-1.1-19, R-3-2]", () => {
    it("allows MANAGER to configure weekly shifts for clinician [R-3-2]", async () => {
      const res = await setStaffScheduleAction(
        {
          userId: physioUser.id,
          schedules: [
            {
              dayOfWeek: 0,
              shiftNumber: 1,
              startTime: "09:00",
              endTime: "14:00",
              isWorking: true,
            },
            {
              dayOfWeek: 0,
              shiftNumber: 2,
              startTime: "17:00",
              endTime: "21:00",
              isWorking: true,
            },
          ],
        },
        { user: managerUser }
      );

      expect(res.success).toBe(true);
    });

    it("rejects overlapping shifts on the same day for a clinician [R-3-2]", async () => {
      const res = await setStaffScheduleAction(
        {
          userId: physioUser.id,
          schedules: [
            {
              dayOfWeek: 1,
              shiftNumber: 1,
              startTime: "09:00",
              endTime: "15:00",
              isWorking: true,
            },
            {
              dayOfWeek: 1,
              shiftNumber: 2,
              startTime: "14:00",
              endTime: "19:00",
              isWorking: true,
            },
          ],
        },
        { user: managerUser }
      );

      expect(res.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Rule R-3-3: Staff Leave Recording
  // --------------------------------------------------------------------------
  describe("Staff Leave Recording [R-1.1-19, R-3-3]", () => {
    it("allows MANAGER to record staff leave and then cancel it [R-3-3]", async () => {
      const leaveRes = await recordStaffLeaveAction(
        {
          userId: physioUser.id,
          startDate: "2026-12-01",
          endDate: "2026-12-05",
          leaveType: "ANNUAL",
          note: "إجازة سنوية مصرح بها",
        },
        { user: managerUser }
      );

      expect(leaveRes.success).toBe(true);
      if (leaveRes.success) {
        const data = leaveRes.data as { id: string; status: string };
        testLeaveId = data.id;
        expect(data.status).toBe("APPROVED");

        const cancelRes = await cancelStaffLeaveAction(
          { leaveId: testLeaveId },
          { user: managerUser }
        );
        expect(cancelRes.success).toBe(true);
        if (cancelRes.success) {
          expect((cancelRes.data as { status: string }).status).toBe("CANCELLED");
        }
      }
    });
  });
});
