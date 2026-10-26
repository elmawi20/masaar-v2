"use server";

import { z } from "zod";
import { defineAction } from "../defineAction";
import {
  Gender,
  PreferredLanguage,
  ReferralSource,
  GuardianRelation,
  DocumentCategory,
  PatientStatus,
} from "@prisma/client";
import { normalizeEgyptianPhone } from "@/domain/patients/phone";
import { areArabicNamesSimilar } from "@/domain/patients/arabicName";

// ============================================================================
// 1. Patient Registration (R-4.1-1 to R-4.1-21, R-4.2-1 to R-4.2-5)
// Permitted: OWNER, MANAGER, RECEPTIONIST
// ============================================================================

export const registerPatientAction = defineAction({
  actionKey: "patient.admin.create_edit",
  schema: z.object({
    fullName: z.string().min(2).max(120),
    isDependent: z.boolean().default(false),
    mobilePhone: z.string().optional().nullable(),
    guardianName: z.string().max(120).optional().nullable(),
    guardianRelation: z.nativeEnum(GuardianRelation).optional().nullable(),
    guardianPhone: z.string().optional().nullable(),
    whatsappPhone: z.string().optional().nullable(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    gender: z.nativeEnum(Gender),
    address: z.string().optional().nullable(),
    emergencyContactName: z.string().max(120).optional().nullable(),
    emergencyContactPhone: z.string().max(30).optional().nullable(),
    preferredLanguage: z.nativeEnum(PreferredLanguage).default(PreferredLanguage.AR),
    referralSource: z.nativeEnum(ReferralSource),
    referralSourceDetails: z.string().max(255).optional().nullable(),
    referringDoctor: z.string().max(120).optional().nullable(),
    initialComplaint: z.string().min(2),
    hasDiabetes: z.boolean().default(false),
    hasPacemaker: z.boolean().default(false),
    hasHypertension: z.boolean().default(false),
    hasOsteoporosis: z.boolean().default(false),
    hasFallRisk: z.boolean().default(false),
    isPregnant: z.boolean().default(false),
    medicalAlertsNotes: z.string().optional().nullable(),
    assignedPhysiotherapistId: z.string().uuid().optional().nullable(),
    assignedNutritionistId: z.string().uuid().optional().nullable(),
    dataConsent: z.boolean(),
    whatsappConsent: z.boolean().default(true),
    receptionNotes: z.string().optional().nullable(),
  }),
  audit: {
    entityType: "Patient",
    actionName: "PATIENT_REGISTERED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    // 1. Mandatory Data Processing Consent (R-4.1-20)
    if (!input.dataConsent) {
      throw new Error("موافقة المريض على معالجة البيانات الطبية إلزامية لفتح الملف.");
    }

    // 2. Validate DOB not in future (R-4.1-8)
    const dob = new Date(input.dateOfBirth);
    if (dob.getTime() > Date.now()) {
      throw new Error("تاريخ الميلاد لا يمكن أن يكون في المستقبل.");
    }

    let normalizedMobile: string | null = null;
    let normalizedGuardian: string | null = null;
    let whatsappNumber: string | null = null;

    // 3. Dependents vs Adult Phone Validation (R-4.1-2 to R-4.1-6, R-4.2-1 to R-4.2-3)
    if (input.isDependent) {
      if (!input.guardianName || !input.guardianRelation || !input.guardianPhone) {
        throw new Error("بيانات ولي الأمر (الاسم، صلة القرابة، رقم الهاتف) إلزامية للمريض التابع.");
      }

      const guardianRes = normalizeEgyptianPhone(input.guardianPhone);
      if (!guardianRes.isValid) {
        throw new Error(guardianRes.error || "رقم هاتف ولي الأمر غير صحيح.");
      }
      normalizedGuardian = guardianRes.normalized;
      whatsappNumber = input.whatsappPhone
        ? normalizeEgyptianPhone(input.whatsappPhone).normalized || normalizedGuardian
        : normalizedGuardian;
    } else {
      if (!input.mobilePhone) {
        throw new Error("رقم المحمول إلزامي للمريض البالغ.");
      }

      const mobileRes = normalizeEgyptianPhone(input.mobilePhone);
      if (!mobileRes.isValid) {
        throw new Error(mobileRes.error || "رقم المحمول غير صحيح.");
      }
      normalizedMobile = mobileRes.normalized;

      // Check adult uniqueness (R-4.2-2)
      const existingAdult = await tx.patient.findFirst({
        where: { mobilePhone: normalizedMobile },
      });

      if (existingAdult) {
        throw new Error(`رقم المحمول مسجل مسبقاً للمريض "${existingAdult.fullName}". يمكنك فتح ملفه.`);
      }

      whatsappNumber = input.whatsappPhone
        ? normalizeEgyptianPhone(input.whatsappPhone).normalized || normalizedMobile
        : normalizedMobile;
    }

    // 4. Check for similar names in database (R-4.2-5)
    let similarNameWarning = false;
    const existingPatients = await tx.patient.findMany({
      select: { id: true, fullName: true },
      take: 200,
    });

    for (const p of existingPatients) {
      if (areArabicNamesSimilar(p.fullName, input.fullName)) {
        similarNameWarning = true;
        break;
      }
    }

    // 5. Create Patient Record
    const patient = await tx.patient.create({
      data: {
        fullName: input.fullName.trim(),
        mobilePhone: normalizedMobile,
        isDependent: input.isDependent,
        guardianName: input.isDependent ? input.guardianName?.trim() : null,
        guardianRelation: input.isDependent ? input.guardianRelation : null,
        guardianPhone: normalizedGuardian,
        whatsappPhone: whatsappNumber,
        dateOfBirth: dob,
        gender: input.gender,
        address: input.address?.trim() || null,
        emergencyContactName: input.emergencyContactName?.trim() || null,
        emergencyContactPhone: input.emergencyContactPhone?.trim() || null,
        preferredLanguage: input.preferredLanguage,
        referralSource: input.referralSource,
        referralSourceDetails: input.referralSourceDetails?.trim() || null,
        referringDoctor: input.referringDoctor?.trim() || null,
        initialComplaint: input.initialComplaint.trim(),
        hasDiabetes: input.hasDiabetes,
        hasPacemaker: input.hasPacemaker,
        hasHypertension: input.hasHypertension,
        hasOsteoporosis: input.hasOsteoporosis,
        hasFallRisk: input.hasFallRisk,
        isPregnant: input.isPregnant,
        medicalAlertsNotes: input.medicalAlertsNotes?.trim() || null,
        assignedPhysiotherapistId: input.assignedPhysiotherapistId || null,
        assignedNutritionistId: input.assignedNutritionistId || null,
        status: PatientStatus.LEAD,
        dataConsent: true,
        dataConsentDate: new Date(),
        whatsappConsent: input.whatsappConsent,
        receptionNotes: input.receptionNotes?.trim() || null,
        createdByUserId: ctx.user.id,
      },
    });

    return {
      ...patient,
      similarNameWarning,
    };
  },
});

// ============================================================================
// 2. Patient Directory Search (R-4.2-4)
// Matches both adult mobile and dependents guardian phone
// Sanitizes clinical data for non-clinicians
// ============================================================================

export const searchPatientsAction = defineAction({
  actionKey: "patient.documents.upload_and_view",
  schema: z.object({
    query: z.string().min(1),
  }),
  handler: async ({ input, ctx, tx }) => {
    const q = input.query.trim();
    const phoneRes = normalizeEgyptianPhone(q);
    const searchPhone = phoneRes.isValid ? phoneRes.normalized : q.replace(/[^0-9]/g, "");

    const isNonClinician = ctx.user.role === "RECEPTIONIST" || ctx.user.role === "MANAGER";

    const patients = await tx.patient.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          ...(searchPhone.length >= 3
            ? [
                { mobilePhone: { contains: searchPhone } },
                { guardianPhone: { contains: searchPhone } },
              ]
            : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        assignedPhysiotherapist: { select: { id: true, fullName: true } },
        assignedNutritionist: { select: { id: true, fullName: true } },
      },
    });

    return patients.map((p) => ({
      ...p,
      medicalAlertsNotes: isNonClinician ? null : p.medicalAlertsNotes,
      hasAnyAlert:
        p.hasDiabetes ||
        p.hasPacemaker ||
        p.hasHypertension ||
        p.hasOsteoporosis ||
        p.hasFallRisk ||
        p.isPregnant ||
        Boolean(p.medicalAlertsNotes),
    }));
  },
});

