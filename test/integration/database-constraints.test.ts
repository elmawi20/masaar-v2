import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { testDb, resetTestDatabase } from "../helpers/db";

describe("Database Constraints & Immutability Triggers Integration Suite (masaar_test)", () => {
  let roomId: string;
  let bedId1: string;
  let bedId2: string;
  let sessionTypeId: string;
  let clinicianId1: string;
  let clinicianId2: string;
  let patientId1: string;
  let patientId2: string;

  beforeAll(async () => {
    await resetTestDatabase();

    // 1. Create baseline room & beds
    const room = await testDb.room.create({
      data: {
        nameAr: "غرفة العلاج الطبيعي 1",
        nameEn: "Physical Therapy Room 1",
      },
    });
    roomId = room.id;

    const bed1 = await testDb.bed.create({
      data: {
        roomId,
        name: "سرير 1",
      },
    });
    bedId1 = bed1.id;

    const bed2 = await testDb.bed.create({
      data: {
        roomId,
        name: "سرير 2",
      },
    });
    bedId2 = bed2.id;

    // 2. Create session type
    const sessionType = await testDb.sessionType.create({
      data: {
        code: "PT_SESSION_45",
        nameAr: "جلسة تأهيل وعلاج طبيعي 45 دقيقة",
        nameEn: "Physical Therapy 45m",
        category: "PHYSIOTHERAPY",
        defaultDurationMinutes: 45,
        defaultPricePiasters: 45000,
      },
    });
    sessionTypeId = sessionType.id;

    // 3. Create staff users
    const clinician1 = await testDb.user.create({
      data: {
        email: "dr.tarek@masaar.com",
        passwordHash: "$2a$10$dummyhashedpasswordfortesting12345678",
        fullName: "د. طارق الحسين",
        phone: "01001112222",
        jobTitle: "Physiotherapist",
        role: "PHYSIOTHERAPIST",
        isActive: true,
      },
    });
    clinicianId1 = clinician1.id;

    const clinician2 = await testDb.user.create({
      data: {
        email: "dr.mona@masaar.com",
        passwordHash: "$2a$10$dummyhashedpasswordfortesting12345678",
        fullName: "د. منى عبد الرحمن",
        phone: "01003334444",
        jobTitle: "Physiotherapist",
        role: "PHYSIOTHERAPIST",
        isActive: true,
      },
    });
    clinicianId2 = clinician2.id;

    // 4. Create patients
    const patient1 = await testDb.patient.create({
      data: {
        fullName: "محمود حسن علي",
        mobilePhone: "01011112222",
        dateOfBirth: new Date("1985-05-15"),
        gender: "MALE",
        status: "ACTIVE",
        referralSource: "WALK_IN",
        initialComplaint: "آلام الظهر",
      },
    });
    patientId1 = patient1.id;

    const patient2 = await testDb.patient.create({
      data: {
        fullName: "سارة إبراهيم فتحي",
        mobilePhone: "01022223333",
        dateOfBirth: new Date("1992-09-20"),
        gender: "FEMALE",
        status: "ACTIVE",
        referralSource: "WALK_IN",
        initialComplaint: "إعادة تأهيل الركبة",
      },
    });
    patientId2 = patient2.id;
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  // Test 1: Clinician Overlap Constraint
  it("rejects overlapping booking for the same clinician (exclude_clinician_time_overlap, R-5.2-3)", async () => {
    const startsAt = new Date("2026-11-01T10:00:00Z");
    const endsAt = new Date("2026-11-01T11:00:00Z");

    // First appointment: clinician 1, bed 1, patient 1
    await testDb.appointment.create({
      data: {
        patientId: patientId1,
        sessionTypeId,
        clinicianId: clinicianId1,
        roomId,
        bedId: bedId1,
        appointmentDate: new Date("2026-11-01"),
        startTime: "12:00",
        endTime: "13:00",
        startsAt,
        endsAt,
        durationMinutes: 60,
        status: "SCHEDULED",
      },
    });

    // Attempt second overlapping appointment: same clinician 1, different bed (bed 2), different patient (patient 2)
    const overlappingStartsAt = new Date("2026-11-01T10:30:00Z");
    const overlappingEndsAt = new Date("2026-11-01T11:30:00Z");

    await expect(
      testDb.appointment.create({
        data: {
          patientId: patientId2,
          sessionTypeId,
          clinicianId: clinicianId1,
          roomId,
          bedId: bedId2,
          appointmentDate: new Date("2026-11-01"),
          startTime: "12:30",
          endTime: "13:30",
          startsAt: overlappingStartsAt,
          endsAt: overlappingEndsAt,
          durationMinutes: 60,
          status: "SCHEDULED",
        },
      })
    ).rejects.toThrow(/exclude_clinician_time_overlap/);
  });

  // Test 2: Bed Overlap Constraint
  it("rejects overlapping booking for the same bed (exclude_bed_time_overlap, R-5.2-4)", async () => {
    const startsAt = new Date("2026-11-02T14:00:00Z");
    const endsAt = new Date("2026-11-02T15:00:00Z");

    // First appointment: bed 1, clinician 1, patient 1
    await testDb.appointment.create({
      data: {
        patientId: patientId1,
        sessionTypeId,
        clinicianId: clinicianId1,
        roomId,
        bedId: bedId1,
        appointmentDate: new Date("2026-11-02"),
        startTime: "16:00",
        endTime: "17:00",
        startsAt,
        endsAt,
        durationMinutes: 60,
        status: "SCHEDULED",
      },
    });

    // Attempt second overlapping appointment on bed 1 with different clinician (clinician 2) and different patient (patient 2)
    const overlappingStartsAt = new Date("2026-11-02T14:15:00Z");
    const overlappingEndsAt = new Date("2026-11-02T15:15:00Z");

    await expect(
      testDb.appointment.create({
        data: {
          patientId: patientId2,
          sessionTypeId,
          clinicianId: clinicianId2,
          roomId,
          bedId: bedId1,
          appointmentDate: new Date("2026-11-02"),
          startTime: "16:15",
          endTime: "17:15",
          startsAt: overlappingStartsAt,
          endsAt: overlappingEndsAt,
          durationMinutes: 60,
          status: "SCHEDULED",
        },
      })
    ).rejects.toThrow(/exclude_bed_time_overlap/);
  });

  // Test 3: Patient Overlap Constraint
  it("rejects overlapping booking for the same patient across different beds/clinicians (exclude_patient_time_overlap, R-5.2-5)", async () => {
    const startsAt = new Date("2026-11-03T09:00:00Z");
    const endsAt = new Date("2026-11-03T10:00:00Z");

    // First appointment: patient 2, clinician 1, bed 1
    await testDb.appointment.create({
      data: {
        patientId: patientId2,
        sessionTypeId,
        clinicianId: clinicianId1,
        roomId,
        bedId: bedId1,
        appointmentDate: new Date("2026-11-03"),
        startTime: "11:00",
        endTime: "12:00",
        startsAt,
        endsAt,
        durationMinutes: 60,
        status: "SCHEDULED",
      },
    });

    // Attempt second overlapping appointment for same patient 2 with clinician 2 and bed 2
    const overlappingStartsAt = new Date("2026-11-03T09:30:00Z");
    const overlappingEndsAt = new Date("2026-11-03T10:30:00Z");

    await expect(
      testDb.appointment.create({
        data: {
          patientId: patientId2,
          sessionTypeId,
          clinicianId: clinicianId2,
          roomId,
          bedId: bedId2,
          appointmentDate: new Date("2026-11-03"),
          startTime: "11:30",
          endTime: "12:30",
          startsAt: overlappingStartsAt,
          endsAt: overlappingEndsAt,
          durationMinutes: 60,
          status: "SCHEDULED",
        },
      })
    ).rejects.toThrow(/exclude_patient_time_overlap/);
  });

  // Test 4: Adult Mobile Phone Partial Unique Index
  it("rejects duplicate adult mobile phone via partial index (idx_patients_mobile_phone_unique, R-4.1-2, R-4.2-2)", async () => {
    const phone = "01099990001";

    await testDb.patient.create({
      data: {
        fullName: "خالد سعيد عبد الله",
        mobilePhone: phone,
        isDependent: false,
        dateOfBirth: new Date("1980-01-01"),
        gender: "MALE",
        status: "ACTIVE",
        referralSource: "WALK_IN",
        initialComplaint: "استشارة",
      },
    });

    // Second adult patient with same mobile phone must be rejected
    await expect(
      testDb.patient.create({
        data: {
          fullName: "شريف سعيد عبد الله",
          mobilePhone: phone,
          isDependent: false,
          dateOfBirth: new Date("1982-02-02"),
          gender: "MALE",
          status: "ACTIVE",
          referralSource: "WALK_IN",
          initialComplaint: "استشارة ثانية",
        },
      })
    ).rejects.toThrow(/Unique constraint failed on the fields: \(`mobile_phone`\)|idx_patients_mobile_phone_unique/);
  });

  it("permits multiple dependent patients sharing the same guardian phone with null mobile_phone (R-4.1-3, R-4.2-3)", async () => {
    const guardianPhone = "01088887777";

    const child1 = await testDb.patient.create({
      data: {
        fullName: "ياسين محمود حسن",
        mobilePhone: null,
        isDependent: true,
        guardianName: "محمود حسن علي",
        guardianRelation: "FATHER",
        guardianPhone,
        dateOfBirth: new Date("2018-06-10"),
        gender: "MALE",
        status: "ACTIVE",
        referralSource: "WALK_IN",
        initialComplaint: "تأهيل أطفال",
      },
    });

    const child2 = await testDb.patient.create({
      data: {
        fullName: "ملك محمود حسن",
        mobilePhone: null,
        isDependent: true,
        guardianName: "محمود حسن علي",
        guardianRelation: "FATHER",
        guardianPhone,
        dateOfBirth: new Date("2021-03-22"),
        gender: "FEMALE",
        status: "ACTIVE",
        referralSource: "WALK_IN",
        initialComplaint: "تأهيل أطفال",
      },
    });

    expect(child1.id).toBeDefined();
    expect(child2.id).toBeDefined();
    expect(child1.guardianPhone).toBe(child2.guardianPhone);
  });

  // Test 5 & 6: Audit Log Immutability Triggers
  it("blocks UPDATE statements on audit_logs table (trg_audit_logs_immutability, R-13-3)", async () => {
    const log = await testDb.auditLog.create({
      data: {
        action: "CREATE_PATIENT",
        entityType: "PATIENT",
        entityId: patientId1,
      },
    });

    await expect(
      testDb.$executeRawUnsafe(
        `UPDATE audit_logs SET action = 'MODIFIED_ACTION' WHERE id = '${log.id}'`
      )
    ).rejects.toThrow(/Audit log entries are immutable/);
  });

  it("blocks DELETE statements on audit_logs table (trg_audit_logs_immutability, R-13-3)", async () => {
    const log = await testDb.auditLog.create({
      data: {
        action: "CREATE_APPOINTMENT",
        entityType: "APPOINTMENT",
      },
    });

    await expect(
      testDb.$executeRawUnsafe(`DELETE FROM audit_logs WHERE id = '${log.id}'`)
    ).rejects.toThrow(/Audit log entries are immutable/);
  });

  // Test 7: Patient Hard-Delete Prevention Trigger
  it("blocks hard DELETE statements on patients table (trg_patients_prevent_hard_delete, R-0-3)", async () => {
    const patientToDelete = await testDb.patient.create({
      data: {
        fullName: "مريض للتجربة فقط",
        mobilePhone: "01077776666",
        dateOfBirth: new Date("1995-01-01"),
        gender: "MALE",
        status: "LEAD",
        referralSource: "WALK_IN",
        initialComplaint: "شكوى تجريبية",
      },
    });

    await expect(
      testDb.$executeRawUnsafe(`DELETE FROM patients WHERE id = '${patientToDelete.id}'`)
    ).rejects.toThrow(/Patient records cannot be hard-deleted/);
  });
});
