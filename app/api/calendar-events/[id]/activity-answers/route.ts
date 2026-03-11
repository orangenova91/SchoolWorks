import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1, "질문 ID가 필요합니다."),
      text: z
        .string()
        .trim()
        .max(500, "답변은 500자 이하여야 합니다."),
    })
  ),
});

async function getEventForStudent(
  eventId: string,
  userSchool?: string | null
) {
  const event = await (prisma as any).calendarEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return {
      ok: false as const,
      status: 404 as const,
      error: "일정을 찾을 수 없습니다.",
    };
  }

  // 창의적 체험활동이면서 같은 학교인 경우에만 허용
  if (
    event.scheduleArea === "창의적 체험활동" &&
    event.school &&
    userSchool &&
    event.school === userSchool
  ) {
    return { ok: true as const, event };
  }

  return {
    ok: false as const,
    status: 403 as const,
    error: "이 활동에 대한 응답 권한이 없습니다.",
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "student") {
      return NextResponse.json(
        { error: "학생 계정으로만 응답을 조회할 수 있습니다." },
        { status: 403 }
      );
    }

    const eventId = params.id;
    const eventResult = await getEventForStudent(eventId, session.user.school);

    if (!eventResult.ok) {
      return NextResponse.json(
        { error: eventResult.error },
        { status: eventResult.status }
      );
    }

    const questions = await (prisma as any).activitySheetQuestion.findMany({
      where: { calendarEventId: eventId },
      orderBy: { order: "asc" },
      select: { id: true, questionText: true, order: true },
    });

    const questionIds = questions.map((q: any) => q.id);

    let answers: any[] = [];
    if (questionIds.length > 0) {
      answers = await (prisma as any).activitySheetAnswer.findMany({
        where: {
          calendarEventId: eventId,
          studentId: session.user.id,
          questionId: { in: questionIds },
        },
        select: {
          questionId: true,
          answerText: true,
        },
      });
    }

    const answerMap: Record<string, string> = {};
    for (const a of answers) {
      answerMap[a.questionId] = a.answerText;
    }

    let materials: any[] = [];
    if ((eventResult.event as any).activityAttachments) {
      try {
        const parsed =
          typeof (eventResult.event as any).activityAttachments === "string"
            ? JSON.parse((eventResult.event as any).activityAttachments)
            : (eventResult.event as any).activityAttachments;
        if (Array.isArray(parsed)) {
          materials = parsed;
        }
      } catch {
        materials = [];
      }
    }

    return NextResponse.json({
      activityContent: (eventResult.event as any).activityContent ?? "",
      questions: questions.map((q: any) => ({
        id: q.id,
        text: q.questionText,
      })),
      answers: questions.map((q: any) => ({
        questionId: q.id,
        text: answerMap[q.id] ?? "",
      })),
      materials,
    });
  } catch (error) {
    console.error("GET activity-answers error:", error);
    return NextResponse.json(
      { error: "활동 응답을 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "student") {
      return NextResponse.json(
        { error: "학생 계정으로만 응답을 저장할 수 있습니다." },
        { status: 403 }
      );
    }

    const eventId = params.id;
    const eventResult = await getEventForStudent(eventId, session.user.school);

    if (!eventResult.ok) {
      return NextResponse.json(
        { error: eventResult.error },
        { status: eventResult.status }
      );
    }

    const body = await request.json();
    const { answers } = patchSchema.parse(body);

    // 기존 답변 삭제 후 다시 저장 (질문 수가 많지 않으므로 단순화)
    await (prisma as any).activitySheetAnswer.deleteMany({
      where: {
        calendarEventId: eventId,
        studentId: session.user.id,
      },
    });

    if (answers.length > 0) {
      await (prisma as any).activitySheetAnswer.createMany({
        data: answers.map((a) => ({
          calendarEventId: eventId,
          questionId: a.questionId,
          studentId: session.user.id,
          answerText: a.text.trim(),
        })),
      });
    }

    const updatedAnswers = await (prisma as any).activitySheetAnswer.findMany({
      where: {
        calendarEventId: eventId,
        studentId: session.user.id,
      },
      select: {
        questionId: true,
        answerText: true,
      },
      orderBy: { questionId: "asc" },
    });

    return NextResponse.json({
      message: "활동 응답이 저장되었습니다.",
      answers: updatedAnswers.map((a: any) => ({
        questionId: a.questionId,
        text: a.answerText,
      })),
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        {
          error:
            error.errors?.[0]?.message ?? "입력값이 올바르지 않습니다.",
        },
        { status: 400 }
      );
    }

    console.error("PATCH activity-answers error:", error);
    return NextResponse.json(
      { error: "활동 응답 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}

