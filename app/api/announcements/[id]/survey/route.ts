import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

const answerSchema = z.object({
  id: z.string(),
  answer: z.any().nullable(),
});

const submissionSchema = z.object({
  answers: z.array(answerSchema),
  signatureImage: z.string().optional(), // data URL (base64) - optional simultaneous signature
});

const parseSignatureDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (match) {
    return {
      contentType: match[1],
      base64: match[2],
    };
  }
  return {
    contentType: "image/png",
    base64: dataUrl,
  };
};

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const announcement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
      select: { id: true, category: true, surveyData: true },
    });
    if (!announcement) {
      return NextResponse.json({ error: "안내문을 찾을 수 없습니다." }, { status: 404 });
    }
    if (announcement.category !== "survey") {
      return NextResponse.json({ error: "설문이 아닙니다." }, { status: 400 });
    }

    const existing = await (prisma as any).announcementSurveyResponse.findUnique({
      where: {
        announcementId_userId: {
          announcementId: params.id,
          userId: session.user.id,
        },
      },
    });

    return NextResponse.json({
      surveyData: announcement.surveyData || null,
      response: existing
        ? {
            id: existing.id,
            answers: existing.answers ? JSON.parse(existing.answers) : [],
            createdAt: existing.createdAt?.toISOString?.() || null,
            updatedAt: existing.updatedAt?.toISOString?.() || null,
          }
        : null,
    });
  } catch (error) {
    console.error("Get survey error:", error);
    return NextResponse.json({ error: "설문 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const announcement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
      select: { id: true, category: true, surveyStartDate: true, surveyEndDate: true, consentData: true, school: true },
    });
    if (!announcement) {
      return NextResponse.json({ error: "안내문을 찾을 수 없습니다." }, { status: 404 });
    }
    if (announcement.category !== "survey") {
      return NextResponse.json({ error: "설문이 아닙니다." }, { status: 400 });
    }

    // Optional: enforce survey period
    const now = new Date();
    if (announcement.surveyStartDate && new Date(announcement.surveyStartDate) > now) {
      return NextResponse.json({ error: "설문이 아직 시작되지 않았습니다." }, { status: 400 });
    }
    if (announcement.surveyEndDate && new Date(announcement.surveyEndDate) < now) {
      return NextResponse.json({ error: "설문이 종료되었습니다." }, { status: 400 });
    }

    const body = await request.json();
    const parsed = submissionSchema.parse(body);

    const answersJson = JSON.stringify(parsed.answers);
    // If this survey requires signature, enforce presence of signature:
    let consentMeta = null;
    try {
      consentMeta = announcement.consentData ? (typeof announcement.consentData === "string" ? JSON.parse(announcement.consentData) : announcement.consentData) : null;
    } catch {
      consentMeta = null;
    }
    const requiresSignature =
      announcement.category === "consent" ||
      (announcement.category === "survey" && consentMeta?.requiresSignature);

    // check existing consent
    const existingConsent = await (prisma as any).announcementConsent.findUnique({
      where: {
        announcementId_userId: {
          announcementId: params.id,
          userId: session.user.id,
        },
      },
    });

    if (requiresSignature && !existingConsent?.submittedAt && !parsed.signatureImage) {
      return NextResponse.json({ error: "설문 제출을 위해 서명이 필요합니다." }, { status: 400 });
    }

    // If signatureImage is provided, save it (only for student/parent roles)
    if (parsed.signatureImage) {
      if (!["parent", "student"].includes(session.user.role || "")) {
        return NextResponse.json({ error: "서명 권한이 없습니다." }, { status: 403 });
      }

      const { contentType, base64 } = parseSignatureDataUrl(parsed.signatureImage);
      const buffer = Buffer.from(base64, "base64");
      const extension = contentType.split("/")[1] || "png";
      const filename = `consents/${params.id}/${session.user.id}-${Date.now()}.${extension}`;

      const blob = await put(filename, buffer, {
        access: "public",
        contentType,
      });

      const signedAt = new Date();
      const submittedAt = new Date();

      await (prisma as any).announcementConsent.upsert({
        where: {
          announcementId_userId: {
            announcementId: params.id,
            userId: session.user.id,
          },
        },
        update: {
          signatureImage: null,
          signatureUrl: blob.url,
          signedAt,
          submittedAt,
          returnedAt: null,
          returnReason: null,
        },
        create: {
          announcementId: params.id,
          userId: session.user.id,
          signatureImage: null,
          signatureUrl: blob.url,
          signedAt,
          submittedAt,
          returnedAt: null,
          returnReason: null,
        },
      });
    }

    // Prevent resubmission: if a response already exists, reject with 409
    const existingResponse = await (prisma as any).announcementSurveyResponse.findUnique({
      where: {
        announcementId_userId: {
          announcementId: params.id,
          userId: session.user.id,
        },
      } as any,
    });

    if (existingResponse) {
      return NextResponse.json({ error: "이미 제출된 설문입니다." }, { status: 409 });
    }

    const resp = await (prisma as any).announcementSurveyResponse.create({
      data: {
        announcementId: params.id,
        userId: session.user.id,
        answers: answersJson,
      },
    });

    return NextResponse.json({
      message: "설문 응답이 저장되었습니다.",
      response: {
        id: resp.id,
        answers: parsed.answers,
      },
    }, { status: 201 });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json({ error: "입력값이 올바르지 않습니다.", details: error.errors }, { status: 400 });
    }
    console.error("Submit survey error:", error);
    return NextResponse.json({ error: "설문 제출 중 오류가 발생했습니다." }, { status: 500 });
  }
}

