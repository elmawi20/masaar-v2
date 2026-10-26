import { describe, it, expect, beforeAll } from "vitest";
import { testDb } from "../helpers/db";
import {
  recordPaymentAction,
  voidPaymentAction,
  issueRefundAction,
  changePriceAction,
  closeCashShiftAction,
  getCurrentUserCashShiftStatusAction,
  getChargeBillingDetailsAction,
} from "@/server/actions/billing";
import { Role, Gender, ReferralSource, SessionCategory, PaymentMethod } from "@prisma/client";
import { hashPassword } from "@/server/auth/crypto";

describe("Module 3.7 Billing Integration Tests [Spec §8]", () => {
  const suffix = Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);

  let ownerUser: { id: string; email: string; role: Role; isActive: boolean };
  let receptionistUser: { id: string; email: string; role: Role; isActive: boolean };
  let physioUser: { id: string; email: string; role: Role; isActive: boolean };

  let patientId: string;
  let sessionTypeId: string;
  let chargeId: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword("MasaarTest2026!");

    const owner = await testDb.user.create({
      data: {
        email: `bill_owner_${suffix}@masaar.local`,
        fullName: "د. أيمن المالك",
        phone: "0100" + Math.floor(1000000 + Math.random() * 9000000),
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
        email: `bill_rec_${suffix}@masaar.local`,
        fullName: "منار كاشير الاستقبال",
        phone: "0101" + Math.floor(1000000 + Math.random() * 9000000),
        jobTitle: "موظفة استقبال وخزينة",
        role: "RECEPTIONIST",
        passwordHash,
        isActive: true,
      },
    });
    receptionistUser = { id: rec.id, email: rec.email, role: rec.role as Role, isActive: rec.isActive };

    const physio = await testDb.user.create({
      data: {
        email: `bill_physio_${suffix}@masaar.local`,
        fullName: "د. شريف علاج طبيعي",
        phone: "0102" + Math.floor(1000000 + Math.random() * 9000000),
        jobTitle: "أخصائي علاج طبيعي",
        role: "PHYSIOTHERAPIST",
        passwordHash,
        isActive: true,
      },
    });
    physioUser = { id: physio.id, email: physio.email, role: physio.role as Role, isActive: physio.isActive };

    const p = await testDb.patient.create({
      data: {
        fullName: "محمود السيد البدوي",
        mobilePhone: "010" + Math.floor(10000000 + Math.random() * 90000000),
        dateOfBirth: new Date("1992-05-20"),
        gender: Gender.MALE,
        status: "ACTIVE",
        referralSource: ReferralSource.FACEBOOK,
        initialComplaint: "ألم أسفل الظهر",
        dataConsent: true,
        whatsappConsent: true,
      },
    });
    patientId = p.id;

    const st = await testDb.sessionType.create({
      data: {
        code: `BILL_ST_${suffix}`.toUpperCase(),
        nameAr: "جلسة علاج طبيعي متقدم",
        nameEn: "Advanced PT",
        category: SessionCategory.PHYSIOTHERAPY,
        defaultDurationMinutes: 45,
        defaultPricePiasters: 40000, // 400 EGP
        isActive: true,
      },
    });
    sessionTypeId = st.id;

    // Create a standalone charge of 400 EGP (40,000 piasters)
    const ch = await testDb.charge.create({
      data: {
        patientId,
        amountPiasters: 40000,
        description: "جلسة علاج طبيعي فردية",
        createdByUserId: receptionistUser.id,
      },
    });
    chargeId = ch.id;
  });

  // Test 1: Record payment, sequential receipt numbering INV-YYYY-00001, and overpayment prevention (R-8.1-2, R-8.2-1, R-8.2-2, R-8.2-3)
  it("records payment with sequential receipt INV-YYYY-00001 and rejects overpayment", async () => {
    // 1. Attempt to overpay 500 EGP on a 400 EGP charge -> MUST FAIL (R-8.2-1)
    const overpayRes = await recordPaymentAction(
      {
        chargeId,
        amountPiasters: 50000,
        paymentMethod: PaymentMethod.CASH,
      },
      { user: receptionistUser }
    );
    expect(overpayRes.success).toBe(false);

    // 2. Pay 250 EGP (25,000 piasters) partially
    const pay1 = await recordPaymentAction(
      {
        chargeId,
        amountPiasters: 25000,
        paymentMethod: PaymentMethod.CASH,
        notes: "دفعة أولى نقداً",
      },
      { user: receptionistUser }
    );
    expect(pay1.success).toBe(true);
    if (!pay1.success || !pay1.data) return;

    const payment1 = pay1.data as any;
    expect(payment1.amountPiasters).toBe(25000);
    // Matches INV-YYYY-00001 format (R-8.2-2)
    expect(payment1.receiptNumber).toMatch(/^INV-\d{4}-\d{5}$/);
    expect(payment1.receiptYear).toBe(new Date().getUTCFullYear());
    expect(payment1.receiptSequence).toBeGreaterThan(0);

    // 3. Balance details check: remaining = 40,000 - 25,000 = 15,000 piasters (R-8.1-3)
    const detailsRes = await getChargeBillingDetailsAction(
      { chargeId },
      { user: receptionistUser }
    );
    expect(detailsRes.success).toBe(true);
    if (!detailsRes.success || !detailsRes.data) return;
    expect(detailsRes.data.balancePiasters).toBe(15000);

    // 4. Pay remaining 150 EGP via InstaPay -> generates sequential receipt (e.g. sequence + 1)
    const pay2 = await recordPaymentAction(
      {
        chargeId,
        amountPiasters: 15000,
        paymentMethod: PaymentMethod.INSTAPAY,
        referenceNumber: "INSTA-992831",
      },
      { user: receptionistUser }
    );
    expect(pay2.success).toBe(true);
    if (!pay2.success || !pay2.data) return;

    const payment2 = pay2.data as any;
    expect(payment2.receiptSequence).toBe(payment1.receiptSequence + 1);

    // Balance should now be exactly 0
    const finalDetails = await getChargeBillingDetailsAction(
      { chargeId },
      { user: receptionistUser }
    );
    expect(finalDetails.success).toBe(true);
    if (!finalDetails.success || !finalDetails.data) return;
    expect(finalDetails.data.balancePiasters).toBe(0);
  });

  // Test 2: Void payment by Owner/Manager with reason, restoring balance (R-8.3-1)
  it("allows Owner/Manager to void a payment with reason, keeping it struck-through and restoring balance", async () => {
    // Create separate charge of 300 EGP
    const testCharge = await testDb.charge.create({
      data: {
        patientId,
        amountPiasters: 30000,
        description: "جلسة لاختبار الإلغاء Void",
        createdByUserId: receptionistUser.id,
      },
    });

    const paymentRes = await recordPaymentAction(
      {
        chargeId: testCharge.id,
        amountPiasters: 30000,
        paymentMethod: PaymentMethod.CASH,
      },
      { user: receptionistUser }
    );
    expect(paymentRes.success).toBe(true);
    if (!paymentRes.success || !paymentRes.data) return;
    const payment = paymentRes.data as any;

    // 1. Receptionist cannot void payment (R-1.1-12)
    const recVoid = await voidPaymentAction(
      {
        paymentId: payment.id,
        reason: "خطأ في التحصيل",
      },
      { user: receptionistUser }
    );
    expect(recVoid.success).toBe(false);

    // 2. Owner can void payment with reason (R-8.3-1)
    const ownerVoid = await voidPaymentAction(
      {
        paymentId: payment.id,
        reason: "تسجيل مكرر بالخطأ للمريض من الاستقبال",
      },
      { user: ownerUser }
    );
    expect(ownerVoid.success).toBe(true);

    // Check DB state: payment is voided, not hard-deleted!
    const dbPayment = await testDb.payment.findUnique({ where: { id: payment.id } });
    expect(dbPayment?.isVoided).toBe(true);
    expect(dbPayment?.voidReason).toContain("تسجيل مكرر");
    expect(dbPayment?.voidedByUserId).toBe(ownerUser.id);

    // Balance restored to full 30,000 piasters (R-8.1-3)
    const details = await getChargeBillingDetailsAction(
      { chargeId: testCharge.id },
      { user: receptionistUser }
    );
    expect(details.success).toBe(true);
    if (!details.success || !details.data) return;
    expect(details.data.balancePiasters).toBe(30000);
  });

  // Test 3: Issue refund by Owner/Manager with drawer attribution (R-8.3-2, R-8.3-3, DEC-019)
  it("issues refund by Owner/Manager with cash drawer attribution and bounds check", async () => {
    // Charge 500 EGP, paid 500 EGP
    const refCharge = await testDb.charge.create({
      data: {
        patientId,
        amountPiasters: 50000,
        description: "جلسة لاختبار الاسترداد Refund",
        createdByUserId: receptionistUser.id,
      },
    });

    const payRes = await recordPaymentAction(
      {
        chargeId: refCharge.id,
        amountPiasters: 50000,
        paymentMethod: PaymentMethod.CASH,
      },
      { user: receptionistUser }
    );
    expect(payRes.success).toBe(true);

    // 1. Attempt refund exceeding paid amount (600 EGP > 500 EGP) -> MUST FAIL (R-8.3-2)
    const overRefund = await issueRefundAction(
      {
        chargeId: refCharge.id,
        amountPiasters: 60000,
        refundMethod: PaymentMethod.CASH,
        handedOutByUserId: receptionistUser.id,
        reason: "استرداد زائد",
      },
      { user: ownerUser }
    );
    expect(overRefund.success).toBe(false);

    // 2. Receptionist cannot approve refund (R-1.1-12)
    const recRefund = await issueRefundAction(
      {
        chargeId: refCharge.id,
        amountPiasters: 20000,
        refundMethod: PaymentMethod.CASH,
        handedOutByUserId: receptionistUser.id,
        reason: "طلب المريض",
      },
      { user: receptionistUser }
    );
    expect(recRefund.success).toBe(false);

    // 3. Valid refund by Owner: 200 EGP cash handed out by receptionist (R-8.3-3)
    const refundRes = await issueRefundAction(
      {
        chargeId: refCharge.id,
        amountPiasters: 20000,
        refundMethod: PaymentMethod.CASH,
        handedOutByUserId: receptionistUser.id,
        reason: "استرداد جزء من المبلغ لعدم استكمال البرنامج بناء على توصية طبية",
      },
      { user: ownerUser }
    );
    expect(refundRes.success).toBe(true);

    // Verify DB Refund record
    const dbRefund = await testDb.refund.findFirst({
      where: { chargeId: refCharge.id },
    });
    expect(dbRefund).not.toBeNull();
    expect(dbRefund?.amountPiasters).toBe(20000);
    expect(dbRefund?.handedOutByUserId).toBe(receptionistUser.id);
    expect(dbRefund?.approvedByUserId).toBe(ownerUser.id);
  });

  // Test 4: Price change permissions before & after payment (R-1.1-13, R-1.1-14, R-8.3-4)
  it("allows Receptionist to adjust price before payment, but restricts price change after payment to Owner/Manager above paid amount", async () => {
    // 1. New charge 400 EGP with zero payments
    const flexCharge = await testDb.charge.create({
      data: {
        patientId,
        amountPiasters: 40000,
        description: "جلسة علاج مرنة السعر",
        createdByUserId: receptionistUser.id,
      },
    });

    // Receptionist changes price to 350 EGP before payment (R-1.1-13)
    const recPriceChange = await changePriceAction(
      {
        chargeId: flexCharge.id,
        newPricePiasters: 35000,
        reason: "خصم نقابي معتمد قبل السداد",
      },
      { user: receptionistUser }
    );
    expect(recPriceChange.success).toBe(true);

    const updatedCharge = await testDb.charge.findUnique({ where: { id: flexCharge.id } });
    expect(updatedCharge?.amountPiasters).toBe(35000);

    // Price change history logged (R-8.3-4)
    const history1 = await testDb.priceChangeHistory.findFirst({
      where: { entityId: flexCharge.id },
    });
    expect(history1).not.toBeNull();
    expect(history1?.oldPricePiasters).toBe(40000);
    expect(history1?.newPricePiasters).toBe(35000);

    // 2. Pay 200 EGP
    await recordPaymentAction(
      {
        chargeId: flexCharge.id,
        amountPiasters: 20000,
        paymentMethod: PaymentMethod.CASH,
      },
      { user: receptionistUser }
    );

    // Receptionist tries to change price after payment exists -> MUST FAIL (R-1.1-14)
    const recBlocked = await changePriceAction(
      {
        chargeId: flexCharge.id,
        newPricePiasters: 25000,
        reason: "محاولة تعديل السعر بعد السداد",
      },
      { user: receptionistUser }
    );
    expect(recBlocked.success).toBe(false);

    // Owner tries to reduce price below paid amount (150 EGP < 200 EGP paid) -> MUST FAIL (R-8.3-4)
    const ownerBelowPaid = await changePriceAction(
      {
        chargeId: flexCharge.id,
        newPricePiasters: 15000,
        reason: "تخفيض غير مسموح تحت المسدد",
      },
      { user: ownerUser }
    );
    expect(ownerBelowPaid.success).toBe(false);

    // Owner changes price to 300 EGP (valid, >= 200 EGP paid) -> SUCCESS (R-8.3-4)
    const ownerSuccess = await changePriceAction(
      {
        chargeId: flexCharge.id,
        newPricePiasters: 30000,
        reason: "تسوية إدارية بقرار المالك",
      },
      { user: ownerUser }
    );
    expect(ownerSuccess.success).toBe(true);

    const finalCharge = await testDb.charge.findUnique({ where: { id: flexCharge.id } });
    expect(finalCharge?.amountPiasters).toBe(30000);
  });

  // Test 5: Cash closing end of shift, frozen snapshot, and unclosed shift status (R-8.4-1, R-8.4-2)
  it("closes cash shift with frozen snapshot calculation and tracks unclosed cash shift status for logout prompt", async () => {
    // 1. Create a dedicated receptionist for shift test
    const shiftRec = await testDb.user.create({
      data: {
        email: `shift_rec_${suffix}@masaar.local`,
        fullName: "سارة وردية مسائية",
        phone: "0103" + Math.floor(1000000 + Math.random() * 9000000),
        jobTitle: "استقبال",
        role: "RECEPTIONIST",
        passwordHash: await hashPassword("MasaarTest2026!"),
        isActive: true,
      },
    });
    const shiftRecUser = { id: shiftRec.id, email: shiftRec.email, role: shiftRec.role as Role, isActive: true };

    // Initially has zero cash transactions
    const initialStatus = await getCurrentUserCashShiftStatusAction({}, { user: shiftRecUser });
    expect(initialStatus.success).toBe(true);
    if (!initialStatus.success || !initialStatus.data) return;
    expect(initialStatus.data.hasUnclosedCashTransactions).toBe(false);

    // Record cash payment of 1,000 EGP collected by shiftRec
    const shiftCharge = await testDb.charge.create({
      data: {
        patientId,
        amountPiasters: 100000,
        description: "باقة للوردية",
        createdByUserId: shiftRec.id,
      },
    });

    await recordPaymentAction(
      {
        chargeId: shiftCharge.id,
        amountPiasters: 100000,
        paymentMethod: PaymentMethod.CASH,
      },
      { user: shiftRecUser }
    );

    // Now has unclosed cash transactions -> logout prompt must trigger (R-8.4-2)
    const midStatus = await getCurrentUserCashShiftStatusAction({}, { user: shiftRecUser });
    expect(midStatus.success).toBe(true);
    if (!midStatus.success || !midStatus.data) return;
    expect(midStatus.data.hasUnclosedCashTransactions).toBe(true);
    // Expected cash = 100,000 piasters (1,000 EGP)
    expect(midStatus.data.expectedCashPiasters).toBe(100000);

    // Close shift with counted cash = 990 EGP (99,000 piasters) -> difference = -1,000 piasters (deficit 10 EGP)
    const closeRes = await closeCashShiftAction(
      {
        countedCashPiasters: 99000,
        closingNotes: "عجز بسيط 10 جنيهات",
      },
      { user: shiftRecUser }
    );
    expect(closeRes.success).toBe(true);
    if (!closeRes.success || !closeRes.data) return;

    const closing = closeRes.data as any;
    expect(closing.status).toBe("CLOSED");
    expect(closing.expectedCashPiasters).toBe(100000);
    expect(closing.countedCashPiasters).toBe(99000);
    expect(closing.differencePiasters).toBe(-1000);

    // After closing, shift status hasUnclosedCashTransactions becomes false
    const finalStatus = await getCurrentUserCashShiftStatusAction({}, { user: shiftRecUser });
    expect(finalStatus.success).toBe(true);
    if (!finalStatus.success || !finalStatus.data) return;
    expect(finalStatus.data.hasUnclosedCashTransactions).toBe(false);
  });
});
