import { describe, it, expect, beforeAll } from "vitest";
import { testDb } from "../helpers/db";
import {
  registerPatientAction,
  searchPatientsAction,
  getPatientProfileAction,
  addPatientDiagnosisAction,
  grantCoveringAccessAction,
  uploadPatientDocumentAction,
} from "@/server/actions/patients";
import { Role, Gender, ReferralSource, DocumentCategory } from "@prisma/client";
import { hashPassword } from "@/server/auth/crypto";

describe("Module 3.3 Patients & Documents Integration Tests [Spec §4, §9.5]", () => {
  const suffix = Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);

  let ownerUser: { id: string; email: string; role: Role; isActive: boolean };
  let receptionistUser: { id: string; email: string; role: Role; isActive: boolean };
  let physioUser: { id: string; email: string; role: Role; isActive: boolean };
  let otherPhysioUser: { id: string; email: string; role: Role; isActive: boolean };
  let managerUser: { id: string; email: string; role: Role; isActive: boolean };

  beforeAll(async () => {
    const passwordHash = await hashPassword("MasaarTest2026!");

    const owner = await testDb.user.create({
      data: {
        email: `owner_${suffix}@masaar.local`,
        fullName: "د. سامح المالك",
        phone: "0100000" + Math.floor(1000 + Math.random() * 9000),
        jobTitle: "مالك العيادة",
        role: "OWNER",
        passwordHash,
        isActive: true,
      },
    });
    ownerUser = { id: owner.id, email: owner.email, role: owner.role as Role, isActive: owner.isActive };

    const rec = await testDb.user.create({
      data: {
        email: `reception_${suffix}@masaar.local`,
        fullName: "نورهان موظفة الاستقبال",
        phone: "0101111" + Math.floor(1000 + Math.random() * 9000),
        jobTitle: "موظفة استقبال",
        role: "RECEPTIONIST",
        passwordHash,
        isActive: true,
      },
    });
    receptionistUser = { id: rec.id, email: rec.email, role: rec.role as Role, isActive: rec.isActive };

    const mgr = await testDb.user.create({
      data: {
        email: `mgr_${suffix}@masaar.local`,
        fullName: "كريم مدير العيادة",
        phone: "0102222" + Math.floor(1000 + Math.random() * 9000),
        jobTitle: "مدير العمليات",
        role: "MANAGER",
        passwordHash,
        isActive: true,
      },
    });
    managerUser = { id: mgr.id, email: mgr.email, role: mgr.role as Role, isActive: mgr.isActive };

    const doc1 = await testDb.user.create({
      data: {
        email: `physio1_${suffix}@masaar.local`,
        fullName: "د. أحمد المعالج الأول",
        phone: "0103333" + Math.floor(1000 + Math.random() * 9000),
        jobTitle: "أخصائي علاج طبيعي",
        role: "PHYSIOTHERAPIST",
        passwordHash,
        isActive: true,
      },
    });
    physioUser = { id: doc1.id, email: doc1.email, role: doc1.role as Role, isActive: doc1.isActive };

    const doc2 = await testDb.user.create({
      data: {
        email: `physio2_${suffix}@masaar.local`,
        fullName: "د. شريف المعالج البديل",
        phone: "0104444" + Math.floor(1000 + Math.random() * 9000),
        jobTitle: "أخصائي علاج طبيعي",
        role: "PHYSIOTHERAPIST",
        passwordHash,
        isActive: true,
      },
    });
    otherPhysioUser = { id: doc2.id, email: doc2.email, role: doc2.role as Role, isActive: doc2.isActive };
  });

  // Test 1: Adult Registration, Phone Normalization & Consents (R-4.1-1, R-4.1-2, R-4.1-20, R-4.1-21)
  it("registers adult patient with normalized phone, mandatory data consent, and WhatsApp consent", async () => {
    const res = await registerPatientAction(
      {
        fullName: "محمد إبراهيم حسن",
        mobilePhone: "+20 100 555 1234",
        isDependent: false,
        dateOfBirth: "1990-05-15",
        gender: Gender.MALE,
        preferredLanguage: "AR",
        referralSource: ReferralSource.FACEBOOK,
        initialComplaint: "ألم أسفل الظهر مستمر منذ شهرين",
        dataConsent: true,
        whatsappConsent: true,
        hasDiabetes: true,
        medicalAlertsNotes: "مريض سكري من النوع الثاني يتناول ميتفورمين",
      },
      { user: receptionistUser }
    );

    expect(res.success).toBe(true);
    if (!res.success) return;

    const patient = res.data as { id: string; mobilePhone: string; status: string; dataConsent: boolean };
    expect(patient.mobilePhone).toBe("01005551234");
    expect(patient.status).toBe("LEAD");
    expect(patient.dataConsent).toBe(true);

    // Verify in database
    const dbRecord = await testDb.patient.findUnique({ where: { id: patient.id } });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.mobilePhone).toBe("01005551234");
    expect(dbRecord?.dataConsentDate).not.toBeNull();
  });

  // Test 2: Adult Mobile Uniqueness Enforced (R-4.2-2)
  it("blocks duplicate adult mobile phone via unique partial constraint and returns existing patient info", async () => {
    const phone = "01099998877";

    // First patient
    const res1 = await registerPatientAction(
      {
        fullName: "طارق عبد العزيز",
        mobilePhone: phone,
        isDependent: false,
        dateOfBirth: "1988-01-01",
        gender: Gender.MALE,
        referralSource: ReferralSource.WALK_IN,
        initialComplaint: "خشونة في الركبة",
        dataConsent: true,
      },
      { user: receptionistUser }
    );
    expect(res1.success).toBe(true);

    // Duplicate attempt
    const res2 = await registerPatientAction(
      {
        fullName: "طارق عبد العزيز الثاني",
        mobilePhone: "+20 109 999 8877", // same phone formatted with prefix
        isDependent: false,
        dateOfBirth: "1988-01-01",
        gender: Gender.MALE,
        referralSource: ReferralSource.WALK_IN,
        initialComplaint: "شكوى مكررة",
        dataConsent: true,
      },
      { user: receptionistUser }
    );

    expect(res2.success).toBe(false);
    if (!res2.success) {
      expect(res2.error?.message).toMatch(/مسجل مسبقاً|duplicate|موجود/i);
    }
  });

  // Test 3: Dependent Registration with Guardian Phone (R-4.1-3, R-4.1-6, R-4.2-3)
  it("allows registering dependent with guardian details and permits the same guardian phone for a sibling", async () => {
    const parentPhone = "+20 101 234 5678";

    // Child 1
    const resChild1 = await registerPatientAction(
      {
        fullName: "يوسف أحمد عادل",
        isDependent: true,
        guardianName: "أحمد عادل (الأب)",
        guardianRelation: "FATHER",
        guardianPhone: parentPhone,
        dateOfBirth: "2018-06-10",
        gender: Gender.MALE,
        referralSource: ReferralSource.DOCTOR,
        initialComplaint: "تأهيل بعد كسر الكوع",
        dataConsent: true,
      },
      { user: receptionistUser }
    );
    expect(resChild1.success).toBe(true);

    // Child 2 (Sibling using the exact same guardian phone)
    const resChild2 = await registerPatientAction(
      {
        fullName: "مريم أحمد عادل",
        isDependent: true,
        guardianName: "أحمد عادل (الأب)",
        guardianRelation: "FATHER",
        guardianPhone: parentPhone,
        dateOfBirth: "2020-09-20",
        gender: Gender.FEMALE,
        referralSource: ReferralSource.DOCTOR,
        initialComplaint: "فلات فوت وتقوس خفيف",
        dataConsent: true,
      },
      { user: receptionistUser }
    );
    expect(resChild2.success).toBe(true);

    // Verify both children exist in database with normalized guardianPhone and NULL mobilePhone
    const c1 = await testDb.patient.findFirst({ where: { fullName: "يوسف أحمد عادل" } });
    const c2 = await testDb.patient.findFirst({ where: { fullName: "مريم أحمد عادل" } });

    expect(c1?.mobilePhone).toBeNull();
    expect(c1?.guardianPhone).toBe("01012345678");
    expect(c2?.mobilePhone).toBeNull();
    expect(c2?.guardianPhone).toBe("01012345678");
  });

  // Test 4: Patient Search Matches Both Mobile and Guardian Phone (R-4.2-4)
  it("searches patients matching both adult mobile and dependents guardian phone", async () => {
    const searchRes = await searchPatientsAction(
      { query: "01012345678" },
      { user: receptionistUser }
    );
    expect(searchRes.success).toBe(true);
    if (searchRes.success && searchRes.data) {
      const names = searchRes.data.map((p) => p.fullName);
      expect(names).toContain("يوسف أحمد عادل");
      expect(names).toContain("مريم أحمد عادل");
    }
  });

  // Test 5: Similar Name Warning (R-4.2-5)
  it("detects similar patient names via Arabic orthographic normalization and provides soft warning", async () => {
    // Patient 1 already registered with "أحمد عبد الرحمن"
    await registerPatientAction(
      {
        fullName: "أحمد عبد الرحمن خليل",
        mobilePhone: "01077770001",
        isDependent: false,
        dateOfBirth: "1992-03-10",
        gender: Gender.MALE,
        referralSource: ReferralSource.GOOGLE,
        initialComplaint: "ألم بالرقبة",
        dataConsent: true,
      },
      { user: receptionistUser }
    );

    // Registering patient with spelling variant "احمد عبدالرحمن خليل"
    const res = await registerPatientAction(
      {
        fullName: "احمد عبدالرحمن خليل",
        mobilePhone: "01077770002",
        isDependent: false,
        dateOfBirth: "1992-03-10",
        gender: Gender.MALE,
        referralSource: ReferralSource.GOOGLE,
        initialComplaint: "ألم بالرقبة",
        dataConsent: true,
      },
      { user: receptionistUser }
    );

    expect(res.success).toBe(true);
    if (res.success && res.data) {
      expect((res.data as { similarNameWarning?: boolean }).similarNameWarning).toBe(true);
    }
  });

  // Test 6: Role Segregation & Privacy Leaks (R-1.1-2, R-1.1-3, R-4.1-16, R-4.1-22, §9.5)
  it("strictly prevents Receptionist & Manager from seeing diagnosis and medical alert details", async () => {
    // Create patient with medical alert notes and assigned to physioUser
    const regRes = await registerPatientAction(
      {
        fullName: "منى إبراهيم السيد",
        mobilePhone: "01088881122",
        isDependent: false,
        dateOfBirth: "1975-08-14",
        gender: Gender.FEMALE,
        referralSource: ReferralSource.FRIEND_FAMILY,
        initialComplaint: "تنميل مستمر بالذراع الأيمن",
        dataConsent: true,
        hasPacemaker: true,
        medicalAlertsNotes: "مركب منظم ضربات قلب دائم عام 2021 — ممنوع استخدام العلاج الكهربائي TENS",
        assignedPhysiotherapistId: physioUser.id,
      },
      { user: receptionistUser }
    );
    expect(regRes.success).toBe(true);
    if (!regRes.success) return;
    const patientId = (regRes.data as { id: string }).id;

    // Physio adds clinical diagnosis
    const diagRes = await addPatientDiagnosisAction(
      {
        patientId,
        diagnosisText: "انزلاق غضروفي عنقي C5-C6 ضاغط على العصب",
      },
      { user: physioUser }
    );
    expect(diagRes.success).toBe(true);

    // 1. Receptionist views patient profile:
    // MUST see hasAlerts = true, but medicalAlertsNotes MUST BE NULL / MASKED
    // MUST NOT receive diagnoses list
    const recProfile = await getPatientProfileAction(
      { patientId },
      { user: receptionistUser }
    );
    expect(recProfile.success).toBe(true);
    if (recProfile.success && recProfile.data) {
      expect(recProfile.data.hasPacemaker).toBe(true);
      expect(recProfile.data.medicalAlertsNotes).toBeNull();
      expect(recProfile.data.diagnoses).toHaveLength(0);
    }

    // 2. Manager views patient profile:
    // MUST ALSO have medical alert notes masked and zero diagnoses
    const mgrProfile = await getPatientProfileAction(
      { patientId },
      { user: managerUser }
    );
    expect(mgrProfile.success).toBe(true);
    if (mgrProfile.success && mgrProfile.data) {
      expect(mgrProfile.data.medicalAlertsNotes).toBeNull();
      expect(mgrProfile.data.diagnoses).toHaveLength(0);
    }

    // 3. Receptionist attempts to add clinical diagnosis -> MUST BE REJECTED
    const recAddDiag = await addPatientDiagnosisAction(
      {
        patientId,
        diagnosisText: "تشخيص محظور من الاستقبال",
      },
      { user: receptionistUser }
    );
    expect(recAddDiag.success).toBe(false);

    // 4. Assigned Clinician views patient profile:
    // Receives full medicalAlertsNotes and clinical diagnoses
    const docProfile = await getPatientProfileAction(
      { patientId },
      { user: physioUser }
    );
    expect(docProfile.success).toBe(true);
    if (docProfile.success && docProfile.data) {
      expect(docProfile.data.medicalAlertsNotes).toContain("منظم ضربات قلب");
      expect(docProfile.data.diagnoses).toHaveLength(1);
      expect(docProfile.data.diagnoses[0].diagnosisText).toContain("انزلاق غضروفي عنقي");
    }
  });

  // Test 7: Covering Access for Non-Assigned Clinician (R-1.1-21)
  it("allows non-assigned clinician to access clinical record only after recording covering access reason", async () => {
    // Using the patient from previous test assigned to physioUser
    const patient = await testDb.patient.findFirst({
      where: { fullName: "منى إبراهيم السيد" },
    });
    expect(patient).not.toBeNull();
    if (!patient) return;

    // otherPhysioUser attempts to view clinical profile without covering access -> Clinical data masked or denied
    const deniedView = await getPatientProfileAction(
      { patientId: patient.id },
      { user: otherPhysioUser }
    );
    expect(deniedView.success).toBe(true);
    if (deniedView.success && deniedView.data) {
      // Not treating clinician and no covering grant: diagnoses masked
      expect(deniedView.data.diagnoses).toHaveLength(0);
    }

    // otherPhysioUser records Covering Access with clinical reason
    const grantRes = await grantCoveringAccessAction(
      {
        patientId: patient.id,
        reason: "تغطية طارئة أثناء إجازة المعالج الأساسي",
      },
      { user: otherPhysioUser }
    );
    expect(grantRes.success).toBe(true);

    // Verify CoveringAccessLog created in DB
    const coveringLog = await testDb.coveringAccessLog.findFirst({
      where: { patientId: patient.id, clinicianId: otherPhysioUser.id },
    });
    expect(coveringLog).not.toBeNull();
    expect(coveringLog?.reason).toContain("تغطية طارئة");

    // otherPhysioUser views profile again -> Now clinical data is accessible!
    const allowedView = await getPatientProfileAction(
      { patientId: patient.id },
      { user: otherPhysioUser }
    );
    expect(allowedView.success).toBe(true);
    if (allowedView.success && allowedView.data) {
      expect(allowedView.data.diagnoses).toHaveLength(1);
    }
  });

  // Test 8: Patient Documents & Category Isolation (R-1.1-3, R-9.5-1)
  it("enforces document category permissions: Receptionist can upload ID and Payment proof but cannot view medical docs", async () => {
    const patient = await testDb.patient.findFirst();
    if (!patient) return;

    // 1. Receptionist uploads ID document (Allowed)
    const uploadIdRes = await uploadPatientDocumentAction(
      {
        patientId: patient.id,
        category: DocumentCategory.ID_ADMINISTRATIVE,
        title: "بطاقة الرقم القومي",
        fileName: "national_id.jpg",
        fileSizeBytes: 204800,
        mimeType: "image/jpeg",
        fileKey: "uploads/national_id.jpg",
      },
      { user: receptionistUser }
    );
    expect(uploadIdRes.success).toBe(true);

    // 2. Clinician uploads X-Ray (Medical document)
    const uploadXrayRes = await uploadPatientDocumentAction(
      {
        patientId: patient.id,
        category: DocumentCategory.X_RAY,
        title: "أشعة سينية على الرقبة",
        fileName: "cervical_xray.png",
        fileSizeBytes: 1048576,
        mimeType: "image/png",
        fileKey: "uploads/cervical_xray.png",
      },
      { user: physioUser }
    );
    expect(uploadXrayRes.success).toBe(true);

    // 3. Receptionist gets patient documents:
    // Only sees the ID document, the X-ray MUST BE FILTERED OUT (R-9.5-1)
    const recProfile = await getPatientProfileAction(
      { patientId: patient.id },
      { user: receptionistUser }
    );
    if (recProfile.success && recProfile.data) {
      const categories = recProfile.data.documents.map((d) => d.category);
      expect(categories).toContain(DocumentCategory.ID_ADMINISTRATIVE);
      expect(categories).not.toContain(DocumentCategory.X_RAY);
    }

    // 4. Clinician gets patient documents:
    // Sees both the ID and the X-ray
    const docProfile = await getPatientProfileAction(
      { patientId: patient.id },
      { user: physioUser }
    );
    if (docProfile.success && docProfile.data) {
      const categories = docProfile.data.documents.map((d) => d.category);
      expect(categories).toContain(DocumentCategory.ID_ADMINISTRATIVE);
      expect(categories).toContain(DocumentCategory.X_RAY);
    }
  });
});
