import { describe, it, expect } from "vitest";
import { z } from "zod";

// ============================================================================
// Module 3.2: Clinic Setup & Staff Schedules (Unit Test Suite)
// Rules: R-2-1, R-2-2, R-2-3, R-2-4, R-2-5, R-2-6, R-2-7, R-2-8, R-3-2, R-3-3
// ============================================================================

describe("Module 3.2: Clinic Setup & Staff Schedules", () => {
  // --------------------------------------------------------------------------
  // Rule R-2-1: Clinic profile configuration
  // Bilingual name, address, phone, logo URL, timezone Africa/Cairo
  // --------------------------------------------------------------------------
  describe("Clinic Profile Configuration [R-2-1]", () => {
    const clinicProfileSchema = z.object({
      nameAr: z.string().min(2).max(120),
      nameEn: z.string().min(2).max(120),
      addressAr: z.string().optional().nullable(),
      addressEn: z.string().optional().nullable(),
      phone: z.string().regex(/^01[0125][0-9]{8}$|^(\+20|0020)1[0125][0-9]{8}$|^02[0-9]{8}$/),
      logoUrl: z.string().url().optional().nullable().or(z.literal("")),
      timezone: z.string().default("Africa/Cairo"),
    });

    it("accepts valid bilingual clinic profile with Egyptian phone", () => {
      const valid = clinicProfileSchema.safeParse({
        nameAr: "عيادة مسار للعلاج الطبيعي والتغذية",
        nameEn: "Masaar Clinic for Physiotherapy & Nutrition",
        addressAr: "مصر الجديدة، القاهرة",
        addressEn: "Heliopolis, Cairo",
        phone: "01012345678",
        logoUrl: "https://masaar.local/logo.png",
        timezone: "Africa/Cairo",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects clinic profile with missing Arabic or English name", () => {
      const invalid = clinicProfileSchema.safeParse({
        nameAr: "",
        nameEn: "Masaar Clinic",
        phone: "01012345678",
      });
      expect(invalid.success).toBe(false);
    });

    it("rejects invalid phone numbers not matching Egyptian formats", () => {
      const invalid = clinicProfileSchema.safeParse({
        nameAr: "عيادة مسار",
        nameEn: "Masaar Clinic",
        phone: "123456",
      });
      expect(invalid.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Rule R-2-2: Weekly operating hours per weekday (Sat-Fri, day 0-6)
  // --------------------------------------------------------------------------
  describe("Weekly Operating Hours [R-2-2]", () => {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    const openingHourSchema = z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      isOpen: z.boolean(),
      openTime: z.string().regex(timeRegex),
      closeTime: z.string().regex(timeRegex),
    }).refine((data) => {
      if (!data.isOpen) return true;
      return data.openTime < data.closeTime;
    }, {
      message: "وقت الإغلاق يجب أن يكون بعد وقت الفتح",
    });

    it("validates standard Saturday operating day (09:00 to 21:00)", () => {
      const res = openingHourSchema.safeParse({
        dayOfWeek: 0, // Saturday
        isOpen: true,
        openTime: "09:00",
        closeTime: "21:00",
      });
      expect(res.success).toBe(true);
    });

    it("accepts Friday when marked as closed", () => {
      const res = openingHourSchema.safeParse({
        dayOfWeek: 6, // Friday
        isOpen: false,
        openTime: "09:00",
        closeTime: "21:00",
      });
      expect(res.success).toBe(true);
    });

    it("rejects open day when closeTime is before or equal to openTime", () => {
      const res = openingHourSchema.safeParse({
        dayOfWeek: 1, // Sunday
        isOpen: true,
        openTime: "18:00",
        closeTime: "09:00",
      });
      expect(res.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Rule R-2-3: Clinic closures / holidays
  // --------------------------------------------------------------------------
  describe("Clinic Closures [R-2-3]", () => {
    const closureSchema = z.object({
      closureDate: z.date().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
      reasonAr: z.string().min(2).max(150),
      reasonEn: z.string().min(2).max(150),
      isActive: z.boolean().default(true),
    });

    it("accepts valid holiday closure with bilingual description", () => {
      const res = closureSchema.safeParse({
        closureDate: "2026-10-06",
        reasonAr: "عطلة ذكرى نصر أكتوبر",
        reasonEn: "Armed Forces Day Holiday",
        isActive: true,
      });
      expect(res.success).toBe(true);
    });

    it("rejects closure without reason in both languages", () => {
      const res = closureSchema.safeParse({
        closureDate: "2026-10-06",
        reasonAr: "عطلة رسمية",
        reasonEn: "",
      });
      expect(res.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Rule R-2-4: Rooms & Beds Configuration
  // Active flag, zero hard delete, uniqueness of bed name per room
  // --------------------------------------------------------------------------
  describe("Rooms and Beds Catalog [R-2-4]", () => {
    const roomSchema = z.object({
      nameAr: z.string().min(2).max(100),
      nameEn: z.string().min(2).max(100),
      isActive: z.boolean().default(true),
    });

    const bedSchema = z.object({
      roomId: z.string().uuid(),
      name: z.string().min(1).max(100),
      isActive: z.boolean().default(true),
    });

    it("validates room and bed models with bilingual names", () => {
      const roomRes = roomSchema.safeParse({
        nameAr: "غرفة العلاج الكهربائي 1",
        nameEn: "Electrotherapy Room 1",
        isActive: true,
      });
      expect(roomRes.success).toBe(true);

      const bedRes = bedSchema.safeParse({
        roomId: "11111111-2222-3333-4444-555555555555",
        name: "سرير أ (Bed A)",
        isActive: true,
      });
      expect(bedRes.success).toBe(true);
    });

    it("requires bed name to not be empty", () => {
      const bedRes = bedSchema.safeParse({
        roomId: "11111111-2222-3333-4444-555555555555",
        name: "",
      });
      expect(bedRes.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Rule R-2-5: Session Types Catalog & Pricing
  // Integer piasters, duration in 15m steps (15..180)
  // --------------------------------------------------------------------------
  describe("Session Types Catalog [R-2-5]", () => {
    const sessionTypeSchema = z.object({
      code: z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/),
      category: z.enum(["PHYSIOTHERAPY", "NUTRITION", "CONSULTANT_ASSESSMENT"]),
      nameAr: z.string().min(2).max(120),
      nameEn: z.string().min(2).max(120),
      defaultDurationMinutes: z.number().int().min(15).max(180).refine((m) => m % 15 === 0, {
        message: "المدة يجب أن تكون من مضاعفات 15 دقيقة",
      }),
      defaultPricePiasters: z.number().int().min(0),
      isActive: z.boolean().default(true),
    });

    it("validates physiotherapy session (45 minutes, 350 EGP = 35000 piasters)", () => {
      const res = sessionTypeSchema.safeParse({
        code: "PHYSIO_STANDARD",
        category: "PHYSIOTHERAPY",
        nameAr: "جلسة علاج طبيعي قياسية",
        nameEn: "Standard Physiotherapy Session",
        defaultDurationMinutes: 45,
        defaultPricePiasters: 35000,
        isActive: true,
      });
      expect(res.success).toBe(true);
    });

    it("rejects duration not in 15-minute increments (e.g. 40 minutes)", () => {
      const res = sessionTypeSchema.safeParse({
        code: "PHYSIO_INVALID",
        category: "PHYSIOTHERAPY",
        nameAr: "جلسة غير صالحة",
        nameEn: "Invalid Session",
        defaultDurationMinutes: 40,
        defaultPricePiasters: 35000,
      });
      expect(res.success).toBe(false);
    });

    it("rejects non-integer or negative price", () => {
      const res = sessionTypeSchema.safeParse({
        code: "PHYSIO_INVALID",
        category: "PHYSIOTHERAPY",
        nameAr: "جلسة غير صالحة",
        nameEn: "Invalid Session",
        defaultDurationMinutes: 45,
        defaultPricePiasters: -100,
      });
      expect(res.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Rule R-2-6, R-2-7, R-2-8: Clinic Defaults & Prefix
  // --------------------------------------------------------------------------
  describe("Clinic Operational Defaults [R-2-6, R-2-7, R-2-8]", () => {
    const settingsSchema = z.object({
      defaultPackageExpiryDays: z.number().int().min(1).default(60),
      doctorDailySoftLimit: z.number().int().min(1).default(10),
      receiptPrefix: z.string().min(1).max(10).regex(/^[A-Z0-9]+$/).default("INV"),
    });

    it("defaults package validity to 60 days [R-2-6]", () => {
      const res = settingsSchema.parse({});
      expect(res.defaultPackageExpiryDays).toBe(60);
    });

    it("defaults doctor daily soft limit to 10 sessions [R-2-7]", () => {
      const res = settingsSchema.parse({});
      expect(res.doctorDailySoftLimit).toBe(10);
    });

    it("defaults receipt prefix to INV [R-2-8]", () => {
      const res = settingsSchema.parse({});
      expect(res.receiptPrefix).toBe("INV");
    });
  });

  // --------------------------------------------------------------------------
  // Rule R-3-2: Staff Weekly Schedules (up to 2 shifts per day)
  // Non-overlapping shifts on same day
  // --------------------------------------------------------------------------
  describe("Staff Weekly Shifts [R-3-2]", () => {
    interface Shift {
      shiftNumber: number;
      startTime: string;
      endTime: string;
      isWorking: boolean;
    }

    function validateDayShifts(shifts: Shift[]): boolean {
      if (shifts.length > 2) return false;
      const activeShifts = shifts.filter((s) => s.isWorking);
      if (activeShifts.length <= 1) return true;

      const [shift1, shift2] = activeShifts;
      if (shift1.startTime >= shift1.endTime) return false;
      if (shift2.startTime >= shift2.endTime) return false;

      // Ensure no overlap between shift 1 and shift 2
      const s1End = shift1.endTime;
      const s2Start = shift2.startTime;
      const s2End = shift2.endTime;
      const s1Start = shift1.startTime;

      // Shift 1 must end before shift 2 starts or shift 2 must end before shift 1 starts
      return s1End <= s2Start || s2End <= s1Start;
    }

    it("allows up to 2 distinct, non-overlapping shifts per day (Morning 09:00-14:00, Evening 17:00-21:00)", () => {
      const shifts: Shift[] = [
        { shiftNumber: 1, startTime: "09:00", endTime: "14:00", isWorking: true },
        { shiftNumber: 2, startTime: "17:00", endTime: "21:00", isWorking: true },
      ];
      expect(validateDayShifts(shifts)).toBe(true);
    });

    it("rejects overlapping shifts on the same day (e.g. 09:00-15:00 and 14:00-19:00)", () => {
      const shifts: Shift[] = [
        { shiftNumber: 1, startTime: "09:00", endTime: "15:00", isWorking: true },
        { shiftNumber: 2, startTime: "14:00", endTime: "19:00", isWorking: true },
      ];
      expect(validateDayShifts(shifts)).toBe(false);
    });

    it("rejects more than 2 shifts in a single day", () => {
      const shifts: Shift[] = [
        { shiftNumber: 1, startTime: "09:00", endTime: "12:00", isWorking: true },
        { shiftNumber: 2, startTime: "13:00", endTime: "16:00", isWorking: true },
        { shiftNumber: 3, startTime: "17:00", endTime: "20:00", isWorking: true },
      ];
      expect(validateDayShifts(shifts)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Rule R-3-3: Staff Leave Recording
  // Date range, leave type (ANNUAL, SICK, UNPAID, OTHER), status, note
  // --------------------------------------------------------------------------
  describe("Staff Leave Recording [R-3-3]", () => {
    const leaveSchema = z.object({
      userId: z.string().uuid(),
      startDate: z.date().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
      endDate: z.date().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
      leaveType: z.enum(["ANNUAL", "SICK", "UNPAID", "OTHER"]),
      status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).default("APPROVED"),
      note: z.string().optional().nullable(),
    }).refine((data) => {
      const start = new Date(data.startDate).getTime();
      const end = new Date(data.endDate).getTime();
      return start <= end;
    }, {
      message: "تاريخ بداية الإجازة يجب أن يكون مساوياً أو قبل تاريخ النهاية",
    });

    it("accepts valid staff leave request within date range", () => {
      const res = leaveSchema.safeParse({
        userId: "11111111-2222-3333-4444-555555555555",
        startDate: "2026-11-01",
        endDate: "2026-11-05",
        leaveType: "ANNUAL",
        status: "APPROVED",
        note: "إجازة سنوية اعتيادية",
      });
      expect(res.success).toBe(true);
    });

    it("rejects leave where startDate is after endDate", () => {
      const res = leaveSchema.safeParse({
        userId: "11111111-2222-3333-4444-555555555555",
        startDate: "2026-11-10",
        endDate: "2026-11-05",
        leaveType: "ANNUAL",
      });
      expect(res.success).toBe(false);
    });
  });
});
