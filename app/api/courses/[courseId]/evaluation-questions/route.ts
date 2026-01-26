import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluationQuestionPayloadSchema } from "./validation";

type StoredEvaluationQuestionsPayload =
  | unknown[]
  | {
      evaluationContent?: string;
      questions?: unknown;
    };

const parseStoredQuestions = (
  stored: string
): { evaluationContent?: string; questions: unknown[] } => {
  try {
    const parsed: StoredEvaluationQuestionsPayload = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return { questions: parsed };
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
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "평가 문항 생성 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 수업 소유권 확인
    const course = await prisma.course.findFirst({
      where: {
        id: params.courseId,
        teacherId: session.user.id,
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "수업을 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = evaluationQuestionPayloadSchema.parse(body);

    // 문항들을 JSON 문자열로 변환 (하위호환: 기존에는 배열만 저장)
    const questionsJson = JSON.stringify({
      evaluationContent: validatedData.evaluationContent,
      questions: validatedData.questions,
    });
    console.log("평가 문항 생성 요청:", {
      courseId: params.courseId,
      teacherId: session.user.id,
      unit: validatedData.unit,
      questionNumber: validatedData.questionNumber,
      questionsCount: validatedData.questions.length,
    });

    // 평가 문항 생성
    const evaluationQuestion = await prisma.evaluationQuestion.create({
      data: {
        unit: validatedData.unit,
        questionNumber: validatedData.questionNumber,
        questions: questionsJson,
        courseId: params.courseId,
        teacherId: session.user.id,
      },
    });

    console.log("평가 문항 생성 성공:", evaluationQuestion.id);

    return NextResponse.json(
      {
        message: "평가 문항이 생성되었습니다.",
        evaluationQuestion: {
          ...evaluationQuestion,
          evaluationContent: validatedData.evaluationContent,
          questions: validatedData.questions,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("평가 문항 생성 오류:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "입력 데이터가 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "평가 문항 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const role = session.user?.role;

    if (role === "teacher") {
      // 수업 소유권 확인
      const course = await prisma.course.findFirst({
        where: {
          id: params.courseId,
          teacherId: session.user.id,
        },
      });

      if (!course) {
        return NextResponse.json(
          { error: "수업을 찾을 수 없거나 권한이 없습니다." },
          { status: 404 }
        );
      }
    } else if (role === "student") {
      // 학생은 자신이 배정된 수업만 조회 가능
      const studentId = session.user.id;
      const isEnrolled = await (prisma as unknown as {
        classGroup: {
          findFirst: (args: {
            where: { courseId: string; studentIds: { has: string } };
            select: { id: true };
          }) => Promise<{ id: string } | null>;
        };
      }).classGroup.findFirst({
        where: { courseId: params.courseId, studentIds: { has: studentId } },
        select: { id: true },
      });

      if (!isEnrolled) {
        return NextResponse.json(
          { error: "수업을 찾을 수 없거나 권한이 없습니다." },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "평가 문항 조회 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 평가 문항 목록 조회
    const evaluationQuestions = await prisma.evaluationQuestion.findMany({
      where: { courseId: params.courseId },
      orderBy: { createdAt: "desc" },
    });

    console.log(`평가 문항 조회: courseId=${params.courseId}, 개수=${evaluationQuestions.length}`);

    // JSON 문자열을 파싱하여 반환 (하위호환: 배열/객체 둘 다 허용)
    const parsedQuestions = evaluationQuestions.map((eq) => {
      const parsed = parseStoredQuestions(eq.questions);
      return {
        ...eq,
        evaluationContent: parsed.evaluationContent,
        questions: parsed.questions,
      };
    });

    // 학생에게는 정답/모범답안 노출 방지
    const safeQuestions =
      role === "student"
        ? parsedQuestions.map((eq) => ({
            ...eq,
            questions: Array.isArray(eq.questions)
              ? eq.questions.map((question: any) => {
                  if (!question || typeof question !== "object") {
                    return question;
                  }
                  const { correctAnswer, modelAnswer, ...rest } = question;
                  return rest;
                })
              : [],
          }))
        : parsedQuestions;

    return NextResponse.json({ evaluationQuestions: safeQuestions }, { status: 200 });
  } catch (error) {
    console.error("평가 문항 조회 오류:", error);
    
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("오류 상세:", errorMessage);

    return NextResponse.json(
      { error: "평가 문항 조회 중 오류가 발생했습니다.", details: errorMessage },
      { status: 500 }
    );
  }
}

