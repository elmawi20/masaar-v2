import { describe, it, expect, beforeAll } from "vitest";
import { testDb } from "../helpers/db";
import {
  completeSessionAction,
  editClinicalNoteAction,
  addClinicalNoteAddendumAction,
  reopenSessionAction,
  saveInBodyRecordAction,
  getPatientInBodyHistoryAction,
} from "@/server/actions/clinical";
import {
  createPackageAction,
  getPatientPackagesAction,
} from "@/server/actions/packages";
import {
  bookAppointmentAction,
  changeAppointmentStatusAction,
} from "@/server/actions/scheduling";
import {
  Role,
  Gender,
  ReferralSource,
  SessionCategory,
  AppointmentStatus,
  TreatmentModality,
  DietaryProtocol,
} from "@prisma/client";
import { hashPassword } from "@/server/auth/crypto";

describe("Module 3.8 Clinical & Nutrition Integration Tests [Spec §9]", () => {
  const suffix = Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);

  let ownerUser: { id: string; email: string; role: Role; isActive: boolean; fullName: string };
  let receptionistUser: { id: string; email: string; role: Role; isActive: boolean; fullName: string };
  let physioUser: { id: string; email: string; role: Role; isActive: boolean; fullName: string };
  let nutritionUser: { id: string; email: string; role: Role; isActive: boolean; fullName: string };

  let patientId: string;
  let ptSessionTypeId: string;
  let nutSessionTypeId: string;
  let roomId: string;
  let bedId: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword("MasaarTest2026!");

    const owner = await testDb.user.create({
      data: {
        email: `clin_owner_${suffix}@masaar.local`,
        fullName: "د. أيمن استشاري ومالك",
        phone: "0100" + Math.floor(1000000 + Math.random() * 9000000),
        jobTitle: "استشاري ورئيس المركز",
        role: "OWNER",
        canAssess: true,
        passwordHash,
        isActive: true,
      },
    });
    ownerUser = { id: owner.id, email: owner.email, role: owner.role as Role, isActive: owner.isActive, fullName: owner.fullName };

    const rec = await testDb.user.create({
      data: {
        email: `clin_rec_${suffix}@masaar.local`,
        fullName: "ندى الاستقبال",
        phone: "0101" + Math.floor(1000000 + Math.random() * 9000000),
        jobTitle: "استقبال",
        role: "RECEPTIONIST",
        passwordHash,
        isActive: true,
      },
    });
    receptionistUser = { id: rec.id, email: rec.email, role: rec.role as Role, isActive: rec.isActive, fullName: rec.fullName };

    const physio = await testDb.user.create({
      data: {
        email: `clin_physio_${suffix}@masaar.local`,
        fullName: "د. حسام علاج طبيعي",
        phone: "0102" + Math.floor(1000000 + Math.random() * 9000000),
        jobTitle: "أخصائي علاج طبيعي",
        role: "PHYSIOTHERAPIST",
        canAssess: true,
        passwordHash,
        isActive: true,
      },
    });
    physioUser = { id: physio.id, email: physio.email, role: physio.role as Role, isActive: physio.isActive, fullName: physio.fullName };

    const nut = await testDb.user.create({
      data: {
        email: `clin_nut_${suffix}@masaar.local`,
        fullName: "د. هالة تغذية علاجية",
        phone: "0103" + Math.floor(1000000 + Math.random() * 9000000),
        jobTitle: "أخصائية تغذية علاجية",
        role: "NUTRITIONIST",
        passwordHash,
        isActive: true,
      },
    });
    nutritionUser = { id: nut.id, email: nut.email, role: nut.role as Role, isActive: nut.isActive, fullName: nut.fullName };

    // Schedules
    for (let day = 0; day <= 6; day++) {
      await testDb.staffSchedule.createMany({
        data: [
          {
            userId: physioUser.id,
            dayOfWeek: day,
            shiftNumber: 1,
            isWorking: true,
            startTime: "09:00",
            endTime: "21:00",
          },
          {
            userId: nutritionUser.id,
            dayOfWeek: day,
            shiftNumber: 1,
            isWorking: true,
            startTime: "09:00",
            endTime: "21:00",
          },
        ],
      });
    }

    const room = await testDb.room.create({
      data: { nameAr: "عيادة العلاج 1", nameEn: "Therapy Room 1", isActive: true },
    });
    roomId = room.id;

    const bed = await testDb.bed.create({
      data: { roomId, name: "سرير 1", isActive: true },
    });
    bedId = bed.id;

    const pt = await testDb.sessionType.create({
      data: {
        code: `CLIN_PT_${suffix}`.toUpperCase(),
        nameAr: "جلسة علاج طبيعي وتأهيل",
        nameEn: "PT Rehabilitation",
        category: SessionCategory.PHYSIOTHERAPY,
        defaultDurationMinutes: 45,
        defaultPricePiasters: 35000,
        isActive: true,
      },
    });
    ptSessionTypeId = pt.id;

    const nutSt = await testDb.sessionType.create({
      data: {
        code: `CLIN_NUT_${suffix}`.toUpperCase(),
        nameAr: "استشارة تغذية وإنبودي",
        nameEn: "Nutrition & InBody",
        category: SessionCategory.NUTRITION,
        defaultDurationMinutes: 30,
        defaultPricePiasters: 25000,
        isActive: true,
      },
    });
    nutSessionTypeId = nutSt.id;

    // Patient: Male, 35 years old (born 1991), initial height 175 cm
    const p = await testDb.patient.create({
      data: {
        fullName: "كريم سامي رضوان",
        mobilePhone: "010" + Math.floor(10000000 + Math.random() * 90000000),
        dateOfBirth: new Date("1991-06-15"),
        gender: Gender.MALE,
        status: "ACTIVE",
        referralSource: ReferralSource.DOCTOR,
        initialComplaint: "إعادة تأهيل الركبة بعد جراحة الرباط الصليبي",
        dataConsent: true,
        whatsappConsent: true,
      },
    });
    patientId = p.id;
  });

  // Test 1: Complete session form with pain scores (0-10), SOAP, treatment modalities, home exercises carry forward, and package deduction ONLY on completion (R-9.1-1 to R-9.1-7, R-5.5-3, R-5.5-13)
  it("completes session with SOAP, pain 0-10, treatment modalities, carries forward home exercises, and deducts package session only on completion", async () => {
    // 1. Create a 5-session package for patient
    const pkgRes = await createPackageAction(
      {
        patientId,
        sessionTypeId: ptSessionTypeId,
        totalSessions: 5,
        totalPricePiasters: 150000,
      },
      { user: receptionistUser }
    );
    expect(pkgRes.success).toBe(true);
    if (!pkgRes.success || !pkgRes.data) return;
    const pkgId = (pkgRes.data as any).id;

    // Check initial available sessions = 5
    const initPkgList = await getPatientPackagesAction({ patientId }, { user: receptionistUser });
    expect(initPkgList.success).toBe(true);
    if (!initPkgList.success || !initPkgList.data) return;
    expect(initPkgList.data.packages.find((p: any) => p.id === pkgId)?.availableSessions).toBe(5);

    // 2. Book appointment today with package
    const todayStr = new Date().toISOString().slice(0, 10);
    const bookRes = await bookAppointmentAction(
      {
        patientId,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId,
        bedId,
        appointmentDate: todayStr,
        startTime: "10:00",
        durationMinutes: 45,
        packageId: pkgId,
      },
      { user: receptionistUser }
    );
    expect(bookRes.success).toBe(true);
    if (!bookRes.success || !bookRes.data) return;
    const apptId = (bookRes.data as any).id;

    // Check-in patient -> ARRIVED
    await changeAppointmentStatusAction(
      {
        appointmentId: apptId,
        newStatus: AppointmentStatus.ARRIVED,
      },
      { user: receptionistUser }
    );

    // Available sessions is 4 (1 booked), completed is 0 (R-5.2-7)
    const midPkgList = await getPatientPackagesAction({ patientId }, { user: receptionistUser });
    expect(midPkgList.success).toBe(true);
    if (!midPkgList.success || !midPkgList.data) return;
    const midPkg = midPkgList.data.packages.find((p: any) => p.id === pkgId);
    expect(midPkg?.completedSessions).toBe(0);
    expect(midPkg?.availableSessions).toBe(4);

    // 3. Complete Session Form: painBefore=8, painAfter=3, SOAP, modalities, home exercises (R-9.1-1 to R-9.1-6)
    const completeRes = await completeSessionAction(
      {
        appointmentId: apptId,
        painBefore: 8,
        painAfter: 3,
        subjective: "المريض يشكو من ألم حاد عند صعود الدرج، تحسن بعد الجلسة",
        objective: "مدى حركة الركبة 110 درجات، تورم خفيف حول المفصل",
        assessment: "تحسن إيجابي في الاستجابة للعلاج اليدوي والتمارين",
        plan: "الاستمرار في تقوية العضلة الرباعية 3 جلسات أسبوعياً",
        treatmentModalities: [
          TreatmentModality.TENS,
          TreatmentModality.ULTRASOUND,
          TreatmentModality.EXERCISE_THERAPY,
        ],
        treatmentNotes: "استجابة ممتازة لجهاز الموجات فوق الصوتية",
        homeExercises: "تمرين رفع الساق مستقيمة (Straight Leg Raise) 3 مجموعات × 10 تكرارات يومياً + كمادات ثلج 15 دقيقة",
      },
      { user: physioUser }
    );
    expect(completeRes.success).toBe(true);
    if (!completeRes.success || !completeRes.data) return;

    // Appointment status is now COMPLETED (R-9.1-7)
    const dbAppt = await testDb.appointment.findUnique({ where: { id: apptId } });
    expect(dbAppt?.status).toBe(AppointmentStatus.COMPLETED);

    // Package now has completedSessions = 1 (R-7-4, R-9.1-7)
    const finalPkgList = await getPatientPackagesAction({ patientId }, { user: receptionistUser });
    expect(finalPkgList.success).toBe(true);
    if (!finalPkgList.success || !finalPkgList.data) return;
    const finalPkg = finalPkgList.data.packages.find((p: any) => p.id === pkgId);
    expect(finalPkg?.completedSessions).toBe(1);
    expect(finalPkg?.availableSessions).toBe(4);

    // Verify Clinical Note in database
    const dbNote = await testDb.clinicalNote.findUnique({ where: { appointmentId: apptId } });
    expect(dbNote).not.toBeNull();
    expect(dbNote?.painBefore).toBe(8);
    expect(dbNote?.painAfter).toBe(3);
    expect(dbNote?.treatmentModalities).toContain(TreatmentModality.TENS);
    expect(dbNote?.homeExercises).toContain("Straight Leg Raise");
  });

  // Test 2: Note author can edit note within 24h with versions logged (R-9.2-1)
  it("allows note author to edit note within 24 hours, recording version history and audit reason", async () => {
    // 1. Create completed note
    const todayStr = new Date().toISOString().slice(0, 10);
    const appt = await testDb.appointment.create({
      data: {
        patientId,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId,
        bedId,
        appointmentDate: new Date(todayStr),
        startTime: "11:00",
        endTime: "11:45",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 45 * 60000),
        durationMinutes: 45,
        status: AppointmentStatus.COMPLETED,
      },
    });

    const note = await testDb.clinicalNote.create({
      data: {
        appointmentId: appt.id,
        patientId,
        clinicianId: physioUser.id,
        painBefore: 7,
        painAfter: 4,
        subjective: "ألم في الركبة",
        objective: "تورم",
        assessment: "التهاب أوتار",
        plan: "علاج طبيعي",
        treatmentModalities: [TreatmentModality.TENS],
        homeExercises: "تمارين استطالة",
        completedAt: new Date(), // Just completed -> within 24h window
      },
    });

    // 2. Receptionist cannot edit clinical note (R-1.1-2)
    const recEdit = await editClinicalNoteAction(
      {
        noteId: note.id,
        painBefore: 7,
        painAfter: 2,
        subjective: "تعديل بواسطة الاستقبال (ممنوع)",
        changeSummary: "محاولة غير مصرح بها",
      },
      { user: receptionistUser }
    );
    expect(recEdit.success).toBe(false);

    // 3. Author edits note within 24h (R-9.2-1)
    const authorEdit = await editClinicalNoteAction(
      {
        noteId: note.id,
        painBefore: 7,
        painAfter: 2,
        subjective: "ألم خفيف بعد التمارين، استجابة سريعة للعلاج",
        objective: "اختفاء التورم تماماً ومدى حركة كامل 130 درجة",
        assessment: "تعافي ممتاز وتراجع ملحوظ في الالتهاب",
        plan: "تقليل تردد الجلسات إلى جلستين أسبوعياً",
        treatmentModalities: [TreatmentModality.TENS, TreatmentModality.LASER],
        homeExercises: "تمارين تقوية متقدمة",
        changeSummary: "تحديث تقييم مدى الحركة وإضافة الليزر للخطة",
      },
      { user: physioUser }
    );
    expect(authorEdit.success).toBe(true);

    // Check version archive record created in clinical_note_versions (R-9.2-1)
    const version = await testDb.clinicalNoteVersion.findFirst({
      where: { noteId: note.id },
      orderBy: { versionNumber: "desc" },
    });
    expect(version).not.toBeNull();
    expect(version?.versionNumber).toBe(1);
    expect(version?.painAfter).toBe(4); // Previous pain score archived!
    expect(version?.changeSummary).toContain("تحديث تقييم مدى الحركة");

    // Check updated clinical note
    const updatedNote = await testDb.clinicalNote.findUnique({ where: { id: note.id } });
    expect(updatedNote?.painAfter).toBe(2);
    expect(updatedNote?.treatmentModalities).toContain(TreatmentModality.LASER);
  });

  // Test 3: Note locked after 24 hours, only addendum permitted (R-9.2-2, DEC-016)
  it("blocks direct note editing after 24 hours and permits author to add timestamped addenda only", async () => {
    // Note completed 26 hours ago
    const pastTime = new Date();
    pastTime.setUTCHours(pastTime.getUTCHours() - 26);

    const oldAppt = await testDb.appointment.create({
      data: {
        patientId,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId,
        bedId,
        appointmentDate: pastTime,
        startTime: "09:00",
        endTime: "09:45",
        startsAt: pastTime,
        endsAt: new Date(pastTime.getTime() + 45 * 60000),
        durationMinutes: 45,
        status: AppointmentStatus.COMPLETED,
      },
    });

    const oldNote = await testDb.clinicalNote.create({
      data: {
        appointmentId: oldAppt.id,
        patientId,
        clinicianId: physioUser.id,
        painBefore: 6,
        painAfter: 3,
        subjective: "تقرير قديم تم إقفاله",
        completedAt: pastTime,
        isLocked: true,
      },
    });

    // 1. Attempt to edit note directly after 24h -> MUST FAIL (R-9.2-2)
    const lockedEdit = await editClinicalNoteAction(
      {
        noteId: oldNote.id,
        painBefore: 6,
        painAfter: 1,
        changeSummary: "محاولة تعديل بعد الإقفال",
      },
      { user: physioUser }
    );
    expect(lockedEdit.success).toBe(false);
    if (!lockedEdit.success) {
      expect(lockedEdit.error?.message).toMatch(/24|مهلة|إقفال|lock/i);
    }

    // 2. Author appends addendum note (R-9.2-2)
    const addendumRes = await addClinicalNoteAddendumAction(
      {
        noteId: oldNote.id,
        content: "ملحق طبي: أفاد المريض هاتفياً بعد يومين باختفاء الألم تماماً وعدم الحاجة لمسكنات.",
      },
      { user: physioUser }
    );
    expect(addendumRes.success).toBe(true);

    // Verify addendum record in clinical_note_addenda
    const addendum = await testDb.clinicalNoteAddendum.findFirst({
      where: { noteId: oldNote.id },
    });
    expect(addendum).not.toBeNull();
    expect(addendum?.content).toContain("ملحق طبي");
    expect(addendum?.authorId).toBe(physioUser.id);
  });

  // Test 4: Owner re-opens completed session with reason, restoring package session (R-1.1-8, R-5.5-11)
  it("allows Owner to re-open a completed session with audit reason, restoring package session", async () => {
    // Create a package
    const pkg = await testDb.package.create({
      data: {
        patientId,
        sessionTypeId: ptSessionTypeId,
        totalSessions: 10,
        totalPricePiasters: 300000,
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 60 * 86400000),
        createdByUserId: ownerUser.id,
      },
    });

    const test4Date = new Date();
    test4Date.setUTCDate(test4Date.getUTCDate() + 3);
    const startsAt = new Date(test4Date.getTime());
    startsAt.setUTCHours(14, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + 45 * 60000);

    // Completed appointment linked to package
    const appt = await testDb.appointment.create({
      data: {
        patientId,
        sessionTypeId: ptSessionTypeId,
        clinicianId: physioUser.id,
        roomId,
        bedId,
        appointmentDate: test4Date,
        startTime: "14:00",
        endTime: "14:45",
        startsAt,
        endsAt,
        durationMinutes: 45,
        status: AppointmentStatus.COMPLETED,
        packageId: pkg.id,
      },
    });

    // 1. Physio cannot re-open completed appointment (R-1.1-8)
    const physioReopen = await reopenSessionAction(
      {
        appointmentId: appt.id,
        reason: "محاولة إعادة فتح بواسطة المعالج",
      },
      { user: physioUser }
    );
    expect(physioReopen.success).toBe(false);

    // 2. Owner re-opens session with mandatory reason (R-1.1-8, R-5.5-11)
    const ownerReopen = await reopenSessionAction(
      {
        appointmentId: appt.id,
        reason: "إعادة فتح الموعد بقرار استشاري لإلغاء اعتماد الجلسة لعدم حضور المريض فعلياً",
      },
      { user: ownerUser }
    );
    expect(ownerReopen.success).toBe(true);

    // Appointment status restored to ARRIVED
    const dbAppt = await testDb.appointment.findUnique({ where: { id: appt.id } });
    expect(dbAppt?.status).toBe(AppointmentStatus.ARRIVED);

    // Package available sessions restored! (R-5.5-11)
    const pkgList = await getPatientPackagesAction({ patientId }, { user: receptionistUser });
    expect(pkgList.success).toBe(true);
    if (!pkgList.success || !pkgList.data) return;
    const p = pkgList.data.packages.find((item: any) => item.id === pkg.id);
    expect(p?.completedSessions).toBe(0);
    expect(p?.availableSessions).toBe(9); // 1 arrived, 9 available
  });

  // Test 5: InBody calculation (BMI, Mifflin-St Jeor BMR, height pre-fill, macros, >10% calorie divergence soft warning) (R-9.4-1, DEC-028, calculations.md §6.1, §6.2)
  it("computes BMI, Mifflin-St Jeor BMR, pre-fills height, and warns on >10% macronutrient calorie divergence", async () => {
    // Male patient, 35 years old (born 1991), height 175 cm, weight 80 kg
    // BMI = 80 / (1.75 * 1.75) = 26.1
    // BMR (Male) = 10*80 + 6.25*175 - 5*35 + 5 = 800 + 1093.75 - 175 + 5 = 1723.75 -> 1724 kcal/day
    // Calorie target = 2000 kcal
    // Macro calories = 150g protein (600 kcal) + 200g carbs (800 kcal) + 40g fat (360 kcal) = 1760 kcal
    // Divergence = |1760 - 2000| / 2000 = 12% (> 10% soft warning triggered!)

    const saveRes = await saveInBodyRecordAction(
      {
        patientId,
        testDate: new Date().toISOString().slice(0, 10),
        heightCm: 175,
        weightKg: 80,
        targetWeightKg: 75,
        skeletalMuscleMassKg: 34.5,
        bodyFatPercentage: 21.5,
        visceralFatLevel: 7,
        calorieTargetKcal: 2000,
        targetProteinGrams: 150,
        targetCarbsGrams: 200,
        targetFatGrams: 40,
        protocol: DietaryProtocol.BALANCED_LIFESTYLE,
        protocolNotes: "حمية متوازنة لإنقاص الدهون مع الحفاظ على الكتلة العضلية",
      },
      { user: nutritionUser }
    );

    expect(saveRes.success).toBe(true);
    if (!saveRes.success || !saveRes.data) return;

    const inbody = saveRes.data as any;
    expect(inbody.calculatedBmi).toBe(26.1);
    expect(inbody.calculatedBmr).toBe(1724);
    // Divergence > 10% soft warning detected (DEC-028)
    expect(inbody.hasCalorieDivergenceWarning).toBe(true);
    expect(inbody.macroTotalCalories).toBe(1760);

    // Verify stored in DB
    const dbRecord = await testDb.inBodyRecord.findFirst({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });
    expect(dbRecord).not.toBeNull();
    expect(Number(dbRecord?.heightCm)).toBe(175);
    expect(Number(dbRecord?.weightKg)).toBe(80);

    // Get History: returns progress list and pre-filled height 175 for next test (R-9.4-1)
    const historyRes = await getPatientInBodyHistoryAction(
      { patientId },
      { user: nutritionUser }
    );
    expect(historyRes.success).toBe(true);
    if (!historyRes.success || !historyRes.data) return;
    expect(historyRes.data.latestHeightCm).toBe(175);
    expect(historyRes.data.records.length).toBeGreaterThan(0);
  });
});
