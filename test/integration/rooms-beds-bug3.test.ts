import { describe, it, expect, beforeAll } from "vitest";
import { testDb, resetTestDatabase } from "../helpers/db";
import {
  createRoomAction,
  updateBedAction,
  createBedAction,
  toggleBedAction,
  listRoomsAction,
} from "@/server/actions/clinic";
import { Role } from "@prisma/client";
import { hashPassword } from "@/server/auth/crypto";

describe("Bug 3 & Improvement: Rooms and Beds Management [R-2-4, R-1.1-19]", () => {
  let managerUser: { id: string; email: string; role: Role; isActive: boolean };

  beforeAll(async () => {
    await resetTestDatabase();

    const passwordHash = await hashPassword("ManagerPassword123!");
    const manager = await testDb.user.create({
      data: {
        email: "manager.facility@masaar.local",
        fullName: "محمد عزمي (مدير العمليات)",
        phone: "01011223344",
        jobTitle: "مدير العمليات",
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

  it("auto-creates beds named 'سرير 1', 'سرير 2'... when creating a room with numberOfBeds", async () => {
    const roomRes = await createRoomAction(
      {
        nameAr: "غرفة العلاج الكهربائي",
        nameEn: "Electrotherapy Room",
        numberOfBeds: 3,
      },
      { user: managerUser }
    );

    expect(roomRes.success).toBe(true);
    if (!roomRes.success) return;

    const roomId = (roomRes.data as { id: string }).id;
    const beds = await testDb.bed.findMany({
      where: { roomId },
      orderBy: { name: "asc" },
    });

    expect(beds).toHaveLength(3);
    expect(beds.map((b) => b.name)).toEqual(["سرير 1", "سرير 2", "سرير 3"]);
  });

  it("allows renaming an existing bed via updateBedAction and enforces unique bed names within a room", async () => {
    // Create a room with 2 beds
    const roomRes = await createRoomAction(
      {
        nameAr: "غرفة التمارين والجمباز",
        nameEn: "Gym Rehab Room",
        numberOfBeds: 2,
      },
      { user: managerUser }
    );
    expect(roomRes.success).toBe(true);
    if (!roomRes.success) return;

    const roomId = (roomRes.data as { id: string }).id;
    const beds = await testDb.bed.findMany({ where: { roomId }, orderBy: { name: "asc" } });
    const bed1 = beds[0];
    const bed2 = beds[1];

    // 1. Rename bed1 to a new unique name
    const renameRes = await updateBedAction(
      {
        bedId: bed1.id,
        name: "سرير أجهزة الشد",
      },
      { user: managerUser }
    );
    expect(renameRes.success).toBe(true);

    const renamedInDb = await testDb.bed.findUnique({ where: { id: bed1.id } });
    expect(renamedInDb?.name).toBe("سرير أجهزة الشد");

    // 2. Attempt to rename bed2 to the exact same name as bed1 in the same room -> MUST FAIL
    const duplicateRes = await updateBedAction(
      {
        bedId: bed2.id,
        name: "سرير أجهزة الشد",
      },
      { user: managerUser }
    );
    expect(duplicateRes.success).toBe(false);
  });

  it("allows adding additional beds to an existing room and soft-deactivating/reactivating beds (never hard delete)", async () => {
    const roomRes = await createRoomAction(
      {
        nameAr: "غرفة التقييم والاستشارات",
        nameEn: "Consultation Room",
        numberOfBeds: 1,
      },
      { user: managerUser }
    );
    expect(roomRes.success).toBe(true);
    if (!roomRes.success) return;
    const roomId = (roomRes.data as { id: string }).id;

    // Add another bed to the room
    const addBedRes = await createBedAction(
      {
        roomId,
        name: "سرير فحص إضافي",
      },
      { user: managerUser }
    );
    expect(addBedRes.success).toBe(true);
    if (!addBedRes.success) return;

    const addedBedId = (addBedRes.data as { id: string }).id;

    // Soft-deactivate the bed
    const deactivateRes = await toggleBedAction(
      {
        bedId: addedBedId,
        isActive: false,
      },
      { user: managerUser }
    );
    expect(deactivateRes.success).toBe(true);

    // Bed still exists in DB with isActive = false (history preserved, zero hard delete)
    const bedInDb = await testDb.bed.findUnique({ where: { id: addedBedId } });
    expect(bedInDb).not.toBeNull();
    expect(bedInDb?.isActive).toBe(false);

    // Reactivate the bed
    const reactivateRes = await toggleBedAction(
      {
        bedId: addedBedId,
        isActive: true,
      },
      { user: managerUser }
    );
    expect(reactivateRes.success).toBe(true);

    const reactivatedBed = await testDb.bed.findUnique({ where: { id: addedBedId } });
    expect(reactivatedBed?.isActive).toBe(true);
  });
});
