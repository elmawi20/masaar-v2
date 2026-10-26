import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/currentUser";
import { prisma } from "@/server/db";

/**
 * Masaar Clinic System — Secure Patient Documents Route
 * Spec Reference: docs/FEATURES-v2.2.md §9.5 (R-9.5-1)
 *
 * Rules:
 * - Opened only through a logged-in, permission-checked route.
 * - Receptionist and Manager can view ONLY "ID / administrative" and "Payment proof".
 * - Medical files are strictly blocked from Receptionist and Manager.
 * - Non-assigned clinicians require covering access to view medical documents.
 * - Every view is logged in DocumentViewLog.
 * - Medical views receive a watermark identifier (viewer name + time).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;
  const user = await getCurrentUser();

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doc = await prisma.patientDocument.findUnique({
    where: { id: documentId },
    include: {
      patient: {
        select: {
          id: true,
          fullName: true,
          assignedPhysiotherapistId: true,
          assignedNutritionistId: true,
        },
      },
    },
  });

  if (!doc || !doc.isActive) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // 1. Role-based Medical Record Segregation (R-9.5-1)
  if (doc.isMedical) {
    // Receptionist & Manager are strictly prohibited from viewing medical files
    if (user.role === "RECEPTIONIST" || user.role === "MANAGER") {
      return NextResponse.json(
        { error: "Forbidden: Medical documents restricted from front desk and operations" },
        { status: 403 }
      );
    }

    // Clinicians: must be Owner, or assigned, or have active covering access
    if (user.role === "PHYSIOTHERAPIST" || user.role === "NUTRITIONIST") {
      const isAssigned =
        doc.patient.assignedPhysiotherapistId === user.id ||
        doc.patient.assignedNutritionistId === user.id;

      if (!isAssigned) {
        const covering = await prisma.coveringAccessLog.findFirst({
          where: {
            patientId: doc.patientId,
            clinicianId: user.id,
            expiresAt: { gt: new Date() },
          },
        });

        if (!covering) {
          return NextResponse.json(
            { error: "Forbidden: Covering access required to view non-assigned patient medical files" },
            { status: 403 }
          );
        }
      }
    }
  }

  // 2. Audit Document View (R-9.5-1, R-13-1)
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || null;

  await prisma.documentViewLog.create({
    data: {
      documentId: doc.id,
      viewedByUserId: user.id,
      watermarkApplied: true,
      ipAddress: clientIp,
      userAgent,
    },
  });

  // 3. Serve watermarked document metadata
  return NextResponse.json({
    id: doc.id,
    title: doc.title,
    fileName: doc.fileName,
    category: doc.category,
    isMedical: doc.isMedical,
    mimeType: doc.mimeType,
    fileSizeBytes: doc.fileSizeBytes,
    watermark: `${user.fullName || user.email} · ${new Date().toISOString()}`,
    viewLogged: true,
  });
}
