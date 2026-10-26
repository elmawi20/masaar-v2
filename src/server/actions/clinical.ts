"use server";

import { z } from "zod";
import { defineAction } from "../defineAction";
import {
  AppointmentStatus,
  TreatmentModality,
  DietaryProtocol,
  Role,
  Gender,
} from "@prisma/client";
import { calculatePatientAge } from "@/domain/patients/age";

// ============================================================================
// Helper: Calculate BMI & Mifflin-St Jeor BMR (calculations.md §6.1, §6.2)
// ============================================================================

function calculateBmi(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

function calculateBmr(
  heightCm: number,
  weightKg: number,
  ageYears: number,
  gender: Gender
): number {
  const s = gender === Gender.MALE ? 5 : -161;
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYears + s);
}

// ============================================================================
// 1. Complete Session Form (R-9.1-1 to R-9.1-7, R-5.5-3)
// Permitted: Treating clinician (Physio / Nutritionist / Owner)
// ============================================================================

export const completeSessionAction = defineAction({
  actionKey: "clinical.session.complete",
  schema: z.object({
    appointmentId: z.string().uuid(),
    painBefore: z.number().int().min(0).max(10),
    painAfter: z.number().int().min(0).max(10),
    subjective: z.string().optional().nullable(),
    objective: z.string().optional().nullable(),
    assessment: z.string().optional().nullable(),
    plan: z.string().optional().nullable(),
    treatmentModalities: z.array(z.nativeEnum(TreatmentModality)).default([]),
    treatmentNotes: z.string().optional().nullable(),
    homeExercises: z.string().optional().nullable(),
  }),
  audit: {
    entityType: "ClinicalNote",
    actionName: "SESSION_COMPLETED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    // 1. Rule R-9.1-6: At least one of S/O/A/P or treatment must be filled
    const hasSoap = Boolean(
      input.subjective?.trim() ||
      input.objective?.trim() ||
      input.assessment?.trim() ||
      input.plan?.trim()
    );
    const hasTreatment = (input.treatmentModalities?.length ?? 0) > 0 || Boolean(input.treatmentNotes?.trim());

    if (!hasSoap && !hasTreatment) {
      throw new Error("يجب كتابة عنصر واحد على الأقل من تقرير SOAP أو تحديد العلاجات المقدمة في الجلسة [R-9.1-6]");
    }

    // 2. Fetch appointment and verify status
    const appt = await tx.appointment.findUnique({
      where: { id: input.appointmentId },
      include: {
        patient: true,
        package: true,
      },
    });

    if (!appt) {
      throw new Error("الموعد غير موجود");
    }

    // Role check: clinician of appointment or Owner
    if (appt.clinicianId !== ctx.user.id && ctx.user.role !== Role.OWNER) {
      throw new Error("لا يمكن إتمام الجلسة إلا بواسطة المعالج المخصص للموعد أو استشاري المركز [R-1.1-7]");
    }

    // 3. Create Clinical Note (1-to-1 with Appointment R-9.1-7)
    const note = await tx.clinicalNote.create({
      data: {
        appointmentId: appt.id,
        patientId: appt.patientId,
        clinicianId: ctx.user.id,
        painBefore: input.painBefore,
        painAfter: input.painAfter,
        subjective: input.subjective,
        objective: input.objective,
        assessment: input.assessment,
        plan: input.plan,
        treatmentModalities: input.treatmentModalities,
        treatmentNotes: input.treatmentNotes,
        homeExercises: input.homeExercises,
        completedAt: new Date(),
        createdByUserId: ctx.user.id,
      },
    });

    // 4. Update Appointment status to COMPLETED (R-5.5-3, R-9.1-7)
    // Package session is automatically deducted dynamically because completedSessions increments! (R-5.5-3, R-7-4)
    const updatedAppt = await tx.appointment.update({
      where: { id: appt.id },
      data: {
        status: AppointmentStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    return {
      note,
      appointment: updatedAppt,
    };
  },
});

// ============================================================================
// 2. Edit Clinical Note Within 24-Hour Window (R-9.2-1, DEC-016)
// Permitted: Author or Owner within 24h
// ============================================================================

export const editClinicalNoteAction = defineAction({
  actionKey: "clinical.session.edit_within_window",
  schema: z.object({
    noteId: z.string().uuid(),
    painBefore: z.number().int().min(0).max(10).optional(),
    painAfter: z.number().int().min(0).max(10).optional(),
    subjective: z.string().optional().nullable(),
    objective: z.string().optional().nullable(),
    assessment: z.string().optional().nullable(),
    plan: z.string().optional().nullable(),
    treatmentModalities: z.array(z.nativeEnum(TreatmentModality)).optional(),
    treatmentNotes: z.string().optional().nullable(),
    homeExercises: z.string().optional().nullable(),
    changeSummary: z.string().min(3),
  }),
  audit: {
    entityType: "ClinicalNote",
    actionName: "CLINICAL_NOTE_EDITED",
    getEntityId: (data) => (data as { id?: string })?.id,
    getReason: (input) => input.changeSummary,
  },
  handler: async ({ input, ctx, tx }) => {
    const note = await tx.clinicalNote.findUnique({
      where: { id: input.noteId },
    });

    if (!note) {
      throw new Error("التقرير الطبي غير موجود");
    }

    // 1. Author only check (R-9.2-1)
    if (note.clinicianId !== ctx.user.id && ctx.user.role !== Role.OWNER) {
      throw new Error("تعديل التقرير الطبي مقتصر على الطبيب كاتب التقرير فقط أو استشاري المركز [R-1.1-2, R-9.2-1]");
    }

    // 2. 24-hour edit countdown check (calculations.md §6.3, R-9.2-1, R-9.2-2, DEC-016)
    const elapsedMs = Date.now() - new Date(note.completedAt).getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    if (elapsedMs > twentyFourHoursMs || note.isLocked) {
      throw new Error(
        "انتهت مهلة الـ 24 ساعة المسموحة لتعديل التقرير الطبي. يمكنك فقط إضافة ملحق طبي (Addendum) للتقرير [R-9.2-2]."
      );
    }

    // 3. Count existing versions and archive previous state in ClinicalNoteVersion (R-9.2-1)
    const existingVersionsCount = await tx.clinicalNoteVersion.count({
      where: { noteId: note.id },
    });
    const versionNumber = existingVersionsCount + 1;

    await tx.clinicalNoteVersion.create({
      data: {
        noteId: note.id,
        versionNumber,
        painBefore: note.painBefore,
        painAfter: note.painAfter,
        subjective: note.subjective,
        objective: note.objective,
        assessment: note.assessment,
        plan: note.plan,
        treatmentModalities: note.treatmentModalities,
        treatmentNotes: note.treatmentNotes,
        homeExercises: note.homeExercises,
        editedByUserId: ctx.user.id,
        editedAt: new Date(),
        changeSummary: input.changeSummary,
      },
    });

    // 4. Update Clinical Note with new values
    const updatedNote = await tx.clinicalNote.update({
      where: { id: note.id },
      data: {
        painBefore: input.painBefore !== undefined ? input.painBefore : note.painBefore,
        painAfter: input.painAfter !== undefined ? input.painAfter : note.painAfter,
        subjective: input.subjective !== undefined ? input.subjective : note.subjective,
        objective: input.objective !== undefined ? input.objective : note.objective,
        assessment: input.assessment !== undefined ? input.assessment : note.assessment,
        plan: input.plan !== undefined ? input.plan : note.plan,
        treatmentModalities: input.treatmentModalities !== undefined ? input.treatmentModalities : note.treatmentModalities,
        treatmentNotes: input.treatmentNotes !== undefined ? input.treatmentNotes : note.treatmentNotes,
        homeExercises: input.homeExercises !== undefined ? input.homeExercises : note.homeExercises,
        updatedByUserId: ctx.user.id,
      },
      include: {
        versions: { orderBy: { versionNumber: "desc" } },
        addenda: { orderBy: { createdAt: "desc" } },
      },
    });

    return updatedNote;
  },
});

// ============================================================================
// 3. Add Clinical Note Addendum After 24-Hour Lock (R-9.2-2)
// Permitted: Treating Clinician or Owner
// ============================================================================

export const addClinicalNoteAddendumAction = defineAction({
  actionKey: "clinical.session.add_addendum",
  schema: z.object({
    noteId: z.string().uuid(),
    content: z.string().min(3),
  }),
  audit: {
    entityType: "ClinicalNoteAddendum",
    actionName: "NOTE_ADDENDUM_ADDED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    const note = await tx.clinicalNote.findUnique({
      where: { id: input.noteId },
    });

    if (!note) {
      throw new Error("التقرير الطبي غير موجود");
    }

    const addendum = await tx.clinicalNoteAddendum.create({
      data: {
        noteId: note.id,
        content: input.content,
        authorId: ctx.user.id,
      },
      include: {
        author: { select: { fullName: true, role: true } },
      },
    });

    return addendum;
  },
});

// ============================================================================
// 4. Owner Re-open Completed Session (R-1.1-8, R-5.5-11)
// Permitted: OWNER ONLY
// ============================================================================

export const reopenSessionAction = defineAction({
  actionKey: "clinical.session.reopen",
  schema: z.object({
    appointmentId: z.string().uuid(),
    reason: z.string().min(3),
  }),
  audit: {
    entityType: "Appointment",
    actionName: "SESSION_REOPENED",
    getEntityId: (data) => (data as { id?: string })?.id,
    getReason: (input) => input.reason,
  },
  handler: async ({ input, ctx, tx }) => {
    if (ctx.user.role !== Role.OWNER) {
      throw new Error("إعادة فتح المواعيد المكتملة مقتصر على استشاري / مالك المركز فقط [R-1.1-8]");
    }

    const appt = await tx.appointment.findUnique({
      where: { id: input.appointmentId },
      include: { package: true },
    });

    if (!appt) {
      throw new Error("الموعد غير موجود");
    }

    if (appt.status !== AppointmentStatus.COMPLETED) {
      throw new Error("لا يمكن إعادة فتح موعد غير مكتمل");
    }

    // Reverting status to ARRIVED restores the package session! (R-5.5-11)
    const updatedAppt = await tx.appointment.update({
      where: { id: appt.id },
      data: {
        status: AppointmentStatus.ARRIVED,
        completedAt: null,
      },
    });

    return updatedAppt;
  },
});

// ============================================================================
// 5. InBody Record & Nutrition Consultation (R-9.4-1, DEC-028, calculations.md §6.1, §6.2)
// Permitted: Treating Clinician (Nutritionist / Owner / Physio)
// ============================================================================

export const saveInBodyRecordAction = defineAction({
  actionKey: "patient.clinical.view_edit",
  schema: z.object({
    patientId: z.string().uuid(),
    appointmentId: z.string().uuid().optional().nullable(),
    testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    heightCm: z.number().min(50).max(250),
    weightKg: z.number().min(20).max(300),
    targetWeightKg: z.number().min(20).max(300).optional().nullable(),
    skeletalMuscleMassKg: z.number().min(5).max(100).optional().nullable(),
    bodyFatPercentage: z.number().min(1).max(70).optional().nullable(),
    visceralFatLevel: z.number().int().min(1).max(20).optional().nullable(),
    deviceBmrKcal: z.number().int().min(500).max(5000).optional().nullable(),
    calorieTargetKcal: z.number().int().min(500).max(6000).optional().nullable(),
    targetProteinGrams: z.number().int().min(0).max(500).optional().nullable(),
    targetCarbsGrams: z.number().int().min(0).max(800).optional().nullable(),
    targetFatGrams: z.number().int().min(0).max(300).optional().nullable(),
    protocol: z.nativeEnum(DietaryProtocol).default(DietaryProtocol.BALANCED_LIFESTYLE),
    protocolNotes: z.string().optional().nullable(),
    clinicalNotes: z.string().optional().nullable(),
  }),
  audit: {
    entityType: "InBodyRecord",
    actionName: "INBODY_RECORDED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    const patient = await tx.patient.findUnique({
      where: { id: input.patientId },
    });

    if (!patient) {
      throw new Error("ملف المريض غير موجود");
    }

    // 1. Calculate Age (calculations.md §2.1)
    const ageYears = calculatePatientAge(patient.dateOfBirth);

    // 2. Calculate BMI (calculations.md §6.1)
    const calculatedBmi = calculateBmi(input.heightCm, input.weightKg);

    // 3. Calculate Mifflin-St Jeor BMR (calculations.md §6.2)
    const calculatedBmr = calculateBmr(
      input.heightCm,
      input.weightKg,
      ageYears,
      patient.gender
    );

    // 4. Macronutrient calorie calculation & >10% divergence advisory warning (DEC-028, R-9.4-1)
    const protein = input.targetProteinGrams || 0;
    const carbs = input.targetCarbsGrams || 0;
    const fat = input.targetFatGrams || 0;
    const macroTotalCalories = protein * 4 + carbs * 4 + fat * 9;

    let hasCalorieDivergenceWarning = false;
    let divergencePercentage = 0;

    if (input.calorieTargetKcal && macroTotalCalories > 0) {
      divergencePercentage =
        Math.abs(macroTotalCalories - input.calorieTargetKcal) / input.calorieTargetKcal;
      hasCalorieDivergenceWarning = divergencePercentage > 0.1;
    }

    // 5. Store InBody Record in DB
    const record = await tx.inBodyRecord.create({
      data: {
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        testDate: new Date(input.testDate),
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        targetWeightKg: input.targetWeightKg,
        skeletalMuscleMassKg: input.skeletalMuscleMassKg,
        bodyFatPercentage: input.bodyFatPercentage,
        visceralFatLevel: input.visceralFatLevel,
        deviceBmrKcal: input.deviceBmrKcal,
        calorieTargetKcal: input.calorieTargetKcal,
        targetProteinGrams: input.targetProteinGrams,
        targetCarbsGrams: input.targetCarbsGrams,
        targetFatGrams: input.targetFatGrams,
        protocol: input.protocol,
        protocolNotes: input.protocolNotes,
        clinicalNotes: input.clinicalNotes,
        recordedByUserId: ctx.user.id,
        createdByUserId: ctx.user.id,
      },
    });

    return {
      ...record,
      calculatedBmi,
      calculatedBmr,
      macroTotalCalories,
      divergencePercentage: Math.round(divergencePercentage * 100),
      hasCalorieDivergenceWarning,
    };
  },
});

