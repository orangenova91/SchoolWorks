import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string; evaluationQuestionId: string; submissionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // Only teacher of the course can grade
    const course = await prisma.course.findFirst({
      where: { id: params.courseId },
      select: { teacherId: true },
    });
    if (!course || session.user.role !== "teacher" || session.user.id !== course.teacherId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const scores = Array.isArray(body?.scores) ? body.scores : [];

    const existing = await prisma.evaluationSubmission.findFirst({
      where: { id: params.submissionId, evaluationQuestionId: params.evaluationQuestionId },
    });
    if (!existing) {
      return NextResponse.json({ error: "제출을 찾을 수 없습니다." }, { status: 404 });
    }

    let answers = [];
    try {
      answers = JSON.parse(existing.answers);
    } catch {
      answers = [];
    }

    let total = existing.totalScore ?? 0;

    for (const s of scores) {
      const idx = Number(s.index);
      const score = Number(s.score);
      const ansEntry = answers.find((a: any) => a.index === idx);
      if (ansEntry && ansEntry.type === "서술형") {
        ansEntry.score = score;
      }
    }

    // recompute total: sum of 객관식 is already in existing.totalScore, add essay scores
    const essaySum = (answers as any[]).reduce((acc, a) => acc + (a.score ? Number(a.score) : 0), 0);
    const objSum = (answers as any[]).reduce((acc, a) => acc + ((a.type === "객관식" && a.isCorrect) ? Number(a.points || 0) : 0), 0);
    total = objSum + essaySum;

    const updated = await prisma.evaluationSubmission.update({
      where: { id: params.submissionId },
      data: {
        answers: JSON.stringify(answers),
        totalScore: total,
        graded: true,
      },
    });

    return NextResponse.json({ submission: updated }, { status: 200 });
  } catch (error) {
    console.error("채점 오류:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