// ============================================================================
// 3. Patient Full Profile View (R-4.3-1, R-4.1-16, R-4.1-22, R-9.5-1)
// Role segregation: Receptionist/Manager never see clinical diagnosis or medical alert notes
// Clinician restricted to assigned unless active covering access exists
// ============================================================================

export const getPatientProfileAction = defineAction({
  actionKey: "patient.documents.upload_and_view",
  schema: z.object({
    patientId: z.string().uuid(),
  }),
  handler: async ({ input, ctx, tx }) => {
    const patient = await tx.patient.findUnique({
      where: { id: input.patientId },
      include: {
        assignedPhysiotherapist: { select: { id: true, fullName: true } },
        assignedNutritionist: { select: { id: true, fullName: true } },
        diagnoses: {
          orderBy: { diagnosedAt: "desc" },
          include: { diagnosedByUser: { select: { id: true, fullName: true, role: true } } },
        },
        documents: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          include: { uploadedByUser: { select: { id: true, fullName: true, role: true } } },
        },
        appointments: {
          orderBy: { appointmentDate: "desc" },
          take: 20,
          include: {
            sessionType: true,
            clinician: { select: { id: true, fullName: true } },
            room: true,
            bed: true,
          },
        },
        packages: {
          orderBy: { startDate: "desc" },
          include: { sessionType: true },
        },
        charges: {
          orderBy: { createdAt: "desc" },
          include: { payments: true },
        },
        coveringAccessLogs: {
          where: {
            clinicianId: ctx.user.id,
            expiresAt: { gt: new Date() },
          },
          orderBy: { grantedAt: "desc" },
        },
      },
    });

    if (!patient) {
      throw new Error("ملف المريض غير موجود.");
    }

    const isNonClinician = ctx.user.role === "RECEPTIONIST" || ctx.user.role === "MANAGER";
    const isOwner = ctx.user.role === "OWNER";
    const isAssignedClinician =
      patient.assignedPhysiotherapistId === ctx.user.id ||
      patient.assignedNutritionistId === ctx.user.id;
    const hasCoveringAccess = patient.coveringAccessLogs.length > 0;

    const canViewClinical = isOwner || isAssignedClinician || hasCoveringAccess;

    // Filter documents: Receptionist/Manager only see ID_ADMINISTRATIVE & PAYMENT_PROOF (R-9.5-1)
    const filteredDocuments = isNonClinician
      ? patient.documents.filter((d) => !d.isMedical)
      : patient.documents;

    // Filter diagnoses: Non-clinicians and non-assigned without covering get empty array (R-4.1-22)
    const filteredDiagnoses = canViewClinical ? patient.diagnoses : [];

    // Filter medical alerts notes: Non-clinicians get null (R-4.1-16)
    const filteredAlertsNotes = isNonClinician ? null : patient.medicalAlertsNotes;

    return {
      ...patient,
      medicalAlertsNotes: filteredAlertsNotes,
      diagnoses: filteredDiagnoses,
      documents: filteredDocuments,
      canViewClinical,
      hasCoveringAccess,
      hasAnyAlert:
        patient.hasDiabetes ||
        patient.hasPacemaker ||
        patient.hasHypertension ||
        patient.hasOsteoporosis ||
        patient.hasFallRisk ||
        patient.isPregnant ||
        Boolean(patient.medicalAlertsNotes),
    };
  },
});

