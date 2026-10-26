import { describe, it, expect, beforeAll } from "vitest";
import { testDb, resetTestDatabase } from "../helpers/db";
import {
  createStaffAccountAction,
  updateStaffAccountAction,
  deactivateStaffAccountAction,
  activateStaffAccountAction,
} from "@/server/actions/staff";
import {
  ownerResetStaffPasswordAction,
  ownerResetStaffOtpAction,
  ownerRevokeStaffDevicesAction,
  changePasswordAction,
} from "@/server/actions/auth";
import { Role } from "@prisma/client";
import { hashPassword } from "@/server/auth/crypto";

describe("Module 3.1: Staff Accounts & Security Integration (masaar_test)", () => {
  const uniqueSuffix = Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
  let ownerUser: { id: string; email: string; role: Role; isActive: boolean };
  let managerUser: { id: string; email: string; role: Role; isActive: boolean };
  let createdStaffId: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword("Password123!");

    // Create Owner user
    const owner = await testDb.user.create({
      data: {
        email: `owner_${uniqueSuffix}@masaar.local`,
        fullName: "د. طارق المعوي",
        phone: "01000000001",
        jobTitle: "استشاري ورئيس المركز",
        role: "OWNER",
        passwordHash,
        isActive: true,
      },
    });
    ownerUser = {
      id: owner.id,
      email: owner.email,
      role: owner.role as Role,
      isActive: owner.isActive,
    };

    // Create Manager user
    const manager = await testDb.user.create({
      data: {
        email: `manager_${uniqueSuffix}@masaar.local`,
        fullName: "منى الشريف",
        phone: "01000000002",
        jobTitle: "مديرة العمليات",
        role: "MANAGER",
        passwordHash,
        isActive: true,
      },
    });
    managerUser = {
      id: manager.id,
      email: manager.email,
      role: manager.role as Role,
      isActive: manager.isActive,
    };
  });

  describe("Staff Accounts Management & Permissions [R-1-1, R-1.1-19, R-3-1]", () => {
    it("allows OWNER to create a new staff account [R-1-1, R-1.1-19, R-3-1]", async () => {
      const result = await createStaffAccountAction(
        {
          fullName: "د. إبراهيم كمال",
          email: `ibrahim_${uniqueSuffix}@masaar.local`,
          phone: "01011223344",
          jobTitle: "أخصائي علاج طبيعي",
          role: "PHYSIOTHERAPIST",
          preferredLanguage: "AR",
          canAssess: true,
          commissionType: "PERCENT",
          commissionPercentBasisPoints: 3000,
          commissionFixedPiasters: 0,
          initialPassword: "TemporaryPass123!",
        },
        { user: ownerUser }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const staffData = result.data as { id: string; email: string; role: string };
        createdStaffId = staffData.id;
        expect(staffData.email).toBe(`ibrahim_${uniqueSuffix}@masaar.local`);
        expect(staffData.role).toBe("PHYSIOTHERAPIST");
      }
    });

    it("blocks non-OWNER (e.g. MANAGER) from creating staff accounts [R-1-2, R-1.1-19]", async () => {
      const result = await createStaffAccountAction(
        {
          fullName: "مروان شكري",
          email: "marwan@masaar.local",
          phone: "01099887766",
          jobTitle: "موظف استقبال",
          role: "RECEPTIONIST",
          preferredLanguage: "AR",
          canAssess: false,
          commissionType: "NONE",
          commissionPercentBasisPoints: 0,
          commissionFixedPiasters: 0,
          initialPassword: "Pass123456!",
        },
        { user: managerUser }
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("PERMISSION_DENIED");
      }
    });

    it("allows OWNER to update an existing staff account [R-1.1-19, R-3-1]", async () => {
      const result = await updateStaffAccountAction(
        {
          userId: createdStaffId,
          fullName: "د. إبراهيم كمال رضوان",
          phone: "01011223399",
          jobTitle: "أخصائي أول علاج طبيعي",
          role: "PHYSIOTHERAPIST",
          preferredLanguage: "AR",
          canAssess: true,
          commissionType: "PERCENT",
          commissionPercentBasisPoints: 3500,
          commissionFixedPiasters: 0,
        },
        { user: ownerUser }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as { fullName: string }).fullName).toBe("د. إبراهيم كمال رضوان");
      }
    });
  });

  describe("Owner Password and OTP Reset [R-3-4, R-15.2-6, R-1.1-19]", () => {
    it("allows OWNER to reset staff password, forcing change at next login [R-3-4]", async () => {
      const result = await ownerResetStaffPasswordAction(
        {
          userId: createdStaffId,
          temporaryPassword: "NewTempPassword123!",
        },
        { user: ownerUser }
      );

      expect(result.success).toBe(true);

      const staffInDb = await testDb.user.findUnique({
        where: { id: createdStaffId },
      });
      expect(staffInDb?.mustChangePassword).toBe(true);
    });

    it("allows OWNER to reset staff OTP, forcing re-enrollment [R-15.2-6]", async () => {
      const result = await ownerResetStaffOtpAction(
        { userId: createdStaffId },
        { user: ownerUser }
      );

      expect(result.success).toBe(true);

      const staffInDb = await testDb.user.findUnique({
        where: { id: createdStaffId },
      });
      expect(staffInDb?.otpStatus).toBe("NOT_SET");
    });

    it("allows OWNER to revoke all trusted devices for a staff member [R-15.2-4]", async () => {
      const result = await ownerRevokeStaffDevicesAction(
        { userId: createdStaffId },
        { user: ownerUser }
      );

      expect(result.success).toBe(true);
    });
  });

  describe("Staff Account Deactivation & Instant Invalidation [R-3-5, R-15.1-5]", () => {
    it("deactivates staff and prevents them from executing actions [R-3-5, R-15.1-5]", async () => {
      // 1. Deactivate staff
      const deactResult = await deactivateStaffAccountAction(
        { userId: createdStaffId },
        { user: ownerUser }
      );
      expect(deactResult.success).toBe(true);

      const staffInDb = await testDb.user.findUnique({
        where: { id: createdStaffId },
      });
      expect(staffInDb?.isActive).toBe(false);
      expect(staffInDb?.deactivatedAt).toBeDefined();

      // 2. Attempt action with deactivated user
      const deactUserContext = {
        id: createdStaffId,
        email: "ibrahim.physio@masaar.local",
        role: "PHYSIOTHERAPIST" as Role,
        isActive: false,
      };

      const changePassResult = await changePasswordAction(
        {
          currentPassword: "NewTempPassword123!",
          newPassword: "BrandNewPassword123!",
        },
        { user: deactUserContext }
      );

      expect(changePassResult.success).toBe(false);
      if (!changePassResult.success) {
        expect(changePassResult.error.code).toBe("USER_DEACTIVATED");
      }
    });

    it("allows OWNER to reactivate a staff member", async () => {
      const actResult = await activateStaffAccountAction(
        { userId: createdStaffId },
        { user: ownerUser }
      );
      expect(actResult.success).toBe(true);

      const staffInDb = await testDb.user.findUnique({
        where: { id: createdStaffId },
      });
      expect(staffInDb?.isActive).toBe(true);
      expect(staffInDb?.deactivatedAt).toBeNull();
    });
  });
});
