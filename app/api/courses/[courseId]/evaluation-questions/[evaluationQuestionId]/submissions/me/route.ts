import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string; evaluationQuestionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    if (session.user?.role !== "student") {
      return NextResponse.json({ error: "학생만 조회할 수 있습니다." }, { status: 403 });
    }

    const submission = await prisma.evaluationSubmission.findFirst({
      where: { evaluationQuestionId: params.evaluationQuestionId, studentId: session.user.id },
    });

    if (!submission) {
      return NextResponse.json({ submitted: false }, { status: 404 });
    }

    return NextResponse.json({ submitted: true, submission }, { status: 200 });
  } catch (error) {
    console.error("제출 조회 오류:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

