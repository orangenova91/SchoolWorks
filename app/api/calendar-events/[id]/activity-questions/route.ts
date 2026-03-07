import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  questions: z.array(z.object({
    text: z.string().trim().min(1, "질문 내용을 입력하세요").max(500, "질문은 500자 이하여야 합니다"),
  })),
});

export const dynamic = "force-dynamic";

async function checkEventPermission(eventId: string, userId: string) {
  const event = await (prisma as any).calendarEvent.findUnique({
    where: { id: eventId },
  });
  if (!event) return { ok: false, error: "일정을 찾을 수 없습니다.", status: 404 } as const;
  const allowed =
    event.createdBy === userId ||
    (event.scope === "personal" && event.teacherId === userId);
  if (!allowed)
    return { ok: false, error: "이 일정을 수정할 권한이 없습니다.", status: 403 } as const;
  return { ok: true, event } as const;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const eventId = params.id;
    const result = await checkEventPermission(eventId, session.user.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const questions = await (prisma as any).activitySheetQuestion.findMany({
      where: { calendarEventId: eventId },
      orderBy: { order: "asc" },
      select: { id: true, questionText: true, order: true },
    });

    return NextResponse.json({
      questions: questions.map((q: { id: string; questionText: string; order: number }) => ({
        id: q.id,
        text: q.questionText,
        order: q.order,
      })),
    });
  } catch (error) {
    console.error("GET activity-questions error:", error);
    return NextResponse.json(
      { error: "질문 목록을 불러오는 데 실패했습니다." },
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
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json(
        { error: "일정 수정 권한이 없습니다." },
        { status: 403 }
      );
    }

    const eventId = params.id;
    const result = await checkEventPermission(eventId, session.user.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
    const { questions } = patchSchema.parse(body);

    await (prisma as any).activitySheetQuestion.deleteMany({
      where: { calendarEventId: eventId },
    });

    if (questions.length > 0) {
      await (prisma as any).activitySheetQuestion.createMany({
        data: questions.map((q, i) => ({
          calendarEventId: eventId,
          questionText: q.text,
          order: i,
        })),
      });
    }

    const updated = await (prisma as any).activitySheetQuestion.findMany({
      where: { calendarEventId: eventId },
      orderBy: { order: "asc" },
      select: { id: true, questionText: true, order: true },
    });

    return NextResponse.json({
      message: "활동지 질문이 저장되었습니다.",
      questions: updated.map((q: { id: string; questionText: string; order: number }) => ({
        id: q.id,
        text: q.questionText,
        order: q.order,
      })),
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: error.errors?.[0]?.message ?? "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }
    console.error("PATCH activity-questions error:", error);
    return NextResponse.json(
      { error: "활동지 질문 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
