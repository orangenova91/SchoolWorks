import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  studentId: z.string().min(1),
  eventIds: z.array(z.string().min(1)).max(500),
});

async function checkStudentSchool(studentId: string, teacherSchool?: string | null) {
  const student = await (prisma as any).user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      role: true,
      school: true,
      studentProfile: { select: { school: true } },
    },
  });

  if (!student || student.role !== "student") {
    return {
      ok: false as const,
      status: 404 as const,
      error: "학생 정보를 찾을 수 없습니다.",
    };
  }

  const studentSchool = student.school || student.studentProfile?.school;
  if (teacherSchool && studentSchool && teacherSchool !== studentSchool) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "다른 학교 학생의 응답은 조회할 수 없습니다.",
    };
  }

  return { ok: true as const };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "교사 계정으로만 조회할 수 있습니다." }, { status: 403 });
    }

    const body = bodySchema.parse(await request.json());
    const { studentId, eventIds } = body;

    const studentCheck = await checkStudentSchool(studentId, session.user.school);
    if (!studentCheck.ok) {
      return NextResponse.json({ error: studentCheck.error }, { status: studentCheck.status });
    }

    if (eventIds.length === 0) {
      return NextResponse.json({ statusByEventId: {} });
    }

    const answers = await (prisma as any).activitySheetAnswer.findMany({
      where: {
        studentId,
        calendarEventId: { in: eventIds },
      },
      select: {
        calendarEventId: true,
        answerText: true,
      },
    });

    const statusByEventId: Record<string, boolean> = {};
    for (const id of eventIds) statusByEventId[id] = false;
    for (const a of answers) {
      if (String(a.answerText || "").trim().length > 0) {
        statusByEventId[a.calendarEventId] = true;
      }
    }

    return NextResponse.json({ statusByEventId });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
    }
    console.error("POST teacher activity-answers status error:", error);
    return NextResponse.json(
      { error: "제출 상태를 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

