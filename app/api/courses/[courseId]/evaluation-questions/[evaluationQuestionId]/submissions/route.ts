import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type StoredEvaluationQuestionsPayload =
  | unknown[]
  | {
      evaluationContent?: string;
      questions?: unknown;
    };

const parseStoredQuestions = (
  stored: string
): { evaluationContent?: string; questions: any[] } => {
  try {
    const parsed: StoredEvaluationQuestionsPayload = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return { questions: parsed as any[] };
    }
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).questions)) {
      return {
        evaluationContent:
          typeof (parsed as any).evaluationContent === "string"
            ? (parsed as any).evaluationContent
            : undefined,
        questions: (parsed as any).questions,
      };
    }
    return { questions: [] };
  } catch {
    return { questions: [] };
  }
};

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string; evaluationQuestionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    if (session.user?.role !== "student") {
      return NextResponse.json({ error: "학생만 제출할 수 있습니다." }, { status: 403 });
    }

    const body = await request.json();
    const answers = Array.isArray(body?.answers) ? body.answers : [];

    // fetch evaluation question
    const evalQ = await prisma.evaluationQuestion.findFirst({
      where: { id: params.evaluationQuestionId, courseId: params.courseId },
    });
    if (!evalQ) {
      return NextResponse.json({ error: "평가 문항을 찾을 수 없습니다." }, { status: 404 });
    }

    const parsed = parseStoredQuestions(evalQ.questions);
    const questions = parsed.questions;

    let total = 0;
    const submissionAnswers: any[] = [];
    let hasEssay = false;

    for (const a of answers) {
      const idx = Number(a.index);
      const q = questions[idx];
      if (!q) continue;
      if (a.type === "객관식") {
        const correct = typeof q.correctAnswer === "number" ? q.correctAnswer : null;
        const isCorrect = correct !== null && Number(a.answer) === Number(correct);
        if (isCorrect) {
          total += Number(q.points ?? 0);
        }
        submissionAnswers.push({
          index: idx,
          type: "객관식",
          answer: a.answer,
          correctAnswer: correct,
          isCorrect,
          points: q.points ?? 0,
        });
      } else {
        // 서술형
        hasEssay = true;
        submissionAnswers.push({
          index: idx,
          type: "서술형",
          answer: a.answer,
          score: null,
          points: q.points ?? 0,
        });
      }
    }

    const created = await prisma.evaluationSubmission.create({
      data: {
        evaluationQuestionId: params.evaluationQuestionId,
        courseId: params.courseId,
        studentId: session.user.id,
        answers: JSON.stringify(submissionAnswers),
        totalScore: total,
        graded: !hasEssay,
      },
    });

    return NextResponse.json({ submission: created }, { status: 201 });
  } catch (error) {
    console.error("제출 저장 오류:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string; evaluationQuestionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // Only teacher of the course or admin can list submissions
    const course = await prisma.course.findFirst({
      where: { id: params.courseId },
      select: { teacherId: true },
    });
    if (!course) {
      return NextResponse.json({ error: "수업을 찾을 수 없습니다." }, { status: 404 });
    }
    if (session.user.role !== "teacher" || session.user.id !== course.teacherId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const submissions = await prisma.evaluationSubmission.findMany({
      where: { evaluationQuestionId: params.evaluationQuestionId },
      orderBy: { createdAt: "desc" },
    });

    // fetch student info for submissions
    const studentIds = Array.from(new Set(submissions.map((s) => s.studentId)));
    const students = await prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        name: true,
        studentProfile: { select: { studentId: true } },
      },
    });
    const studentMap = new Map(students.map((u) => [u.id, u]));

    const enriched = submissions.map((s) => {
      const user = studentMap.get(s.studentId as string) as
        | { id: string; name?: string | null; studentProfile?: { studentId?: string | null } }
        | undefined;
      return {
        ...s,
        studentName: user?.name ?? null,
        studentNumber: user?.studentProfile?.studentId ?? null,
      };
    });

    return NextResponse.json({ submissions: enriched }, { status: 200 });
  } catch (error) {
    console.error("제출 조회 오류:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

