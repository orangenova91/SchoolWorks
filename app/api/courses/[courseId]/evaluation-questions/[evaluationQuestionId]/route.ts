import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluationQuestionPayloadSchema } from "../validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string; evaluationQuestionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "평가 문항 수정 권한이 없습니다." },
        { status: 403 }
      );
    }

    const existingEvaluationQuestion = await prisma.evaluationQuestion.findFirst({
      where: {
        id: params.evaluationQuestionId,
        courseId: params.courseId,
        teacherId: session.user.id,
      },
    });

    if (!existingEvaluationQuestion) {
      return NextResponse.json(
        { error: "평가 문항을 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = evaluationQuestionPayloadSchema.parse(body);

    const updatedEvaluationQuestion = await prisma.evaluationQuestion.update({
      where: { id: params.evaluationQuestionId },
      data: {
        unit: validatedData.unit,
        questionNumber: validatedData.questionNumber,
        questions: JSON.stringify({
          evaluationContent: validatedData.evaluationContent,
          questions: validatedData.questions,
        }),
      },
    });

    return NextResponse.json(
      {
        message: "평가 문항이 수정되었습니다.",
        evaluationQuestion: {
          ...updatedEvaluationQuestion,
          evaluationContent: validatedData.evaluationContent,
          questions: validatedData.questions,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("평가 문항 수정 오류:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "입력 데이터가 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "평가 문항 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; evaluationQuestionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "평가 문항 삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    const existingEvaluationQuestion = await prisma.evaluationQuestion.findFirst({
      where: {
        id: params.evaluationQuestionId,
        courseId: params.courseId,
        teacherId: session.user.id,
      },
    });

    if (!existingEvaluationQuestion) {
      return NextResponse.json(
        { error: "평가 문항을 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    await prisma.evaluationQuestion.delete({
      where: { id: params.evaluationQuestionId },
    });

    return NextResponse.json(
      { message: "평가 문항이 삭제되었습니다." },
      { status: 200 }
    );
  } catch (error) {
    console.error("평가 문항 삭제 오류:", error);
    return NextResponse.json(
      { error: "평가 문항 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}


