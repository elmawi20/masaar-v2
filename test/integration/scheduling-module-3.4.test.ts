import { describe, it, expect, beforeAll } from "vitest";
import { testDb } from "../helpers/db";
import {
  bookAppointmentAction,
  rescheduleAppointmentAction,
  changeAppointmentStatusAction,
  previewRecurringSeriesAction,
  bookRecurringSeriesAction,
  getCalendarDayViewAction,
  getCalendarWeekViewAction,
  getClinicianDayListAction,
} from "@/server/actions/scheduling";
import { Role, Gender, ReferralSource, AppointmentStatus } from "@prisma/client";
import { hashPassword } from "@/server/auth/crypto";

describe("Module 3.4 Scheduling Integration Tests [Spec §5]", () => {
  const suffix = Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);

  let ownerUser: { id: string; email: string; role: Role; isActive: boolean };
  let receptionistUser: { id: string; email: string; role: Role; isActive: boolean };
  let physioUser: { id: string; email: string; role: Role; isActive: boolean };
  let nutriUser: { id: string; email: string; role: Role; isActive: boolean };

  let roomId1: string; // Multi-bed room
  let bedId1: string;
  let bedId2: string;

  let roomIdSingle: string; // 1-bed room
  let bedIdSingle: string;

  let ptSessionTypeId: string;
  let nutSessionTypeId: string;
  let assessSessionTypeId: string;

  let patient1Id: string;
  let patient2Id: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword("MasaarTest2026!");

    const owner = await testDb.user.create({
      data: {
        email: `sched_owner_${suffix}@masaar.local`,
        fullName: "د. أيمن المالك",
        phone: "0100000" + Math.floor(1000 + Math.random() * 9000),
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
        email: `sched_rec_${suffix}@masaar.local`,
        fullName: "ريم الاستقبال",
        phone: "0101111" + Math.floor(1000 + Math.random() * 9000),
        jobTitle: "موظفة استقبال",
        role: "RECEPTIONIST",
        passwordHash,
        isActive: true,
      },
    });
    receptionistUser = { id: rec.id, email: rec.email, role: rec.role as Role, isActive: rec.isActive };

    const physio = await testDb.user.create({
      data: {
        email: `sched_physio_${suffix}@masaar.local`,
        fullName: "د. حازم علاج طبيعي",
        phone: "0102222" + Math.floor(1000 + Math.random() * 9000),
        jobTitle: "أخصائي علاج طبيعي",
        role: "PHYSIOTHERAPIST",
        canAssess: true,
        passwordHash,
        isActive: true,
      },
    });
    physioUser = { id: physio.id, email: physio.email, role: physio.role as Role, isActive: physio.isActive };

    const nutri = await testDb.user.create({
      data: {
        email: `sched_nutri_${suffix}@masaar.local`,
        fullName: "د. هبة تغذية",
        phone: "0103333" + Math.floor(1000 + Math.random() * 9000),
        jobTitle: "أخصائية تغذية علاجية",
        role: "NUTRITIONIST",
        canAssess: false,
        passwordHash,
        isActive: true,
      },
    });
    nutriUser = { id: nutri.id, email: nutri.email, role: nutri.role as Role, isActive: nutri.isActive };

    // Set clinician schedules: Saturday to Thursday, 09:00 - 21:00
    for (let day = 0; day <= 5; day++) {
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
      await testDb.staffSchedule.create({
        data: {
          userId: nutriUser.id,
          dayOfWeek: day,
          shiftNumber: 1,
          isWorking: true,
          startTime: "09:00",
          endTime: "21:00",
        },
      });
    }

    // Facilities
    const multiRoom = await testDb.room.create({
      data: {
        nameAr: "صالة العلاج الطبيعي المشتركة",
        nameEn: "Main Rehab Gym",
        isActive: true,
      },
    });
    roomId1 = multiRoom.id;

    const b1 = await testDb.bed.create({
      data: { roomId: roomId1, name: "سرير 1", isActive: true },
    });
    bedId1 = b1.id;

    const b2 = await testDb.bed.create({
      data: { roomId: roomId1, name: "سرير 2", isActive: true },
    });
    bedId2 = b2.id;

    const singleRoom = await testDb.room.create({
      data: {
        nameAr: "عيادة التغذية والتقييم الخاصة",
        nameEn: "Private Nutrition Suite",
        isActive: true,
      },
    });
    roomIdSingle = singleRoom.id;

    const bSingle = await testDb.bed.create({
      data: { roomId: roomIdSingle, name: "سرير الفحص", isActive: true },
    });
    bedIdSingle = bSingle.id;

    // Session Types
    const pt = await testDb.sessionType.create({
      data: {
        code: `PT_SESS_${suffix}`.toUpperCase(),
        nameAr: "جلسة علاج طبيعي وتأهيل 45 دقيقة",
        nameEn: "Physiotherapy 45m",
        category: "PHYSIOTHERAPY",
        defaultDurationMinutes: 45,
        defaultPricePiasters: 40000,
        isActive: true,
      },
    });
    ptSessionTypeId = pt.id;

    const nut = await testDb.sessionType.create({
      data: {
        code: `NUT_SESS_${suffix}`.toUpperCase(),
        nameAr: "استشارة ومتابعة تغذية 30 دقيقة",
        nameEn: "Nutrition Follow-up 30m",
        category: "NUTRITION",
        defaultDurationMinutes: 30,
        defaultPricePiasters: 35000,
        isActive: true,
      },
    });
    nutSessionTypeId = nut.id;

    const assess = await testDb.sessionType.create({
      data: {
        code: `ASSESS_SESS_${suffix}`.toUpperCase(),
        nameAr: "كشف وتقييم استشاري 45 دقيقة",
        nameEn: "Consultant Assessment 45m",
        category: "CONSULTANT_ASSESSMENT",
        defaultDurationMinutes: 45,
        defaultPricePiasters: 60000,
        isActive: true,
      },
    });
    assessSessionTypeId = assess.id;

    // Patients
    const p1 = await testDb.patient.create({
      data: {
        fullName: "عمر خالد الشافعي",
        mobilePhone: "010" + Math.floor(10000000 + Math.random() * 90000000),
        dateOfBirth: new Date("1992-04-10"),
        gender: Gender.MALE,
        status: "LEAD",
        referralSource: ReferralSource.DOCTOR,
        initialComplaint: "ألم في الكتف",
        dataConsent: true,
      },
    });
    patient1Id = p1.id;

    const p2 = await testDb.patient.create({
      data: {
        fullName: "نجلاء عبد الحميد",
        mobilePhone: "011" + Math.floor(10000000 + Math.random() * 90000000),
        dateOfBirth: new Date("1989-11-20"),
        gender: Gender.FEMALE,
        status: "LEAD",
        referralSource: ReferralSource.FACEBOOK,
        initialComplaint: "سمنة ومقاومة إنسولين",
        dataConsent: true,
      },
    });
    patient2Id = p2.id;
  });

  // Test 1: Successful Booking and Overlap Checks (R-5.1-1, R-5.2-1 to R-5.2-5)
  it("books an appointment with all server booking checks and rejects clinician & bed overlaps", async () => {
    // 1. Valid booking on next Saturday at 10:00 (duration 45 min -> ends 10:45)
    const bookRes = await bookAppointmentAction(
      {
        patientId: patient1Id,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId: roomId1,
        bedId: bedId1,
        appointmentDate: "2026-11-07", // Saturday
        startTime: "10:00",
        durationMinutes: 45,
      },
      { user: receptionistUser }
    );

    expect(bookRes.success).toBe(true);
    if (!bookRes.success) return;

    const appt = bookRes.data as { id: string; status: string; pricePiasters: number };
    expect(appt.status).toBe("SCHEDULED");
    expect(appt.pricePiasters).toBe(40000);

    // 2. Clinician Overlap Rejection (R-5.2-3):
    // Attempt to book same clinician at 10:30 (starts before 10:45) on bed 2 with patient 2 -> MUST BE REJECTED
    const overlapClinician = await bookAppointmentAction(
      {
        patientId: patient2Id,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId: roomId1,
        bedId: bedId2,
        appointmentDate: "2026-11-07",
        startTime: "10:30",
        durationMinutes: 45,
      },
      { user: receptionistUser }
    );
    expect(overlapClinician.success).toBe(false);
    if (!overlapClinician.success) {
      expect(overlapClinician.error?.message).toMatch(/طبيب|معالج|overlap|موعد/i);
    }

    // 3. Bed Overlap Rejection (R-5.2-4):
    // Attempt to book bed 1 at 10:15 with different clinician (nutriUser) -> MUST BE REJECTED
    const overlapBed = await bookAppointmentAction(
      {
        patientId: patient2Id,
        sessionTypeId: nutSessionTypeId,
        clinicianId: nutriUser.id,
        roomId: roomId1,
        bedId: bedId1,
        appointmentDate: "2026-11-07",
        startTime: "10:15",
        durationMinutes: 30,
      },
      { user: receptionistUser }
    );
    expect(overlapBed.success).toBe(false);
    if (!overlapBed.success) {
      expect(overlapBed.error?.message).toMatch(/سرير|bed|overlap/i);
    }
  });

  // Test 2: Patient Daily Limit per Session Type (R-5.2-6)
  it("enforces max 1 session per session type per patient per day but permits different types", async () => {
    // Patient 1 already has ptSessionTypeId on 2026-11-07 at 10:00.
    // Attempting a 2nd PT session for patient 1 on the same date at 15:00 -> MUST BE REJECTED (R-5.2-6)
    const secondPt = await bookAppointmentAction(
      {
        patientId: patient1Id,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId: roomId1,
        bedId: bedId1,
        appointmentDate: "2026-11-07",
        startTime: "15:00",
        durationMinutes: 45,
      },
      { user: receptionistUser }
    );
    expect(secondPt.success).toBe(false);
    if (!secondPt.success) {
      expect(secondPt.error?.message).toMatch(/حد أقصى|جلسة واحدة|نوع/i);
    }

    // BUT booking a DIFFERENT session type (Nutrition consultation) on the same date at 15:00 is PERMITTED!
    const nutSameDay = await bookAppointmentAction(
      {
        patientId: patient1Id,
        sessionTypeId: nutSessionTypeId,
        clinicianId: nutriUser.id,
        roomId: roomIdSingle,
        bedId: bedIdSingle,
        appointmentDate: "2026-11-07",
        startTime: "15:00",
        durationMinutes: 30,
      },
      { user: receptionistUser }
    );
    expect(nutSameDay.success).toBe(true);
  });

  // Test 3: Session Type matching Clinician Role & canAssess (R-5.2-8)
  it("enforces session type match with clinician role and assessment privilege", async () => {
    // Attempting to book Nutrition session with a Physiotherapist -> MUST FAIL
    const mismatchRole = await bookAppointmentAction(
      {
        patientId: patient2Id,
        sessionTypeId: nutSessionTypeId,
        clinicianId: physioUser.id, // Physio cannot conduct Nutrition
        roomId: roomId1,
        bedId: bedId2,
        appointmentDate: "2026-11-08",
        startTime: "11:00",
        durationMinutes: 30,
      },
      { user: receptionistUser }
    );
    expect(mismatchRole.success).toBe(false);

    // Attempting to book Assessment session with a clinician where canAssess === false -> MUST FAIL
    const cannotAssess = await bookAppointmentAction(
      {
        patientId: patient2Id,
        sessionTypeId: assessSessionTypeId,
        clinicianId: nutriUser.id, // nutriUser has canAssess: false
        roomId: roomIdSingle,
        bedId: bedIdSingle,
        appointmentDate: "2026-11-08",
        startTime: "12:00",
        durationMinutes: 45,
      },
      { user: receptionistUser }
    );
    expect(cannotAssess.success).toBe(false);
  });

  // Test 4: Drag & Drop / Reschedule Allowed for SCHEDULED/ARRIVED only (R-5.4-4)
  it("allows rescheduling only for scheduled/arrived appointments and rejects collisions", async () => {
    // 1. Book initial appointment
    const initial = await bookAppointmentAction(
      {
        patientId: patient2Id,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId: roomId1,
        bedId: bedId2,
        appointmentDate: "2026-11-09",
        startTime: "09:00",
        durationMinutes: 45,
      },
      { user: receptionistUser }
    );
    expect(initial.success).toBe(true);
    if (!initial.success) return;
    const apptId = (initial.data as { id: string }).id;

    // 2. Drag & drop to 11:00 -> SUCCESS
    const moveRes = await rescheduleAppointmentAction(
      {
        appointmentId: apptId,
        newDate: "2026-11-09",
        newStartTime: "11:00",
        newBedId: bedId2,
      },
      { user: receptionistUser }
    );
    expect(moveRes.success).toBe(true);

    // 3. Cancel the appointment
    await changeAppointmentStatusAction(
      {
        appointmentId: apptId,
        newStatus: AppointmentStatus.CANCELLED,
        reason: "PATIENT_REQUEST",
        reasonNotes: "سفر مفاجئ",
      },
      { user: receptionistUser }
    );

    // 4. Attempt to drag & drop / reschedule CANCELLED appointment -> MUST BE REJECTED
    const moveCancelled = await rescheduleAppointmentAction(
      {
        appointmentId: apptId,
        newDate: "2026-11-09",
        newStartTime: "14:00",
      },
      { user: receptionistUser }
    );
    expect(moveCancelled.success).toBe(false);
  });

  // Test 5: Waitlist Management & Slot Freeing (R-5.5-8, R-5.5-9)
  it("frees calendar slot when moved to waitlist and re-runs checks when restoring to scheduled", async () => {
    // 1. Book appointment at 13:00 on bed 1
    const apptRes = await bookAppointmentAction(
      {
        patientId: patient1Id,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId: roomId1,
        bedId: bedId1,
        appointmentDate: "2026-11-10",
        startTime: "13:00",
        durationMinutes: 45,
      },
      { user: receptionistUser }
    );
    expect(apptRes.success).toBe(true);
    if (!apptRes.success) return;
    const apptId = (apptRes.data as { id: string }).id;

    // 2. Move to waitlist (R-5.5-8) -> frees bed 1 and clinician slot
    const waitlistRes = await changeAppointmentStatusAction(
      {
        appointmentId: apptId,
        newStatus: AppointmentStatus.WAITLISTED,
        reason: "PATIENT_REQUEST",
        reasonNotes: "طلب المريض وضعه في قائمة الانتظار لتعديل الموعد لاحقاً",
      },
      { user: receptionistUser }
    );
    expect(waitlistRes.success).toBe(true);

    // 3. Now bed 1 at 13:00 is FREE! Another patient can book it:
    const replacementBooking = await bookAppointmentAction(
      {
        patientId: patient2Id,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId: roomId1,
        bedId: bedId1,
        appointmentDate: "2026-11-10",
        startTime: "13:00",
        durationMinutes: 45,
      },
      { user: receptionistUser }
    );
    expect(replacementBooking.success).toBe(true);

    // 4. Moving the waitlisted appointment back to SCHEDULED at 13:00 MUST FAIL because slot is now taken!
    const restoreConflict = await changeAppointmentStatusAction(
      {
        appointmentId: apptId,
        newStatus: AppointmentStatus.SCHEDULED,
      },
      { user: receptionistUser }
    );
    expect(restoreConflict.success).toBe(false);
  });

  // Test 6: Recurring Series Preview & Batch Booking (R-5.3-1)
  it("previews recurring series per date with valid/invalid reasons and books series batch", async () => {
    // Preview series: 3 sessions on Sat, Mon, Wed at 16:00
    const previewRes = await previewRecurringSeriesAction(
      {
        patientId: patient2Id,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId: roomId1,
        bedId: bedId2,
        startDate: "2026-11-14",
        daysOfWeek: [0, 2, 4], // Sat, Mon, Wed
        startTime: "16:00",
        numberOfSessions: 3,
      },
      { user: receptionistUser }
    );

    expect(previewRes.success).toBe(true);
    if (!previewRes.success) return;

    expect(previewRes.data.dates).toHaveLength(3);
    expect(previewRes.data.availableCount).toBe(3);
    expect(previewRes.data.dates.every((d: any) => d.isValid)).toBe(true);

    // Batch book recurring series
    const seriesRes = await bookRecurringSeriesAction(
      {
        patientId: patient2Id,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId: roomId1,
        bedId: bedId2,
        startDate: "2026-11-14",
        daysOfWeek: [0, 2, 4],
        startTime: "16:00",
        numberOfSessions: 3,
      },
      { user: receptionistUser }
    );

    expect(seriesRes.success).toBe(true);
    if (!seriesRes.success) return;
    expect((seriesRes.data as any).bookedAppointments).toHaveLength(3);
  });

  // Test 7: Full Status Machine Lifecycle & Check-In Patient Activation (R-5.5-1 to R-5.5-13, R-4.2-6)
  it("executes status machine: check-in records checkInAt and activates lead patient; requires reason for cancel", async () => {
    // Verify patient 1 is currently LEAD
    const pBefore = await testDb.patient.findUnique({ where: { id: patient1Id } });
    expect(pBefore?.status).toBe("LEAD");

    // Book appointment for today
    const appt = await bookAppointmentAction(
      {
        patientId: patient1Id,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId: roomId1,
        bedId: bedId1,
        appointmentDate: "2026-11-15",
        startTime: "09:00",
        durationMinutes: 45,
      },
      { user: receptionistUser }
    );
    expect(appt.success).toBe(true);
    if (!appt.success) return;
    const apptId = (appt.data as { id: string }).id;

    // Check in patient (SCHEDULED -> ARRIVED)
    const checkInRes = await changeAppointmentStatusAction(
      {
        appointmentId: apptId,
        newStatus: AppointmentStatus.ARRIVED,
      },
      { user: receptionistUser }
    );
    expect(checkInRes.success).toBe(true);

    // Check-in sets checkInAt on appointment
    const dbAppt = await testDb.appointment.findUnique({ where: { id: apptId } });
    expect(dbAppt?.status).toBe("ARRIVED");
    expect(dbAppt?.checkInAt).not.toBeNull();

    // Check-in automatically activates the patient from LEAD to ACTIVE (R-4.2-6)
    const pAfter = await testDb.patient.findUnique({ where: { id: patient1Id } });
    expect(pAfter?.status).toBe("ACTIVE");
    expect(pAfter?.firstVisitAt).not.toBeNull();

    // Undo check-in (ARRIVED -> SCHEDULED, requires reason - R-5.5-2)
    const undoRes = await changeAppointmentStatusAction(
      {
        appointmentId: apptId,
        newStatus: AppointmentStatus.SCHEDULED,
        reason: "OTHER",
        reasonNotes: "تم تسجيل الوصول بالخطأ قبل حضور المريض",
      },
      { user: receptionistUser }
    );
    expect(undoRes.success).toBe(true);

    const dbApptUndone = await testDb.appointment.findUnique({ where: { id: apptId } });
    expect(dbApptUndone?.status).toBe("SCHEDULED");
  });

  // Test 8: Calendar Views: Day View, Week View, Clinician Day List for Phone (R-5.4-1, R-0-13)
  it("provides day view (1-bed rooms show room name only), week view per clinician, and phone day list", async () => {
    // 1. Day view
    const dayRes = await getCalendarDayViewAction(
      { date: "2026-11-07" },
      { user: receptionistUser }
    );
    expect(dayRes.success).toBe(true);
    if (dayRes.success && dayRes.data) {
      expect(dayRes.data.rooms).toBeDefined();
      // Verify single bed room is flagged so UI shows room name only (R-5.4-1)
      const singleSuite = dayRes.data.rooms.find((r: any) => r.id === roomIdSingle);
      expect(singleSuite?.isSingleBed).toBe(true);
    }

    // 2. Week view per clinician
    const weekRes = await getCalendarWeekViewAction(
      { clinicianId: physioUser.id, startDate: "2026-11-07" },
      { user: physioUser }
    );
    expect(weekRes.success).toBe(true);
    if (weekRes.success && weekRes.data) {
      expect(weekRes.data.clinician.id).toBe(physioUser.id);
      expect(weekRes.data.days).toHaveLength(7);
    }

    // 3. Clinician Day List for Phone (R-0-13, spec §5)
    const phoneListRes = await getClinicianDayListAction(
      { clinicianId: physioUser.id, date: "2026-11-07" },
      { user: physioUser }
    );
    expect(phoneListRes.success).toBe(true);
    if (phoneListRes.success && phoneListRes.data) {
      expect(Array.isArray(phoneListRes.data.appointments)).toBe(true);
      expect(phoneListRes.data.appointments.length).toBeGreaterThanOrEqual(1);
    }
  });
});