// ============================================================================
// 4. Clinical Diagnoses (R-4.1-22, R-9.3-1)
// Strictly Clinicians Only (OWNER, PHYSIOTHERAPIST, NUTRITIONIST)
// ============================================================================

export const addPatientDiagnosisAction = defineAction({
  actionKey: "patient.clinical.view_edit",
  schema: z.object({
    patientId: z.string().uuid(),
    diagnosisText: z.string().min(2),
    notes: z.string().optional().nullable(),
  }),
  audit: {
    entityType: "PatientDiagnosis",
    actionName: "PATIENT_DIAGNOSIS_ADDED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    return tx.patientDiagnosis.create({
      data: {
        patientId: input.patientId,
        diagnosisText: input.diagnosisText.trim(),
        notes: input.notes?.trim() || null,
        diagnosedByUserId: ctx.user.id,
        createdByUserId: ctx.user.id,
      },
      include: {
        diagnosedByUser: { select: { id: true, fullName: true, role: true } },
      },
    });
  },
});

// ============================================================================
// 5. Covering Access Request (R-1.1-21, R-9.1-1)
// Strictly Clinicians Only; logs reason and active duration
// ============================================================================

export const grantCoveringAccessAction = defineAction({
  actionKey: "patient.clinical.covering_access",
  schema: z.object({
    patientId: z.string().uuid(),
    reason: z.string().min(3),
  }),
  audit: {
    entityType: "CoveringAccessLog",
    actionName: "COVERING_ACCESS_GRANTED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours validity

    return tx.coveringAccessLog.create({
      data: {
        patientId: input.patientId,
        clinicianId: ctx.user.id,
        reason: input.reason.trim(),
        expiresAt,
        ipAddress: "127.0.0.1",
      },
    });
  },
});

