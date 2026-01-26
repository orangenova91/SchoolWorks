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

    // Only allow teachers/admins to view release status? Allow students to view as well.
    const rel = await prisma.scoreRelease.findFirst({
      where: { evaluationQuestionId: params.evaluationQuestionId, courseId: params.courseId },
    });
    return NextResponse.json({ released: !!rel?.released }, { status: 200 });
  } catch (error) {
    console.error("release status error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string; evaluationQuestionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // Only teacher of the course can publish scores
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

    const body = await request.json().catch(() => ({}));
    const released = body?.released === true;

    const existing = await prisma.scoreRelease.findFirst({
      where: { evaluationQuestionId: params.evaluationQuestionId, courseId: params.courseId },
    });
    let result;
    if (existing) {
      result = await prisma.scoreRelease.update({
        where: { id: existing.id },
        data: { released },
      });
    } else {
      result = await prisma.scoreRelease.create({
        data: {
          evaluationQuestionId: params.evaluationQuestionId,
          courseId: params.courseId,
          released,
        },
      });
    }

    return NextResponse.json({ release: result }, { status: 200 });
  } catch (error) {
    console.error("release toggle error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

