import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function checkTeacherPermissionForEvent(
  eventId: string,
  userId: string,
  userRole?: string | null,
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

  if (userRole !== "teacher") {
    return {
      ok: false as const,
      status: 403 as const,
      error: "교사 계정으로만 조회할 수 있습니다.",
    };
  }

  // 창의적 체험활동인 경우: 동일 학교의 교사는 모두 허용
  if (event.scheduleArea === "창의적 체험활동") {
    if (event.school && userSchool && event.school === userSchool) {
      return { ok: true as const, event };
    }
    return {
      ok: false as const,
      status: 403 as const,
      error: "이 활동에 대한 조회 권한이 없습니다.",
    };
  }

  // 기타 일정은 생성자/개인일정 소유 교사만 허용 (보수적으로)
  const allowed =
    event.createdBy === userId ||
    (event.scope === "personal" && event.teacherId === userId);
  if (!allowed) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "이 활동에 대한 조회 권한이 없습니다.",
    };
  }

  return { ok: true as const, event };
}

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId")?.trim() || "";
    if (!studentId) {
      return NextResponse.json({ error: "studentId가 필요합니다." }, { status: 400 });
    }

    const eventId = params.id;
    const perm = await checkTeacherPermissionForEvent(
      eventId,
      session.user.id,
      session.user.role,
      session.user.school
    );
    if (!perm.ok) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    const studentCheck = await checkStudentSchool(studentId, session.user.school);
    if (!studentCheck.ok) {
      return NextResponse.json({ error: studentCheck.error }, { status: studentCheck.status });
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
          studentId,
          questionId: { in: questionIds },
        },
        select: { questionId: true, answerText: true },
      });
    }

    const answerMap: Record<string, string> = {};
    for (const a of answers) {
      answerMap[a.questionId] = a.answerText;
    }
    const hasAnswers = Object.values(answerMap).some((t) => String(t || "").trim().length > 0);

    let materials: any[] = [];
    if ((perm.event as any).activityAttachments) {
      try {
        const parsed =
          typeof (perm.event as any).activityAttachments === "string"
            ? JSON.parse((perm.event as any).activityAttachments)
            : (perm.event as any).activityAttachments;
        if (Array.isArray(parsed)) {
          materials = parsed;
        }
      } catch {
        materials = [];
      }
    }

    return NextResponse.json({
      activityContent: (perm.event as any).activityContent ?? "",
      questions: questions.map((q: any) => ({ id: q.id, text: q.questionText })),
      answers: questions.map((q: any) => ({
        questionId: q.id,
        text: answerMap[q.id] ?? "",
      })),
      materials,
      hasAnswers,
    });
  } catch (error) {
    console.error("GET teacher activity-answers error:", error);
    return NextResponse.json(
      { error: "활동 응답을 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

