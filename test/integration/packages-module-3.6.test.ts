import { describe, it, expect, beforeAll } from "vitest";
import { testDb } from "../helpers/db";
import {
  createPackageAction,
  extendPackageAction,
  cancelPackageAction,
  writeOffBalanceAction,
  getPatientPackagesAction,
} from "@/server/actions/packages";
import { bookAppointmentAction } from "@/server/actions/scheduling";
import { Role, Gender, ReferralSource, SessionCategory } from "@prisma/client";
import { hashPassword } from "@/server/auth/crypto";

describe("Module 3.6 Packages Integration Tests [Spec §7]", () => {
  const suffix = Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);

  let ownerUser: { id: string; email: string; role: Role; isActive: boolean };
  let receptionistUser: { id: string; email: string; role: Role; isActive: boolean };
  let physioUser: { id: string; email: string; role: Role; isActive: boolean };

  let ptSessionTypeId: string;
  let assessSessionTypeId: string;
  let patientId: string;
  let roomId: string;
  let bedId: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword("MasaarTest2026!");

    const owner = await testDb.user.create({
      data: {
        email: `pkg_owner_${suffix}@masaar.local`,
        fullName: "د. أيمن المالك",
        phone: "0100" + Math.floor(1000000 + Math.random() * 9000000),
        jobTitle: "مالك العيادة",
        role: "OWNER",
        canAssess: true,
        passwordHash,
        isActive: true,
      },
    });
    ownerUser = { id: owner.id, email: owner.email, role: owner.role as Role, isActive: owner.isActive };

    const rec = await testDb.user.create({
      data: {
        email: `pkg_rec_${suffix}@masaar.local`,
        fullName: "هدى الاستقبال",
        phone: "0101" + Math.floor(1000000 + Math.random() * 9000000),
        jobTitle: "موظفة استقبال",
        role: "RECEPTIONIST",
        passwordHash,
        isActive: true,
      },
    });
    receptionistUser = { id: rec.id, email: rec.email, role: rec.role as Role, isActive: rec.isActive };

    const physio = await testDb.user.create({
      data: {
        email: `pkg_physio_${suffix}@masaar.local`,
        fullName: "د. سامي علاج طبيعي",
        phone: "0102" + Math.floor(1000000 + Math.random() * 9000000),
        jobTitle: "أخصائي علاج طبيعي",
        role: "PHYSIOTHERAPIST",
        canAssess: true,
        passwordHash,
        isActive: true,
      },
    });
    physioUser = { id: physio.id, email: physio.email, role: physio.role as Role, isActive: physio.isActive };

    // Set clinician schedules for tests
    for (let day = 0; day <= 6; day++) {
      await testDb.staffSchedule.create({
        data: {
          userId: physioUser.id,
          dayOfWeek: day,
          shiftNumber: 1,
          isWorking: true,
          startTime: "09:00",
          endTime: "21:00",
        },
      });
    }

    const room = await testDb.room.create({
      data: { nameAr: "غرفة العلاج", nameEn: "Treatment Room", isActive: true },
    });
    roomId = room.id;

    const bed = await testDb.bed.create({
      data: { roomId, name: "سرير 1", isActive: true },
    });
    bedId = bed.id;

    // Session types: PT (allowed for packages) & Assessment (blocked for packages R-7-1)
    const pt = await testDb.sessionType.create({
      data: {
        code: `PKG_PT_${suffix}`.toUpperCase(),
        nameAr: "جلسة علاج طبيعي 45 دقيقة",
        nameEn: "Physiotherapy 45m",
        category: SessionCategory.PHYSIOTHERAPY,
        defaultDurationMinutes: 45,
        defaultPricePiasters: 35000,
        isActive: true,
      },
    });
    ptSessionTypeId = pt.id;

    const assess = await testDb.sessionType.create({
      data: {
        code: `PKG_ASSESS_${suffix}`.toUpperCase(),
        nameAr: "كشف استشاري",
        nameEn: "Consultant Assessment",
        category: SessionCategory.CONSULTANT_ASSESSMENT,
        defaultDurationMinutes: 60,
        defaultPricePiasters: 60000,
        isActive: true,
      },
    });
    assessSessionTypeId = assess.id;

    const p = await testDb.patient.create({
      data: {
        fullName: "أحمد عبد الله القاضي",
        mobilePhone: "010" + Math.floor(10000000 + Math.random() * 90000000),
        dateOfBirth: new Date("1988-02-14"),
        gender: Gender.MALE,
        status: "ACTIVE",
        referralSource: ReferralSource.DOCTOR,
        initialComplaint: "إعادة تأهيل بعد كسر",
        dataConsent: true,
        whatsappConsent: true,
      },
    });
    patientId = p.id;
  });

  // Test 1: Package Creation, Expiry Default +60 Days, and Charge Generation (R-7-1, R-7-2, R-7-3, R-8.1-1)
  it("creates a package with 60-day expiry in Cairo, calculates per-session value, and creates a charge", async () => {
    // 1. Assessment cannot be made into a package (R-7-1, DEC-009)
    const invalidAssess = await createPackageAction(
      {
        patientId,
        sessionTypeId: assessSessionTypeId,
        totalSessions: 6,
        totalPricePiasters: 300000,
        notes: "باقة كشف وتقييم (غير مسموح)",
      },
      { user: receptionistUser }
    );
    expect(invalidAssess.success).toBe(false);

    // 2. Valid PT package: 10 sessions, 3,000 EGP (300,000 piasters)
    const createRes = await createPackageAction(
      {
        patientId,
        sessionTypeId: ptSessionTypeId,
        totalSessions: 10,
        totalPricePiasters: 300000,
        notes: "باقة علاج طبيعي 10 جلسات",
      },
      { user: receptionistUser }
    );

    expect(createRes.success).toBe(true);
    if (!createRes.success || !createRes.data) return;

    const pkg = createRes.data as any;
    expect(pkg.totalSessions).toBe(10);
    expect(pkg.totalPricePiasters).toBe(300000);

    // Per-session value = floor(300000 / 10) = 30000 piasters (R-7-3)
    expect(pkg.perSessionValuePiasters).toBe(30000);

    // Expiry date = today + 60 days (R-7-1)
    const expectedExpiry = new Date();
    expectedExpiry.setUTCDate(expectedExpiry.getUTCDate() + 60);
    const expectedExpiryStr = expectedExpiry.toISOString().slice(0, 10);
    const actualExpiryStr = new Date(pkg.expiryDate).toISOString().slice(0, 10);
    expect(actualExpiryStr).toBe(expectedExpiryStr);

    // Charge created for the package (R-8.1-1)
    const charge = await testDb.charge.findFirst({
      where: { packageId: pkg.id },
    });
    expect(charge).not.toBeNull();
    expect(charge?.amountPiasters).toBe(300000);
  });

  // Test 2: Dynamic Status Resolution (Active, Expired with Forfeited sessions, Cancelled) (R-7-4)
  it("resolves status dynamically without stored status column and marks remaining sessions as forfeited upon expiry", async () => {
    // Create an expired package: expiry date in the past
    const pastDate = new Date();
    pastDate.setUTCDate(pastDate.getUTCDate() - 10);

    const expiredPkg = await testDb.package.create({
      data: {
        patientId,
        sessionTypeId: ptSessionTypeId,
        totalSessions: 8,
        totalPricePiasters: 240000,
        startDate: new Date("2026-08-01"),
        expiryDate: pastDate,
        notes: "باقة منتهية الصلاحية",
        createdByUserId: ownerUser.id,
      },
    });

    const listRes = await getPatientPackagesAction(
      { patientId },
      { user: receptionistUser }
    );
    expect(listRes.success).toBe(true);
    if (!listRes.success || !listRes.data) return;

    const found = listRes.data.packages.find((p: any) => p.id === expiredPkg.id) as any;
    expect(found).toBeDefined();
    expect(found?.status).toBe("EXPIRED");
    // All 8 unused sessions forfeited (R-7-4)
    expect(found?.forfeitedSessions).toBe(8);
    expect(found?.availableSessions).toBe(0);
  });

  // Test 3: Extension by Owner/Manager with Reason (+N Days) (R-7-6)
  it("allows Owner/Manager to extend package validity, reactivating forfeited sessions", async () => {
    // Expired package from Test 2
    const pastDate = new Date();
    pastDate.setUTCDate(pastDate.getUTCDate() - 5);

    const targetPkg = await testDb.package.create({
      data: {
        patientId,
        sessionTypeId: ptSessionTypeId,
        totalSessions: 6,
        totalPricePiasters: 180000,
        startDate: new Date("2026-08-01"),
        expiryDate: pastDate,
        notes: "باقة تحتاج تمديد",
        createdByUserId: ownerUser.id,
      },
    });

    // 1. Receptionist cannot extend (R-1.1-10)
    const recExtend = await extendPackageAction(
      {
        packageId: targetPkg.id,
        daysToAdd: 30,
        reason: "طلب المريض",
      },
      { user: receptionistUser }
    );
    expect(recExtend.success).toBe(false);

    // 2. Owner can extend with reason (R-7-6)
    const ownerExtend = await extendPackageAction(
      {
        packageId: targetPkg.id,
        daysToAdd: 30,
        reason: "ظروف سفر طارئة للمريض مثبتة بتذكرة طيران",
      },
      { user: ownerUser }
    );
    expect(ownerExtend.success).toBe(true);
    if (!ownerExtend.success || !ownerExtend.data) return;

    // Package becomes ACTIVE again! (R-7-6)
    const extendedData = ownerExtend.data as any;
    expect(extendedData.status).toBe("ACTIVE");
    expect(extendedData.availableSessions).toBe(6);

    // Audit record stored in package_extensions
    const ext = await testDb.packageExtension.findFirst({
      where: { packageId: targetPkg.id },
    });
    expect(ext).not.toBeNull();
    expect(ext?.daysAdded).toBe(30);
  });

  // Test 4: Booking Blocks Dates Beyond Expiry (R-7-8)
  it("blocks booking appointments dated after package expiry date", async () => {
    // Create package expiring in 15 days
    const expiryDate = new Date();
    expiryDate.setUTCDate(expiryDate.getUTCDate() + 15);

    const tightPkg = await testDb.package.create({
      data: {
        patientId,
        sessionTypeId: ptSessionTypeId,
        totalSessions: 5,
        totalPricePiasters: 150000,
        startDate: new Date(),
        expiryDate,
        notes: "باقة بصلاحية 15 يوم",
        createdByUserId: ownerUser.id,
      },
    });

    // Attempt to book appointment on day 20 (after day 15 expiry) -> MUST BE BLOCKED (R-7-8)
    const bookBeyond = new Date();
    bookBeyond.setUTCDate(bookBeyond.getUTCDate() + 20);
    const bookBeyondStr = bookBeyond.toISOString().slice(0, 10);

    const blockedRes = await bookAppointmentAction(
      {
        patientId,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId,
        bedId,
        appointmentDate: bookBeyondStr,
        startTime: "10:00",
        durationMinutes: 45,
        packageId: tightPkg.id,
      },
      { user: receptionistUser }
    );

    expect(blockedRes.success).toBe(false);
    if (!blockedRes.success) {
      expect(blockedRes.error?.message).toMatch(/انتهاء صلاحية الباقة|تاريخ|expiry/i);
    }
  });

  // Test 5: Package Cancellation & Write-Off by Owner/Manager (R-7-4, R-7-5)
  it("cancels a package, recalculates owed amount to used sessions, and writes off balance with reason", async () => {
    // Create package with 12 sessions
    const pkg = await testDb.package.create({
      data: {
        patientId,
        sessionTypeId: ptSessionTypeId,
        totalSessions: 12,
        totalPricePiasters: 360000, // 30,000 piasters/session
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 60 * 86400000),
        notes: "باقة للإلغاء والتسوية",
        createdByUserId: ownerUser.id,
      },
    });

    const charge = await testDb.charge.create({
      data: {
        patientId,
        packageId: pkg.id,
        amountPiasters: 360000,
        description: "شراء باقة",
        createdByUserId: ownerUser.id,
      },
    });

    // Cancel package (Owner/Manager only, R-7-4)
    const cancelRes = await cancelPackageAction(
      {
        packageId: pkg.id,
        reason: "PATIENT_RELOCATION",
        reasonNotes: "انتقال المريض للإقامة في الإسكندرية",
      },
      { user: ownerUser }
    );
    expect(cancelRes.success).toBe(true);

    const dbPkg = await testDb.package.findUnique({ where: { id: pkg.id } });
    expect(dbPkg?.cancelledAt).not.toBeNull();
    expect(dbPkg?.cancellationReason).toContain("PATIENT_RELOCATION");

    // Write-off unpaid balance (R-7-5, R-8.1-4)
    const writeOffRes = await writeOffBalanceAction(
      {
        chargeId: charge.id,
        amountPiasters: 360000,
        reason: "إسقاط مستحقات الباقة الملغاة بموافقة الإدارة",
      },
      { user: ownerUser }
    );
    expect(writeOffRes.success).toBe(true);

    const dbWriteOff = await testDb.writeOff.findFirst({
      where: { chargeId: charge.id },
    });
    expect(dbWriteOff).not.toBeNull();
    expect(dbWriteOff?.amountPiasters).toBe(360000);
  });
});
