import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const returnSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "반환 권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const validated = returnSchema.parse(body);

    const announcement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true, school: true },
    });

    if (!announcement) {
      return NextResponse.json({ error: "안내문을 찾을 수 없습니다." }, { status: 404 });
    }

    if (announcement.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "작성한 교사만 반환할 수 있습니다." },
        { status: 403 }
      );
    }

    if (session.user.school && announcement.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const existingConsent = await (prisma as any).announcementConsent.findUnique({
      where: {
        announcementId_userId: {
          announcementId: params.id,
          userId: validated.userId,
        },
      },
    });

    if (!existingConsent?.submittedAt) {
      return NextResponse.json(
        { error: "제출된 동의서만 반환할 수 있습니다." },
        { status: 400 }
      );
    }

    const returnedAt = new Date();
    const returnReason = validated.reason?.trim() || null;

    const consent = await (prisma as any).announcementConsent.update({
      where: { id: existingConsent.id },
      data: {
        returnedAt,
        returnReason,
      },
    });

    return NextResponse.json({
      message: "동의서가 반환되었습니다.",
      consent: {
        signatureImage: consent.signatureImage,
        signatureUrl: consent.signatureUrl || null,
        signedAt: consent.signedAt?.toISOString?.() || null,
        submittedAt: consent.submittedAt?.toISOString?.() || null,
        returnedAt: consent.returnedAt?.toISOString?.() || null,
        returnReason: consent.returnReason || null,
      },
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Return consent error:", error);
    return NextResponse.json(
      { error: "동의서 반환 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
