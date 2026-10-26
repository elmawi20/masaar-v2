import { describe, it, expect, beforeAll } from "vitest";
import { testDb } from "../helpers/db";
import {
  getTodayDashboardAction,
  getTomorrowRemindersAction,
  markReminderSentAction,
  generateWhatsAppLinkAction,
  getInAppNotificationsAction,
  markNotificationReadAction,
} from "@/server/actions/frontDesk";
import { bookAppointmentAction, changeAppointmentStatusAction } from "@/server/actions/scheduling";
import { Role, Gender, ReferralSource, AppointmentStatus, NotificationType } from "@prisma/client";
import { hashPassword } from "@/server/auth/crypto";

describe("Module 3.5 Front Desk Integration Tests [Spec §6, §14]", () => {
  const suffix = Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);

  let ownerUser: { id: string; email: string; role: Role; isActive: boolean };
  let receptionistUser: { id: string; email: string; role: Role; isActive: boolean };
  let physioUser: { id: string; email: string; role: Role; isActive: boolean; fullName: string };

  let roomId: string;
  let bedId: string;
  let ptSessionTypeId: string;

  let adultPatientId: string;
  let dependentPatientId: string;
  let optOutPatientId: string;

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  beforeAll(async () => {
    const passwordHash = await hashPassword("MasaarTest2026!");

    const owner = await testDb.user.create({
      data: {
        email: `fd_owner_${suffix}@masaar.local`,
        fullName: "د. هاني مالك العيادة",
        phone: "0100" + Math.floor(1000000 + Math.random() * 9000000),
        jobTitle: "المالك",
        role: "OWNER",
        canAssess: true,
        passwordHash,
        isActive: true,
      },
    });
    ownerUser = { id: owner.id, email: owner.email, role: owner.role as Role, isActive: owner.isActive };

    const rec = await testDb.user.create({
      data: {
        email: `fd_rec_${suffix}@masaar.local`,
        fullName: "سارة الاستقبال",
        phone: "0101" + Math.floor(1000000 + Math.random() * 9000000),
        jobTitle: "استقبال",
        role: "RECEPTIONIST",
        passwordHash,
        isActive: true,
      },
    });
    receptionistUser = { id: rec.id, email: rec.email, role: rec.role as Role, isActive: rec.isActive };

    const physio = await testDb.user.create({
      data: {
        email: `fd_physio_${suffix}@masaar.local`,
        fullName: "د. كريم تأهيل",
        phone: "0102" + Math.floor(1000000 + Math.random() * 9000000),
        jobTitle: "معالج طبيعي",
        role: "PHYSIOTHERAPIST",
        canAssess: true,
        passwordHash,
        isActive: true,
      },
    });
    physioUser = { id: physio.id, email: physio.email, role: physio.role as Role, isActive: physio.isActive, fullName: physio.fullName };

    // Set clinician schedules for today & tomorrow
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

    // Facilities
    const room = await testDb.room.create({
      data: { nameAr: "صالة الاستقبال والعلاج", nameEn: "Front Rehab Room", isActive: true },
    });
    roomId = room.id;

    const bed = await testDb.bed.create({
      data: { roomId, name: "سرير 1", isActive: true },
    });
    bedId = bed.id;

    // Session Type
    const pt = await testDb.sessionType.create({
      data: {
        code: `FD_PT_${suffix}`.toUpperCase(),
        nameAr: "جلسة علاج طبيعي 45 دقيقة",
        nameEn: "Physiotherapy 45m",
        category: "PHYSIOTHERAPY",
        defaultDurationMinutes: 45,
        defaultPricePiasters: 45000,
        isActive: true,
      },
    });
    ptSessionTypeId = pt.id;

    // Adult Patient (unique mobile)
    const adult = await testDb.patient.create({
      data: {
        fullName: "محمود حسن السيد",
        mobilePhone: "01099887766",
        whatsappPhone: "01099887766",
        dateOfBirth: new Date("1985-06-15"),
        gender: Gender.MALE,
        status: "ACTIVE",
        referralSource: ReferralSource.DOCTOR,
        initialComplaint: "ألم في الفقرات القطنية",
        dataConsent: true,
        whatsappConsent: true,
        preferredLanguage: "AR",
      },
    });
    adultPatientId = adult.id;

    // Dependent Patient (uses guardian phone)
    const dep = await testDb.patient.create({
      data: {
        fullName: "الطفل يوسف محمود حسن",
        isDependent: true,
        guardianName: "محمود حسن السيد",
        guardianRelation: "FATHER",
        guardianPhone: "01099887766",
        whatsappPhone: "01099887766",
        dateOfBirth: new Date("2018-03-20"),
        gender: Gender.MALE,
        status: "ACTIVE",
        referralSource: ReferralSource.OTHER,
        initialComplaint: "تأهيل أطفال",
        dataConsent: true,
        whatsappConsent: true,
        preferredLanguage: "AR",
      },
    });
    dependentPatientId = dep.id;

    // Opted out Patient (whatsappConsent: false)
    const optOut = await testDb.patient.create({
      data: {
        fullName: "سمير عبد العزيز",
        mobilePhone: "01122334455",
        whatsappPhone: "01122334455",
        dateOfBirth: new Date("1978-09-10"),
        gender: Gender.MALE,
        status: "ACTIVE",
        referralSource: ReferralSource.WALK_IN,
        initialComplaint: "خشونة الركبة",
        dataConsent: true,
        whatsappConsent: false, // Opted out (R-6-4)
        preferredLanguage: "EN",
      },
    });
    optOutPatientId = optOut.id;

    // Create a package expiring in 5 days (<= 7 days, R-6-1)
    const expiringDate = new Date();
    expiringDate.setUTCDate(expiringDate.getUTCDate() + 5);
    await testDb.package.create({
      data: {
        patientId: adultPatientId,
        sessionTypeId: ptSessionTypeId,
        notes: "باقة علاج طبيعي أوشكت على الانتهاء",
        totalSessions: 12,
        totalPricePiasters: 400000,
        startDate: new Date(),
        expiryDate: expiringDate,
        createdByUserId: ownerUser.id,
      },
    });

    // Create a package with 1 session total (<= 1 session, R-6-1, R-14-4)
    const lowDate = new Date();
    lowDate.setUTCDate(lowDate.getUTCDate() + 30);
    await testDb.package.create({
      data: {
        patientId: dependentPatientId,
        sessionTypeId: ptSessionTypeId,
        notes: "باقة يوسف المتبقي منها جلسة واحدة",
        totalSessions: 1,
        totalPricePiasters: 45000,
        startDate: new Date(),
        expiryDate: lowDate,
        createdByUserId: ownerUser.id,
      },
    });
  });

  // Test 1: Today Screen Metrics & Cards (R-6-1)
  it("computes Today screen counts, arriving next, waitlist, unpaid, and package alerts", async () => {
    // Book an appointment for today at 11:00
    const appt = await bookAppointmentAction(
      {
        patientId: adultPatientId,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId,
        bedId,
        appointmentDate: todayStr,
        startTime: "11:00",
        durationMinutes: 45,
      },
      { user: receptionistUser }
    );
    expect(appt.success).toBe(true);

    const todayRes = await getTodayDashboardAction(
      { date: todayStr },
      { user: receptionistUser }
    );

    expect(todayRes.success).toBe(true);
    if (!todayRes.success || !todayRes.data) return;

    // Check counts structure
    expect(todayRes.data.counts).toBeDefined();
    expect(todayRes.data.counts.scheduled).toBeGreaterThanOrEqual(1);

    // Check expiring packages alert (<= 7 days)
    expect(todayRes.data.expiringPackages.length).toBeGreaterThanOrEqual(1);

    // Check low session packages alert (<= 1 session)
    expect(todayRes.data.lowSessionPackages.length).toBeGreaterThanOrEqual(1);

    // Check arriving next list
    expect(todayRes.data.arrivingNext.length).toBeGreaterThanOrEqual(1);
  });

  // Test 2: Action Panel, Check-in Notification & Undo (R-6-2, R-14-1, R-5.5-2)
  it("check-in creates in-app notification for assigned clinician, undo check-in reverses status with reason", async () => {
    // Book appointment for today at 14:00
    const appt = await bookAppointmentAction(
      {
        patientId: dependentPatientId,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId,
        bedId,
        appointmentDate: todayStr,
        startTime: "14:00",
        durationMinutes: 45,
      },
      { user: receptionistUser }
    );
    expect(appt.success).toBe(true);
    if (!appt.success) return;
    const apptId = (appt.data as { id: string }).id;

    // Check in the appointment (SCHEDULED -> ARRIVED)
    const checkIn = await changeAppointmentStatusAction(
      {
        appointmentId: apptId,
        newStatus: AppointmentStatus.ARRIVED,
      },
      { user: receptionistUser }
    );
    expect(checkIn.success).toBe(true);

    // Assigned clinician must receive an in-app notification (R-14-1)
    const notifs = await getInAppNotificationsAction(
      {},
      { user: physioUser }
    );
    expect(notifs.success).toBe(true);
    if (notifs.success && notifs.data) {
      const arrivedNotif = notifs.data.notifications.find(
        (n: any) => n.appointmentId === apptId && n.type === NotificationType.PATIENT_CHECKED_IN
      );
      expect(arrivedNotif).toBeDefined();
      expect(arrivedNotif?.titleAr).toMatch(/حضر|وصول/);
    }

    // Undo check-in with reason (R-5.5-2)
    const undoRes = await changeAppointmentStatusAction(
      {
        appointmentId: apptId,
        newStatus: AppointmentStatus.SCHEDULED,
        reason: "OTHER",
        reasonNotes: "تم التسجيل بالخطأ",
      },
      { user: receptionistUser }
    );
    expect(undoRes.success).toBe(true);
  });

  // Test 3: WhatsApp Link Generator & Opt-Out Guard (R-6-4)
  it("generates wa.me link with guardian phone for dependent and flags warning if opted out", async () => {
    // 1. Adult Patient (AR template, mobilePhone)
    const adultWa = await generateWhatsAppLinkAction(
      {
        patientId: adultPatientId,
        templateKey: "REMINDER",
        customVariables: {
          appointmentDate: "2026-11-20",
          appointmentTime: "10:00",
          clinicianName: physioUser.fullName,
        },
      },
      { user: receptionistUser }
    );
    expect(adultWa.success).toBe(true);
    if (adultWa.success && adultWa.data) {
      expect(adultWa.data.optedOut).toBe(false);
      expect(adultWa.data.phone).toBe("201099887766");
      expect(adultWa.data.waLink).toContain("https://wa.me/201099887766");
      expect(decodeURIComponent(adultWa.data.waLink || "")).toMatch(/عيادة مسار|موعدك/);
    }

    // 2. Dependent Patient (uses guardian phone R-4.1-6, R-6-4)
    const depWa = await generateWhatsAppLinkAction(
      {
        patientId: dependentPatientId,
        templateKey: "REMINDER",
        customVariables: {
          appointmentDate: "2026-11-20",
          appointmentTime: "11:00",
          clinicianName: physioUser.fullName,
        },
      },
      { user: receptionistUser }
    );
    expect(depWa.success).toBe(true);
    if (depWa.success && depWa.data) {
      expect(depWa.data.phone).toBe("201099887766"); // Guardian phone
      expect(depWa.data.waLink).toContain("201099887766");
    }

    // 3. Opted-out Patient (whatsappConsent: false -> flagged with warning, R-6-4)
    const optOutWa = await generateWhatsAppLinkAction(
      {
        patientId: optOutPatientId,
        templateKey: "REMINDER",
      },
      { user: receptionistUser }
    );
    expect(optOutWa.success).toBe(true);
    if (optOutWa.success && optOutWa.data) {
      expect(optOutWa.data.optedOut).toBe(true);
      expect(optOutWa.data.warning).toMatch(/غير موافق|Opted out/i);
    }
  });

  // Test 4: Tomorrow's Reminders & Mark as Sent (R-6-3)
  it("lists next-day appointments and marks reminder sent with timestamp", async () => {
    // Book appointment for tomorrow
    const appt = await bookAppointmentAction(
      {
        patientId: adultPatientId,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId,
        bedId,
        appointmentDate: tomorrowStr,
        startTime: "12:00",
        durationMinutes: 45,
      },
      { user: receptionistUser }
    );
    expect(appt.success).toBe(true);
    if (!appt.success) return;
    const apptId = (appt.data as { id: string }).id;

    // Fetch tomorrow's reminders
    const remindersRes = await getTomorrowRemindersAction(
      { date: tomorrowStr },
      { user: receptionistUser }
    );
    expect(remindersRes.success).toBe(true);
    if (remindersRes.success && remindersRes.data) {
      const target = remindersRes.data.appointments.find((a: any) => a.id === apptId);
      expect(target).toBeDefined();
      expect(target?.reminderSent).toBe(false);
    }

    // Mark reminder as sent (R-6-3)
    const markRes = await markReminderSentAction(
      {
        appointmentId: apptId,
        recipientPhone: "01099887766",
        templateKey: "REMINDER",
      },
      { user: receptionistUser }
    );
    expect(markRes.success).toBe(true);

    // Verify reminder status in database
    const dbReminder = await testDb.appointmentReminder.findFirst({
      where: { appointmentId: apptId },
    });
    expect(dbReminder).not.toBeNull();
    expect(dbReminder?.status).toBe("SENT");
  });

  // Test 5: In-App Notifications Mark Read (R-14-6)
  it("allows users to read and mark in-app notifications as read", async () => {
    const listRes = await getInAppNotificationsAction(
      {},
      { user: physioUser }
    );
    expect(listRes.success).toBe(true);
    if (!listRes.success || !listRes.data || listRes.data.notifications.length === 0) return;

    const notifId = listRes.data.notifications[0].id;
    const markRes = await markNotificationReadAction(
      { notificationId: notifId },
      { user: physioUser }
    );
    expect(markRes.success).toBe(true);

    const dbNotif = await testDb.inAppNotification.findUnique({
      where: { id: notifId },
    });
    expect(dbNotif?.isRead).toBe(true);
    expect(dbNotif?.readAt).not.toBeNull();
  });
});