// ============================================================================
// 6. Get Patient InBody History & Progress (R-9.4-1)
// Permitted: Treating Clinicians & Owner
// ============================================================================

export const getPatientInBodyHistoryAction = defineAction({
  actionKey: "patient.clinical.view_edit",
  schema: z.object({
    patientId: z.string().uuid(),
  }),
  handler: async ({ input, tx }) => {
    const rawRecords = await tx.inBodyRecord.findMany({
      where: {
        patientId: input.patientId,
        isVoided: false,
      },
      include: {
        recordedByUser: { select: { fullName: true, role: true } },
      },
      orderBy: { testDate: "desc" },
    });

    const patient = await tx.patient.findUnique({
      where: { id: input.patientId },
    });

    const age = patient ? calculatePatientAge(patient.dateOfBirth) : 30;
    const gender = patient?.gender || Gender.MALE;

    const records = rawRecords.map((r) => {
      const h = Number(r.heightCm);
      const w = Number(r.weightKg);
      const bmi = calculateBmi(h, w);
      const bmr = calculateBmr(h, w, age, gender);
      return {
        ...r,
        heightCm: h,
        weightKg: w,
        targetWeightKg: r.targetWeightKg ? Number(r.targetWeightKg) : null,
        skeletalMuscleMassKg: r.skeletalMuscleMassKg ? Number(r.skeletalMuscleMassKg) : null,
        bodyFatPercentage: r.bodyFatPercentage ? Number(r.bodyFatPercentage) : null,
        bmi,
        bmr,
      };
    });

    // Latest height for pre-filling (R-9.4-1)
    const latestHeightCm = records[0]?.heightCm || 170;

    return {
      records,
      latestHeightCm,
    };
  },
});
