import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const answerSchema = z.object({
  id: z.string(),
  answer: z.any().nullable(),
});

const submissionSchema = z.object({
  answers: z.array(answerSchema),
});

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
      select: { id: true, category: true, surveyStartDate: true, surveyEndDate: true },
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

    const resp = await (prisma as any).announcementSurveyResponse.upsert({
      where: {
        announcementId_userId: {
          announcementId: params.id,
          userId: session.user.id,
        },
      } as any,
      update: {
        answers: answersJson,
      },
      create: {
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