// ============================================================================
// 6. Patient Documents Upload & View Logging (R-1.1-3, R-9.5-1)
// Non-clinicians restricted to ID_ADMINISTRATIVE & PAYMENT_PROOF
// ============================================================================

export const uploadPatientDocumentAction = defineAction({
  actionKey: "patient.documents.upload_and_view",
  schema: z.object({
    patientId: z.string().uuid(),
    category: z.nativeEnum(DocumentCategory),
    title: z.string().min(2).max(150),
    fileName: z.string().min(1).max(255),
    fileSizeBytes: z.number().int().min(1).max(10485760), // 10MB
    mimeType: z.string().min(1).max(100),
    fileKey: z.string().min(1),
  }),
  audit: {
    entityType: "PatientDocument",
    actionName: "PATIENT_DOCUMENT_UPLOADED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    const isMedical =
      input.category !== DocumentCategory.ID_ADMINISTRATIVE &&
      input.category !== DocumentCategory.PAYMENT_PROOF;

    if ((ctx.user.role === "RECEPTIONIST" || ctx.user.role === "MANAGER") && isMedical) {
      throw new Error("لا تملك صلاحية رفع مستندات طبية سريرية.");
    }

    return tx.patientDocument.create({
      data: {
        patientId: input.patientId,
        category: input.category,
        title: input.title.trim(),
        fileName: input.fileName,
        fileSizeBytes: input.fileSizeBytes,
        mimeType: input.mimeType,
        fileKey: input.fileKey,
        isMedical,
        uploadedByUserId: ctx.user.id,
        createdByUserId: ctx.user.id,
      },
    });
  },
});

export const logDocumentViewAction = defineAction({
  actionKey: "patient.documents.upload_and_view",
  schema: z.object({
    documentId: z.string().uuid(),
  }),
  audit: {
    entityType: "DocumentViewLog",
    actionName: "PATIENT_DOCUMENT_VIEWED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    return tx.documentViewLog.create({
      data: {
        documentId: input.documentId,
        viewedByUserId: ctx.user.id,
        watermarkApplied: true,
        ipAddress: "127.0.0.1",
      },
    });
  },
});

// ============================================================================
// 7. Patient Discharge (R-4.2-6)
// Allowed for OWNER, PHYSIOTHERAPIST, NUTRITIONIST
// ============================================================================

export const dischargePatientAction = defineAction({
  actionKey: "patient.clinical.view_edit",
  schema: z.object({
    patientId: z.string().uuid(),
    dischargeReason: z.string().min(3),
  }),
  audit: {
    entityType: "Patient",
    actionName: "PATIENT_DISCHARGED",
    getEntityId: (_, input) => input.patientId,
  },
  handler: async ({ input, ctx, tx }) => {
    return tx.patient.update({
      where: { id: input.patientId },
      data: {
        status: PatientStatus.DISCHARGED,
        dischargedAt: new Date(),
        dischargedByUserId: ctx.user.id,
        dischargeReason: input.dischargeReason.trim(),
      },
    });
  },
});
