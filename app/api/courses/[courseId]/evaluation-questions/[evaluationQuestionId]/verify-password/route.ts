import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string; evaluationQuestionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const role = session.user?.role;

    // 학생인 경우, 해당 수업에 배정된 학생인지 확인
    if (role === "student") {
      const studentId = session.user.id;
      const isEnrolled = await (prisma as any).classGroup.findFirst({
        where: { courseId: params.courseId, studentIds: { has: studentId } },
        select: { id: true },
      });
      if (!isEnrolled) {
        return NextResponse.json(
          { error: "수업을 찾을 수 없거나 권한이 없습니다." },
          { status: 404 }
        );
      }
    } else if (role === "teacher") {
      // 교사면 수업 소유권 확인 (선택적)
      const course = await prisma.course.findFirst({
        where: { id: params.courseId, teacherId: session.user.id },
      });
      if (!course) {
        return NextResponse.json(
          { error: "수업을 찾을 수 없거나 권한이 없습니다." },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const password = typeof body?.password === "string" ? body.password : "";

    const evalQ = await prisma.evaluationQuestion.findFirst({
      where: { id: params.evaluationQuestionId, courseId: params.courseId },
      select: { questionNumber: true },
    });

    if (!evalQ) {
      return NextResponse.json({ error: "평가 문항을 찾을 수 없습니다." }, { status: 404 });
    }

    const correct = String(evalQ.questionNumber ?? "");
    if (password === correct) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
  } catch (error) {
    console.error("비밀번호 검증 오류:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

