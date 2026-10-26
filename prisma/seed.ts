import "dotenv/config";
import { PrismaClient, Role, Gender, ReferralSource, PaymentMethod, SessionCategory } from "@prisma/client";
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
  console.log("\n=======================================================");
  console.log("👑 [SEED] Initial Owner Account Credentials (First Login):");
  console.log("   Email:    owner@masaar.local");
  console.log("   Password: Password123!");
  console.log("   (Change password and TOTP enrollment available on login)");
  console.log("=======================================================\n");

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

  // 6. Patients (Adults & Dependent child)
  let patient1 = await prisma.patient.findFirst({ where: { mobilePhone: "01001112233" } });
  if (!patient1) {
    patient1 = await prisma.patient.create({
      data: {
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
      },
    });
  }

  let patient2 = await prisma.patient.findFirst({ where: { mobilePhone: "01112223344" } });
  if (!patient2) {
    patient2 = await prisma.patient.create({
      data: {
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
      },
    });
  }

  let patient3 = await prisma.patient.findFirst({ where: { fullName: "علي حسن الشربيني" } });
  if (!patient3) {
    patient3 = await prisma.patient.create({
      data: {
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
      },
    });
  }
  console.log("  ✅ Egyptian fake patients seeded (adults and child dependent)");

  // 7. Package and Payment for Patient 1
  let pkg = await prisma.package.findFirst({ where: { patientId: patient1.id } });
  if (!pkg) {
    const today = new Date();
    const expiry = new Date(today);
    expiry.setDate(today.getDate() + 60);

    pkg = await prisma.package.create({
      data: {
        patientId: patient1.id,
        sessionTypeId: seededSessionTypes.PT_STANDARD.id,
        totalSessions: 12,
        totalPricePiasters: 360000, // 3,600 EGP (discounted 12-session pack)
        startDate: today,
        expiryDate: expiry,
        notes: "باقة علاج طبيعي وتأهيل عمود فقري 12 جلسة",
        createdByUserId: seededUsers.RECEPTIONIST.id,
      },
    });

    // Create Charge for Package
    const charge = await prisma.charge.create({
      data: {
        patientId: patient1.id,
        packageId: pkg.id,
        amountPiasters: 360000,
        description: "شراء باقة علاج طبيعي 12 جلسة",
        createdByUserId: seededUsers.RECEPTIONIST.id,
      },
    });

    // Create Payment if not already existing
    const existingPayment1 = await prisma.payment.findFirst({
      where: { receiptNumber: "INV-2026-00001" },
    });
    if (!existingPayment1) {
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
    }
    console.log("  ✅ Package, Charge, and Payment (INV-2026-00001) seeded for Patient 1");
  }

  // 8. Appointments
  const todayDate = new Date();
  const year = todayDate.getFullYear();
  const month = String(todayDate.getMonth() + 1).padStart(2, "0");
  const day = String(todayDate.getDate()).padStart(2, "0");

  const todayStr = `${year}-${month}-${day}`;
  const startsAt1 = new Date(`${todayStr}T10:00:00Z`);
  const endsAt1 = new Date(`${todayStr}T10:45:00Z`);

  const existingAppt1 = await prisma.appointment.findFirst({
    where: { patientId: patient1.id, startsAt: startsAt1 },
  });

  if (!existingAppt1) {
    await prisma.appointment.create({
      data: {
        patientId: patient1.id,
        sessionTypeId: seededSessionTypes.PT_STANDARD.id,
        clinicianId: seededUsers.PHYSIOTHERAPIST.id,
        roomId: seededRooms[0].id,
        bedId: seededBeds[0].id,
        packageId: pkg.id,
        appointmentDate: new Date(`${todayStr}T00:00:00Z`),
        startTime: "12:00",
        endTime: "12:45",
        startsAt: startsAt1,
        endsAt: endsAt1,
        durationMinutes: 45,
        status: "SCHEDULED",
        createdByUserId: seededUsers.RECEPTIONIST.id,
      },
    });
  }

  // Appointment 2: Patient 2 with Nutritionist
  const startsAt2 = new Date(`${todayStr}T11:00:00Z`);
  const endsAt2 = new Date(`${todayStr}T11:30:00Z`);

  const existingAppt2 = await prisma.appointment.findFirst({
    where: { patientId: patient2.id, startsAt: startsAt2 },
  });

  if (!existingAppt2) {
    const appt2 = await prisma.appointment.create({
      data: {
        patientId: patient2.id,
        sessionTypeId: seededSessionTypes.NUTRITION_CONSULT.id,
        clinicianId: seededUsers.NUTRITIONIST.id,
        roomId: seededRooms[2].id,
        bedId: seededBeds[seededBeds.length - 1].id,
        appointmentDate: new Date(`${todayStr}T00:00:00Z`),
        startTime: "13:00",
        endTime: "13:30",
        startsAt: startsAt2,
        endsAt: endsAt2,
        durationMinutes: 30,
        pricePiasters: 30000,
        status: "SCHEDULED",
        createdByUserId: seededUsers.RECEPTIONIST.id,
      },
    });

    // Single-session charge and payment
    const charge2 = await prisma.charge.create({
      data: {
        patientId: patient2.id,
        appointmentId: appt2.id,
        amountPiasters: 30000,
        description: "استشارة تغذية علاجية فردية",
        createdByUserId: seededUsers.RECEPTIONIST.id,
      },
    });

    const existingPayment2 = await prisma.payment.findFirst({
      where: { receiptNumber: "INV-2026-00002" },
    });
    if (!existingPayment2) {
      await prisma.payment.create({
        data: {
          chargeId: charge2.id,
          receiptNumber: "INV-2026-00002",
          receiptYear: 2026,
          receiptSequence: 2,
          amountPiasters: 30000,
          paymentMethod: PaymentMethod.INSTAPAY,
          collectedByUserId: seededUsers.RECEPTIONIST.id,
        },
      });
    }
    console.log("  ✅ Appointments and payment (INV-2026-00002) seeded");
  }

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
