import "dotenv/config";
import {
  PrismaClient,
  Role,
  Gender,
  ReferralSource,
  PaymentMethod,
  SessionCategory,
  AppointmentStatus,
  ChargeStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Masaar Clinic System database seed with Egyptian fake data...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Clinic Settings
  const existingSetting = await prisma.clinicSetting.findFirst();
  if (!existingSetting) {
    await prisma.clinicSetting.create({
      data: {
        nameAr: "عيادة مسار للعلاج الطبيعي والتغذية العلاجية",
        nameEn: "Masaar Clinic for Physiotherapy & Clinical Nutrition",
        addressAr: "١٥ شارع مصطفى النحاس، مدينة نصر، القاهرة",
        addressEn: "15 Mostafa El-Nahas St., Nasr City, Cairo, Egypt",
        phone: "01000000001",
        timezone: "Africa/Cairo",
        defaultPackageExpiryDays: 60,
        doctorDailySoftLimit: 12,
        receiptPrefix: "INV",
        noteEditWindowHours: 24,
      },
    });
    console.log("  ✅ Clinic settings created");
  }

  // 2. Clinic Opening Hours (0=Sat ... 6=Fri)
  for (let day = 0; day <= 6; day++) {
    const isFriday = day === 6;
    await prisma.clinicOpeningHour.upsert({
      where: { dayOfWeek: day },
      update: {},
      create: {
        dayOfWeek: day,
        isOpen: !isFriday,
        openTime: isFriday ? "00:00" : "09:00",
        closeTime: isFriday ? "00:00" : "21:00",
      },
    });
  }
  console.log("  ✅ Clinic opening hours (Sat-Thu 09:00-21:00, Fri closed) seeded");

  // 3. Staff Users for all 5 roles
  const usersData = [
    {
      email: "owner@masaar.local",
      fullName: "د. أحمد المعوي",
      phone: "01012345671",
      jobTitle: "استشاري ورئيس مجلس الإدارة",
      role: Role.OWNER,
      canAssess: true,
      commissionPercentBasisPoints: 4000, // 40%
    },
    {
      email: "manager@masaar.local",
      fullName: "منى حسن الشريف",
      phone: "01112345672",
      jobTitle: "مديرة العيادة والعمليات",
      role: Role.MANAGER,
      canAssess: false,
      commissionPercentBasisPoints: 0,
    },
    {
      email: "receptionist@masaar.local",
      fullName: "سارة محمود إبراهيم",
      phone: "01212345673",
      jobTitle: "مسؤولة الاستقبال والخدمات",
      role: Role.RECEPTIONIST,
      canAssess: false,
      commissionPercentBasisPoints: 0,
    },
    {
      email: "physio@masaar.local",
      fullName: "د. عمر طارق كمال",
      phone: "01098765431",
      jobTitle: "أخصائي أول العلاج الطبيعي",
      role: Role.PHYSIOTHERAPIST,
      canAssess: true,
      commissionPercentBasisPoints: 3000, // 30%
    },
    {
      email: "nutritionist@masaar.local",
      fullName: "د. نوران علي رضوان",
      phone: "01512345675",
      jobTitle: "أخصائية التغذية العلاجية وإدارة الوزن",
      role: Role.NUTRITIONIST,
      canAssess: false,
      commissionPercentBasisPoints: 2500, // 25%
    },
  ];

  const seededUsers: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        phone: u.phone,
        jobTitle: u.jobTitle,
        role: u.role,
        canAssess: u.canAssess,
        passwordHash,
      },
      create: {
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        phone: u.phone,
        jobTitle: u.jobTitle,
        role: u.role,
        canAssess: u.canAssess,
        commissionPercentBasisPoints: u.commissionPercentBasisPoints,
        isActive: true,
      },
    });
    seededUsers[u.role] = user;
  }
  console.log("  ✅ Staff users for all 5 roles seeded (owner, manager, receptionist, physio, nutritionist)");

  // 3b. Staff Weekly Schedules (Sat-Thu 09:00 - 21:00)
  for (const clinician of [seededUsers.OWNER, seededUsers.PHYSIOTHERAPIST, seededUsers.NUTRITIONIST]) {
    for (let day = 0; day <= 5; day++) {
      await prisma.staffSchedule.upsert({
        where: {
          userId_dayOfWeek_shiftNumber: {
            userId: clinician.id,
            dayOfWeek: day,
            shiftNumber: 1,
          },
        },
        update: {},
        create: {
          userId: clinician.id,
          dayOfWeek: day,
          shiftNumber: 1,
          isWorking: true,
          startTime: "09:00",
          endTime: "21:00",
        },
      });
    }
  }
  console.log("  ✅ Weekly staff schedules seeded for clinicians");

  // 4. Rooms and Beds
  const roomsData = [
    {
      nameAr: "غرفة العلاج الطبيعي العامة",
      nameEn: "General Physiotherapy Room",
      beds: ["سرير 1 - كهرباء", "سرير 2 - ليزر"],
    },
    {
      nameAr: "غرفة التأهيل الحركي المتقدم",
      nameEn: "Advanced Rehabilitation Room",
      beds: ["سرير التأهيل"],
    },
    {
      nameAr: "عيادة التغذية والتقييم الاستشاري",
      nameEn: "Nutrition & Consultation Clinic",
      beds: ["سرير الفحص الشامل"],
    },
  ];

  const seededRooms: any[] = [];
  const seededBeds: any[] = [];

  for (const r of roomsData) {
    let room = await prisma.room.findFirst({ where: { nameAr: r.nameAr } });
    if (!room) {
      room = await prisma.room.create({
        data: {
          nameAr: r.nameAr,
          nameEn: r.nameEn,
          isActive: true,
          createdByUserId: seededUsers.OWNER.id,
        },
      });
    }
    seededRooms.push(room);

    for (const bName of r.beds) {
      let bed = await prisma.bed.findFirst({
        where: { roomId: room.id, name: bName },
      });
      if (!bed) {
        bed = await prisma.bed.create({
          data: {
            roomId: room.id,
            name: bName,
            isActive: true,
            createdByUserId: seededUsers.OWNER.id,
          },
        });
      }
      seededBeds.push(bed);
    }
  }
  console.log(`  ✅ ${seededRooms.length} rooms and ${seededBeds.length} beds seeded`);

  // 5. Session Types
  const sessionTypesData = [
    {
      code: "PT_STANDARD",
      category: SessionCategory.PHYSIOTHERAPY,
      nameAr: "جلسة علاج طبيعي قياسية",
      nameEn: "Standard Physiotherapy Session",
      defaultDurationMinutes: 45,
      defaultPricePiasters: 35000, // 350 EGP
    },
    {
      code: "NUTRITION_CONSULT",
      category: SessionCategory.NUTRITION,
      nameAr: "استشارة ومتابعة تغذية علاجية",
      nameEn: "Clinical Nutrition Consultation",
      defaultDurationMinutes: 30,
      defaultPricePiasters: 30000, // 300 EGP
    },
    {
      code: "CONSULTANT_ASSESS",
      category: SessionCategory.CONSULTANT_ASSESSMENT,
      nameAr: "كشف وتقييم استشاري شامل",
      nameEn: "Comprehensive Consultant Assessment",
      defaultDurationMinutes: 60,
      defaultPricePiasters: 50000, // 500 EGP
    },
  ];

  const seededSessionTypes: Record<string, any> = {};
  for (const st of sessionTypesData) {
    const sType = await prisma.sessionType.upsert({
      where: { code: st.code },
      update: {
        nameAr: st.nameAr,
        nameEn: st.nameEn,
        defaultPricePiasters: st.defaultPricePiasters,
        defaultDurationMinutes: st.defaultDurationMinutes,
      },
      create: {
        code: st.code,
        category: st.category,
        nameAr: st.nameAr,
        nameEn: st.nameEn,
        defaultDurationMinutes: st.defaultDurationMinutes,
        defaultPricePiasters: st.defaultPricePiasters,
        isActive: true,
        createdByUserId: seededUsers.OWNER.id,
      },
    });
    seededSessionTypes[st.code] = sType;
  }
  console.log("  ✅ Session types seeded (PT, Nutrition, Assessment)");

  // 6. Realistic Egyptian Patients (Adults & Dependents with guardians)
  const patientsSeedData = [
    {
      fullName: "محمود فاروق الدسوقي",
      mobilePhone: "01001112233",
      whatsappPhone: "01001112233",
      isDependent: false,
      dateOfBirth: new Date("1985-06-15T00:00:00Z"),
      gender: Gender.MALE,
      address: "حي السفارات، مدينة نصر، القاهرة",
      emergencyContactName: "فاروق الدسوقي",
      emergencyContactPhone: "01009998877",
      referralSource: ReferralSource.GOOGLE,
      initialComplaint: "آلام حادة أسفل الظهر مع تنميل في الفخذ الأيمن (عرق النسا)",
      hasDiabetes: false,
      hasHypertension: true,
      dataConsent: true,
      whatsappConsent: true,
    },
    {
      fullName: "ياسمين إبراهيم النجار",
      mobilePhone: "01112223344",
      whatsappPhone: "01112223344",
      isDependent: false,
      dateOfBirth: new Date("1993-09-20T00:00:00Z"),
      gender: Gender.FEMALE,
      address: "التجمع الخامس، القاهرة الجديدة",
      emergencyContactName: "إبراهيم النجار",
      emergencyContactPhone: "01118887766",
      referralSource: ReferralSource.FACEBOOK,
      initialComplaint: "رغبة في إنقاص الوزن ومتابعة حمية غذائية متوازنة لتكيس المبايض",
      dataConsent: true,
      whatsappConsent: true,
    },
    {
      fullName: "علي حسن الشربيني",
      mobilePhone: null,
      isDependent: true,
      guardianName: "حسن الشربيني",
      guardianPhone: "01223334455",
      whatsappPhone: "01223334455",
      dateOfBirth: new Date("2015-03-10T00:00:00Z"),
      gender: Gender.MALE,
      address: "مصر الجديدة، القاهرة",
      referralSource: ReferralSource.DOCTOR,
      referringDoctor: "د. سامح عبد السلام (استشاري عظام)",
      initialComplaint: "تأهيل ما بعد الجبس إثر كسر في مفصل الكاحل الأيسر",
      dataConsent: true,
      whatsappConsent: true,
    },
    {
      fullName: "ليلى طارق عبد الفتاح",
      mobilePhone: null,
      isDependent: true,
      guardianName: "مريم رضوان",
      guardianPhone: "01066554433",
      whatsappPhone: "01066554433",
      dateOfBirth: new Date("2019-07-25T00:00:00Z"),
      gender: Gender.FEMALE,
      address: "المعادي، القاهرة",
      referralSource: ReferralSource.INSTAGRAM,
      initialComplaint: "تأخر حركي بسيط وتمارين تقوية للأطراف السفلية",
      dataConsent: true,
      whatsappConsent: true,
    },
    {
      fullName: "حاج مصطفى عبد اللطيف",
      mobilePhone: null,
      isDependent: true,
      guardianName: "أحمد مصطفى عبد اللطيف",
      guardianPhone: "01188776655",
      whatsappPhone: "01188776655",
      dateOfBirth: new Date("1948-11-05T00:00:00Z"),
      gender: Gender.MALE,
      address: "الدقي، الجيزة",
      referralSource: ReferralSource.DOCTOR,
      referringDoctor: "د. حازم شريف",
      initialComplaint: "خشونة متقدمة بمفصلي الركبة وصعوبة في صعود الدرج",
      hasOsteoporosis: true,
      hasFallRisk: true,
      dataConsent: true,
      whatsappConsent: true,
    },
    {
      fullName: "سارة كمال المنشاوي",
      mobilePhone: "01055443322",
      whatsappPhone: "01055443322",
      isDependent: false,
      dateOfBirth: new Date("1996-01-18T00:00:00Z"),
      gender: Gender.FEMALE,
      address: "الشيخ زايد، 6 أكتوبر",
      referralSource: ReferralSource.DOCTOR,
      initialComplaint: "تأهيل بعد جراحة الرباط الصليبي الأمامي للركبة اليمنى",
      dataConsent: true,
      whatsappConsent: true,
    },
  ];

  const seededPatients: any[] = [];
  for (const p of patientsSeedData) {
    let patient = await prisma.patient.findFirst({
      where: p.mobilePhone ? { mobilePhone: p.mobilePhone } : { fullName: p.fullName },
    });
    if (!patient) {
      patient = await prisma.patient.create({ data: p });
    }
    seededPatients.push(patient);
  }
  console.log(`  ✅ ${seededPatients.length} realistic Egyptian patients seeded (adults and dependents)`);

  // 7. Packages and Payments
  let pkg = await prisma.package.findFirst({ where: { patientId: seededPatients[0].id } });
  if (!pkg) {
    const today = new Date();
    const expiry = new Date(today);
    expiry.setDate(today.getDate() + 60);

    pkg = await prisma.package.create({
      data: {
        patientId: seededPatients[0].id,
        sessionTypeId: seededSessionTypes.PT_STANDARD.id,
        totalSessions: 12,
        totalPricePiasters: 360000, // 3,600 EGP
        startDate: today,
        expiryDate: expiry,
        notes: "باقة علاج طبيعي وتأهيل عمود فقري 12 جلسة",
        createdByUserId: seededUsers.RECEPTIONIST.id,
      },
    });

    const charge = await prisma.charge.create({
      data: {
        patientId: seededPatients[0].id,
        packageId: pkg.id,
        amountPiasters: 360000,
        description: "شراء باقة علاج طبيعي 12 جلسة",
        status: ChargeStatus.ACTIVE,
        createdByUserId: seededUsers.RECEPTIONIST.id,
      },
    });

    await prisma.payment.create({
      data: {
        chargeId: charge.id,
        receiptNumber: "INV-2026-00001",
        receiptYear: 2026,
        receiptSequence: 1,
        amountPiasters: 360000,
        paymentMethod: PaymentMethod.CASH,
        collectedByUserId: seededUsers.RECEPTIONIST.id,
      },
    });
    console.log("  ✅ Package, Charge, and Payment (INV-2026-00001) seeded");
  }

  // 8. One Week of Appointments (Current Saturday through Thursday)
  // Calculate Saturday of current week
  const now = new Date();
  const currentJsDay = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  // Days to subtract to get to Saturday (if Sat: 0, if Sun: 1, ..., if Fri: 6)
  const daysSinceSaturday = (currentJsDay + 1) % 7;
  const saturdayDate = new Date(now);
  saturdayDate.setUTCDate(now.getUTCDate() - daysSinceSaturday);

  console.log("  🗓️ Seeding one week of realistic appointments across rooms and beds...");

  // Schedule template for 6 weekdays (Sat to Thu)
  const weekSchedule = [
    {
      dayOffset: 0, // Saturday
      slots: [
        { patientIdx: 0, time: "10:00", dur: 45, type: "PT_STANDARD", clinician: "PHYSIOTHERAPIST", roomIdx: 0, bedIdx: 0, status: AppointmentStatus.COMPLETED },
        { patientIdx: 1, time: "11:00", dur: 30, type: "NUTRITION_CONSULT", clinician: "NUTRITIONIST", roomIdx: 2, bedIdx: 3, status: AppointmentStatus.COMPLETED },
        { patientIdx: 2, time: "12:00", dur: 45, type: "PT_STANDARD", clinician: "PHYSIOTHERAPIST", roomIdx: 0, bedIdx: 1, status: AppointmentStatus.COMPLETED },
      ],
    },
    {
      dayOffset: 1, // Sunday
      slots: [
        { patientIdx: 3, time: "10:00", dur: 45, type: "PT_STANDARD", clinician: "PHYSIOTHERAPIST", roomIdx: 0, bedIdx: 0, status: AppointmentStatus.COMPLETED },
        { patientIdx: 4, time: "11:00", dur: 60, type: "CONSULTANT_ASSESS", clinician: "OWNER", roomIdx: 1, bedIdx: 2, status: AppointmentStatus.COMPLETED },
        { patientIdx: 5, time: "14:00", dur: 45, type: "PT_STANDARD", clinician: "PHYSIOTHERAPIST", roomIdx: 0, bedIdx: 1, status: AppointmentStatus.COMPLETED },
      ],
    },
    {
      dayOffset: 2, // Monday
      slots: [
        { patientIdx: 0, time: "10:00", dur: 45, type: "PT_STANDARD", clinician: "PHYSIOTHERAPIST", roomIdx: 0, bedIdx: 0, status: AppointmentStatus.ARRIVED },
        { patientIdx: 1, time: "12:00", dur: 30, type: "NUTRITION_CONSULT", clinician: "NUTRITIONIST", roomIdx: 2, bedIdx: 3, status: AppointmentStatus.SCHEDULED },
        { patientIdx: 2, time: "14:00", dur: 45, type: "PT_STANDARD", clinician: "PHYSIOTHERAPIST", roomIdx: 0, bedIdx: 1, status: AppointmentStatus.SCHEDULED },
      ],
    },
    {
      dayOffset: 3, // Tuesday
      slots: [
        { patientIdx: 3, time: "10:00", dur: 45, type: "PT_STANDARD", clinician: "PHYSIOTHERAPIST", roomIdx: 0, bedIdx: 0, status: AppointmentStatus.SCHEDULED },
        { patientIdx: 4, time: "11:30", dur: 45, type: "PT_STANDARD", clinician: "PHYSIOTHERAPIST", roomIdx: 0, bedIdx: 1, status: AppointmentStatus.WAITLISTED },
        { patientIdx: 5, time: "15:00", dur: 45, type: "PT_STANDARD", clinician: "PHYSIOTHERAPIST", roomIdx: 1, bedIdx: 2, status: AppointmentStatus.SCHEDULED },
      ],
    },
    {
      dayOffset: 4, // Wednesday
      slots: [
        { patientIdx: 0, time: "10:00", dur: 45, type: "PT_STANDARD", clinician: "PHYSIOTHERAPIST", roomIdx: 0, bedIdx: 0, status: AppointmentStatus.SCHEDULED },
        { patientIdx: 1, time: "13:00", dur: 30, type: "NUTRITION_CONSULT", clinician: "NUTRITIONIST", roomIdx: 2, bedIdx: 3, status: AppointmentStatus.SCHEDULED },
        { patientIdx: 2, time: "16:00", dur: 45, type: "PT_STANDARD", clinician: "PHYSIOTHERAPIST", roomIdx: 0, bedIdx: 1, status: AppointmentStatus.SCHEDULED },
      ],
    },
    {
      dayOffset: 5, // Thursday
      slots: [
        { patientIdx: 4, time: "10:00", dur: 45, type: "PT_STANDARD", clinician: "PHYSIOTHERAPIST", roomIdx: 0, bedIdx: 0, status: AppointmentStatus.SCHEDULED },
        { patientIdx: 5, time: "11:30", dur: 45, type: "PT_STANDARD", clinician: "PHYSIOTHERAPIST", roomIdx: 1, bedIdx: 2, status: AppointmentStatus.SCHEDULED },
        { patientIdx: 3, time: "14:00", dur: 45, type: "PT_STANDARD", clinician: "PHYSIOTHERAPIST", roomIdx: 0, bedIdx: 1, status: AppointmentStatus.CANCELLED },
      ],
    },
  ];

  let appointmentsCreated = 0;
  for (const dayItem of weekSchedule) {
    const apptDate = new Date(saturdayDate);
    apptDate.setUTCDate(saturdayDate.getUTCDate() + dayItem.dayOffset);
    const dateStr = apptDate.toISOString().slice(0, 10);

    for (const slot of dayItem.slots) {
      const [h, m] = slot.time.split(":").map(Number);
      // Cairo is UTC+2
      const startsAt = new Date(`${dateStr}T${(h - 2).toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00Z`);
      const endsAt = new Date(startsAt.getTime() + slot.dur * 60 * 1000);

      const endMinutesTotal = h * 60 + m + slot.dur;
      const endH = Math.floor(endMinutesTotal / 60);
      const endM = endMinutesTotal % 60;
      const endTimeStr = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;

      const patient = seededPatients[slot.patientIdx];
      const clinician = seededUsers[slot.clinician];
      const sType = seededSessionTypes[slot.type];
      const room = seededRooms[slot.roomIdx];
      const bed = seededBeds[slot.bedIdx];

      const existing = await prisma.appointment.findFirst({
        where: {
          patientId: patient.id,
          startsAt,
        },
      });

      if (!existing) {
        await prisma.appointment.create({
          data: {
            patientId: patient.id,
            sessionTypeId: sType.id,
            clinicianId: clinician.id,
            roomId: room.id,
            bedId: bed.id,
            appointmentDate: new Date(`${dateStr}T00:00:00Z`),
            startTime: slot.time,
            endTime: endTimeStr,
            startsAt,
            endsAt,
            durationMinutes: slot.dur,
            pricePiasters: sType.defaultPricePiasters,
            status: slot.status,
            cancellationReason: slot.status === AppointmentStatus.CANCELLED ? "سفر مفاجئ للمريض" : undefined,
            cancelledAt: slot.status === AppointmentStatus.CANCELLED ? new Date() : undefined,
            checkInAt: slot.status === AppointmentStatus.ARRIVED ? new Date() : undefined,
            createdByUserId: seededUsers.RECEPTIONIST.id,
          },
        });
        appointmentsCreated++;
      }
    }
  }
  console.log(`  ✅ One week of appointments seeded (${appointmentsCreated} new appointments)`);

  // 9. Receipt Counter
  await prisma.receiptCounter.upsert({
    where: { year: 2026 },
    update: { lastValue: 2 },
    create: { year: 2026, lastValue: 2 },
  });
  console.log("  ✅ Receipt counter updated to lastValue: 2");

  console.log("🎉 Database seed completed successfully with realistic fake Egyptian data!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
