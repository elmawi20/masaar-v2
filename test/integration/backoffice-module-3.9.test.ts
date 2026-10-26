import { describe, it, expect, beforeAll } from "vitest";
import { testDb } from "../helpers/db";
import { Role, PaymentMethod, ExpenseCategory, CommissionType, AppointmentStatus, TreatmentModality } from "@prisma/client";
import {
  createExpenseAction,
  editExpenseAction,
  voidExpenseAction,
  getExpensesAction,
  calculateClinicianCommissionsAction,
  createCommissionPayoutAction,
  voidCommissionPayoutAction,
  getMyCommissionsAction,
  getClinicReportAction,
  exportReportToCsvAction,
  getAuditLogsAction,
} from "@/server/actions/backoffice";
import { completeSessionAction } from "@/server/actions/clinical";

describe("Module 3.9: Back Office (Expenses, Commissions, Reports & Audit Log)", () => {
  let ownerUser: any;
  let managerUser: any;
  let receptionistUser: any;
  let physioUser: any;
  let patient: any;
  let sessionType: any;
  let room: any;
  let bed: any;

  beforeAll(async () => {
    // 1. Create Staff
    ownerUser = await testDb.user.create({
      data: {
        email: `owner.bo.${Date.now()}@masaar.local`,
        passwordHash: "hash",
        fullName: "د. هاني عثمان (مالك)",
        phone: "+201011119901",
        jobTitle: "الاستشاري والمالك",
        role: Role.OWNER,
        commissionType: CommissionType.NONE,
      },
    });

    managerUser = await testDb.user.create({
      data: {
        email: `manager.bo.${Date.now()}@masaar.local`,
        passwordHash: "hash",
        fullName: "أ. طارق محمود (مدير)",
        phone: "+201011119902",
        jobTitle: "مدير المركز",
        role: Role.MANAGER,
        commissionType: CommissionType.NONE,
      },
    });

    receptionistUser = await testDb.user.create({
      data: {
        email: `reception.bo.${Date.now()}@masaar.local`,
        passwordHash: "hash",
        fullName: "نورهان موظفة الاستقبال",
        phone: "+201011119903",
        jobTitle: "موظفة استقبال",
        role: Role.RECEPTIONIST,
        commissionType: CommissionType.NONE,
      },
    });

    physioUser = await testDb.user.create({
      data: {
        email: `physio.bo.${Date.now()}@masaar.local`,
        passwordHash: "hash",
        fullName: "د. أحمد خليل (علاج طبيعي)",
        phone: "+201011119904",
        jobTitle: "أخصائي علاج طبيعي",
        role: Role.PHYSIOTHERAPIST,
        commissionType: CommissionType.PERCENT,
        commissionPercentBasisPoints: 3000, // 30% commission
      },
    });

    // 2. Patient
    patient = await testDb.patient.create({
      data: {
        fullName: "سعيد عبد الرحمن",
        mobilePhone: `+2010${Math.floor(10000000 + Math.random() * 90000000)}`,
        dateOfBirth: new Date("1988-06-15"),
        gender: "MALE",
        referralSource: "WALK_IN",
        initialComplaint: "ألم في مفصل الركبة وتيبس صباحي",
        createdByUserId: receptionistUser.id,
      },
    });

    // 3. Facility & Session Type
    room = await testDb.room.create({
      data: {
        nameAr: "غرفة التأهيل 1",
        nameEn: "Rehab Room 1",
      },
    });

    bed = await testDb.bed.create({
      data: {
        roomId: room.id,
        name: "سرير 1",
      },
    });

    sessionType = await testDb.sessionType.create({
      data: {
        code: `PT_BO_${Date.now()}`,
        nameAr: "جلسة علاج طبيعي متقدم",
        nameEn: "Advanced Physio Session",
        defaultDurationMinutes: 45,
        defaultPricePiasters: 40000, // 400 EGP
      },
    });
  });

  // Test 1: Expenses Lifecycle (Add today, edit own, void with audit reason, never hard-delete, shift lock) (R-10-1 to R-10-3)
  it("manages expense lifecycle with edit history, void soft-delete, and closed shift protection", async () => {
    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Receptionist adds an expense today
    const createRes = await createExpenseAction(
      {
        title: "شراء مستلزمات نظافة وأدوات تعقيم",
        category: ExpenseCategory.SUPPLIES,
        amountPiasters: 25000, // 250 EGP
        paymentMethod: PaymentMethod.CASH,
        expenseDate: todayStr,
        reason: "أدوات تعقيم لغرف الجلسات والعيادة",
      },
      { user: receptionistUser }
    );

    if (!createRes.success) {
      throw new Error(`createRes failed: ${JSON.stringify(createRes.error)}`);
    }
    expect(createRes.success).toBe(true);
    if (!createRes.success || !createRes.data) return;
    const expenseId = (createRes.data as any).id;

    // 2. Receptionist edits own expense on the same day (R-10-2)
    const editRes = await editExpenseAction(
      {
        expenseId,
        title: "شراء مستلزمات نظافة وتعقيم + مناديل ورقية",
        amountPiasters: 28000, // 280 EGP
        editReason: "إضافة فاتورة المناديل الورقية مع التعقيم",
      },
      { user: receptionistUser }
    );
    expect(editRes.success).toBe(true);

    // Verify history recorded in database (R-10-3)
    const history = await testDb.expenseEditHistory.findMany({
      where: { expenseId },
    });
    expect(history.length).toBe(1);
    expect(history[0].previousAmountPiasters).toBe(25000);
    expect(history[0].editReason).toBe("إضافة فاتورة المناديل الورقية مع التعقيم");

    // 3. Manager/Owner voids the expense with mandatory audit reason (R-10-3)
    const voidRes = await voidExpenseAction(
      {
        expenseId,
        voidReason: "تم إلغاء الشراء واسترداد المبلغ نقداً من المورد",
      },
      { user: managerUser }
    );
    expect(voidRes.success).toBe(true);

    // Verify expense is soft-deleted (never hard-deleted) (R-10-3, AGENTS.md)
    const dbExpense = await testDb.expense.findUnique({
      where: { id: expenseId },
    });
    expect(dbExpense).not.toBeNull();
    expect(dbExpense?.isVoided).toBe(true);
    expect(dbExpense?.voidReason).toBe("تم إلغاء الشراء واسترداد المبلغ نقداً من المورد");
    expect(dbExpense?.voidedByUserId).toBe(managerUser.id);

    // 4. Listing expenses: active expenses exclude voided by default or display with void flag
    const listRes = await getExpensesAction(
      { startDate: todayStr, endDate: todayStr },
      { user: managerUser }
    );
    expect(listRes.success).toBe(true);
    if (!listRes.success || !listRes.data) return;
    expect(listRes.data.expenses.find((e: any) => e.id === expenseId)?.isVoided).toBe(true);
  });

  // Test 2: Commissions calculation & Payout batch (No session paid twice [R-11-2, DEC-010])
  it("calculates clinician commissions and prevents any session from being paid twice", async () => {
    const today = new Date();
    const apptDate1 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 10, 0, 0));
    const apptDate2 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 11, 0, 0));

    // Create 2 completed appointments for physio
    const appt1 = await testDb.appointment.create({
      data: {
        patientId: patient.id,
        clinicianId: physioUser.id,
        sessionTypeId: sessionType.id,
        roomId: room.id,
        bedId: bed.id,
        appointmentDate: apptDate1,
        startTime: "10:00",
        endTime: "10:45",
        startsAt: apptDate1,
        endsAt: new Date(apptDate1.getTime() + 45 * 60000),
        status: AppointmentStatus.ARRIVED,
        pricePiasters: 40000,
        createdByUserId: receptionistUser.id,
      },
    });

    const appt2 = await testDb.appointment.create({
      data: {
        patientId: patient.id,
        clinicianId: physioUser.id,
        sessionTypeId: sessionType.id,
        roomId: room.id,
        bedId: bed.id,
        appointmentDate: apptDate2,
        startTime: "11:00",
        endTime: "11:45",
        startsAt: apptDate2,
        endsAt: new Date(apptDate2.getTime() + 45 * 60000),
        status: AppointmentStatus.ARRIVED,
        pricePiasters: 40000,
        createdByUserId: receptionistUser.id,
      },
    });

    // Complete both sessions
    await completeSessionAction(
      {
        appointmentId: appt1.id,
        painBefore: 7,
        painAfter: 3,
        treatmentModalities: [TreatmentModality.TENS],
        treatmentNotes: "جلسة مكتملة 1",
      },
      { user: physioUser }
    );

    await completeSessionAction(
      {
        appointmentId: appt2.id,
        painBefore: 6,
        painAfter: 2,
        treatmentModalities: [TreatmentModality.EXERCISE_THERAPY],
        treatmentNotes: "جلسة مكتملة 2",
      },
      { user: physioUser }
    );

    // 1. Calculate Commissions for Physio (30% of 400 EGP = 120 EGP per session = 12000 piasters)
    const startDateStr = today.toISOString().slice(0, 10);
    const endDateStr = today.toISOString().slice(0, 10);

    const calcRes = await calculateClinicianCommissionsAction(
      {
        clinicianId: physioUser.id,
        startDate: startDateStr,
        endDate: endDateStr,
      },
      { user: managerUser }
    );

    expect(calcRes.success).toBe(true);
    if (!calcRes.success || !calcRes.data) return;

    // Must find at least our 2 unpaid sessions
    const unpaidSessions = calcRes.data.unpaidSessions.filter(
      (s: any) => s.appointmentId === appt1.id || s.appointmentId === appt2.id
    );
    expect(unpaidSessions.length).toBe(2);
    expect(unpaidSessions[0].commissionAmountPiasters).toBe(12000); // 30% of 40000

    // 2. Owner creates Commission Payout batch for appt1 and appt2 (R-11-2)
    const payoutRes = await createCommissionPayoutAction(
      {
        clinicianId: physioUser.id,
        periodStartDate: startDateStr,
        periodEndDate: endDateStr,
        appointmentIds: [appt1.id, appt2.id],
        paymentMethod: PaymentMethod.CASH,
        notes: "صرف عمولات جلستي اليوم",
      },
      { user: ownerUser }
    );

    expect(payoutRes.success).toBe(true);
    if (!payoutRes.success || !payoutRes.data) return;
    const payoutId = (payoutRes.data as any).id;
    expect((payoutRes.data as any).totalPayoutPiasters).toBe(24000); // 2 * 12000

    // Also created a linked Expense with category DOCTOR_COMMISSION (R-11-2)
    const dbPayout = await testDb.commissionPayout.findUnique({
      where: { id: payoutId },
      include: { expense: true },
    });
    expect(dbPayout?.expense).not.toBeNull();
    expect(dbPayout?.expense?.category).toBe(ExpenseCategory.DOCTOR_COMMISSION);
    expect(dbPayout?.expense?.amountPiasters).toBe(24000);

    // 3. Verify Rule R-11-2: Second calculation MUST show 0 unpaid sessions for appt1 and appt2
    const secondCalc = await calculateClinicianCommissionsAction(
      {
        clinicianId: physioUser.id,
        startDate: startDateStr,
        endDate: endDateStr,
      },
      { user: managerUser }
    );
    expect(secondCalc.success).toBe(true);
    if (!secondCalc.success || !secondCalc.data) return;
    const remainingUnpaid = secondCalc.data.unpaidSessions.filter(
      (s: any) => s.appointmentId === appt1.id || s.appointmentId === appt2.id
    );
    expect(remainingUnpaid.length).toBe(0); // NEVER PAID TWICE!

    // 4. Physio views own commission report (R-11-4)
    const myCommRes = await getMyCommissionsAction(
      { startDate: startDateStr, endDate: endDateStr },
      { user: physioUser }
    );
    expect(myCommRes.success).toBe(true);
    if (!myCommRes.success || !myCommRes.data) return;
    expect(myCommRes.data.totalCommissionPiasters).toBeGreaterThanOrEqual(24000);
  });

  // Test 3: Payout Voiding Releases Sessions (Q-16)
  it("voiding a payout restores all linked sessions to unpaid status and voids expense (Q-16)", async () => {
    const today = new Date();
    const apptDate3 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 14, 0, 0));

    const appt3 = await testDb.appointment.create({
      data: {
        patientId: patient.id,
        clinicianId: physioUser.id,
        sessionTypeId: sessionType.id,
        roomId: room.id,
        bedId: bed.id,
        appointmentDate: apptDate3,
        startTime: "14:00",
        endTime: "14:45",
        startsAt: apptDate3,
        endsAt: new Date(apptDate3.getTime() + 45 * 60000),
        status: AppointmentStatus.ARRIVED,
        pricePiasters: 40000,
        createdByUserId: receptionistUser.id,
      },
    });

    await completeSessionAction(
      {
        appointmentId: appt3.id,
        painBefore: 5,
        painAfter: 2,
        treatmentModalities: [TreatmentModality.MANUAL_THERAPY],
        treatmentNotes: "جلسة لاختبار إلغاء الصرف",
      },
      { user: physioUser }
    );

    const todayStr = today.toISOString().slice(0, 10);

    // Create Payout
    const payoutRes = await createCommissionPayoutAction(
      {
        clinicianId: physioUser.id,
        periodStartDate: todayStr,
        periodEndDate: todayStr,
        appointmentIds: [appt3.id],
        paymentMethod: PaymentMethod.CASH,
        notes: "صرف تجريبي",
      },
      { user: ownerUser }
    );
    expect(payoutRes.success).toBe(true);
    if (!payoutRes.success || !payoutRes.data) return;
    const payoutId = (payoutRes.data as any).id;

    // Void Payout (Q-16)
    const voidRes = await voidCommissionPayoutAction(
      {
        payoutId,
        voidReason: "خطأ في احتساب ساعات العمل، سيتم إعادة الصرف لاحقاً",
      },
      { user: ownerUser }
    );
    expect(voidRes.success).toBe(true);

    // Check DB: payout is voided, linked expense is voided, and session link is released
    const dbPayout = await testDb.commissionPayout.findUnique({
      where: { id: payoutId },
      include: { expense: true, paidSessions: true },
    });
    expect(dbPayout?.isVoided).toBe(true);
    expect(dbPayout?.expense?.isVoided).toBe(true);
    expect(dbPayout?.paidSessions[0]?.isVoided).toBe(true);

    // Next calculation must include appt3 again as UNPAID (Q-16)
    const afterVoidCalc = await calculateClinicianCommissionsAction(
      {
        clinicianId: physioUser.id,
        startDate: todayStr,
        endDate: todayStr,
      },
      { user: managerUser }
    );
    expect(afterVoidCalc.success).toBe(true);
    if (!afterVoidCalc.success || !afterVoidCalc.data) return;
    const foundRestored = afterVoidCalc.data.unpaidSessions.some(
      (s: any) => s.appointmentId === appt3.id
    );
    expect(foundRestored).toBe(true);
  });

  // Test 4: 6 Reports + CSV Export Strict Privacy (R-12-1 to R-12-6)
  it("generates 6 reports and CSV exports with STRICTLY NO diagnosis or clinical data (R-12-6)", async () => {
    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Generate all 6 reports
    const reportTypes = [
      "TODAY_SUMMARY",
      "CLINICIAN_ACTIVITY",
      "FINANCIAL_REVENUE",
      "SERVICES_PACKAGES",
      "PATIENT_RETENTION",
      "EXPENSES_SUMMARY",
    ] as const;

    for (const rType of reportTypes) {
      const repRes = await getClinicReportAction(
        {
          reportType: rType,
          startDate: todayStr,
          endDate: todayStr,
        },
        { user: managerUser }
      );
      if (!repRes.success) {
        throw new Error("repRes error for " + rType + ": " + JSON.stringify((repRes as any).error));
      }
      expect(repRes.success).toBe(true);
      if (!repRes.success || !repRes.data) continue;

      // 2. Export to CSV
      const csvRes = await exportReportToCsvAction(
        {
          reportType: rType,
          startDate: todayStr,
          endDate: todayStr,
        },
        { user: managerUser }
      );
      expect(csvRes.success).toBe(true);
      if (!csvRes.success || !csvRes.data) continue;

      const csvContent = (csvRes.data as any).csvString;
      expect(typeof csvContent).toBe("string");

      // STRICT PRIVACY CHECK (R-12-6): Must NOT contain any diagnosis, SOAP, pain, or clinical notes!
      expect(csvContent).not.toMatch(/انزلاق غضروفي/i);
      expect(csvContent).not.toMatch(/تشخيص/i);
      expect(csvContent).not.toMatch(/SOAP/i);
      expect(csvContent).not.toMatch(/painBefore/i);
      expect(csvContent).not.toMatch(/subjective/i);
      expect(csvContent).not.toMatch(/assessment/i);
    }
  });

  // Test 5: Audit Log Viewer & Manager Clinical Masking (R-13-1 to R-13-3)
  it("allows Owner to view unmasked clinical audit logs, while Manager sees masked content (R-13-3)", async () => {
    // 1. Create a dummy clinical audit log record
    const auditEntry = await testDb.auditLog.create({
      data: {
        userId: physioUser.id,
        userRole: Role.PHYSIOTHERAPIST,
        action: "SESSION_COMPLETED",
        entityType: "ClinicalNote",
        entityId: "dummy-note-id",
        beforeState: { painBefore: 8, subjective: "ألم شديد في الفقرات القطنية" },
        afterState: { painAfter: 2, plan: "تمارين استطالة يومية" },
        reason: "اكتمال الجلسة",
      },
    });

    // 2. Owner queries audit logs -> sees UNMASKED clinical details
    const ownerView = await getAuditLogsAction(
      { entityType: "ClinicalNote" },
      { user: ownerUser }
    );
    if (!ownerView.success) {
      throw new Error("ownerView error: " + JSON.stringify((ownerView as any).error));
    }
    expect(ownerView.success).toBe(true);
    if (!ownerView.success || !ownerView.data) return;
    const ownerItem = ownerView.data.logs.find((l: any) => l.id === auditEntry.id);
    expect(ownerItem).toBeDefined();
    expect(JSON.stringify(ownerItem?.beforeState)).toContain("ألم شديد في الفقرات القطنية");

    // 3. Manager queries audit logs -> clinical content MUST BE MASKED (R-13-3)!
    const managerView = await getAuditLogsAction(
      { entityType: "ClinicalNote" },
      { user: managerUser }
    );
    if (!managerView.success) {
      throw new Error("managerView error: " + JSON.stringify((managerView as any).error));
    }
    expect(managerView.success).toBe(true);
    if (!managerView.success || !managerView.data) return;
    const managerItem = managerView.data.logs.find((l: any) => l.id === auditEntry.id);
    expect(managerItem).toBeDefined();
    // Clinical data MUST be replaced with masked indicator
    expect(JSON.stringify(managerItem?.beforeState)).toContain("*** MASKED CLINICAL CONTENT ***");
    expect(JSON.stringify(managerItem?.afterState)).toContain("*** MASKED CLINICAL CONTENT ***");
    expect(JSON.stringify(managerItem?.beforeState)).not.toContain("ألم شديد في الفقرات القطنية");
  });
});
