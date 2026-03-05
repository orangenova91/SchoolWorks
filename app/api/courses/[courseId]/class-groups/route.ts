import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createClassGroupSchema = z.object({
  name: z.string().trim().min(1, "학반명을 입력하세요"),
  period: z.string().nullable(),
  schedules: z.array(
    z.object({
      day: z.string(),
      period: z.string(),
    })
  ),
  studentIds: z.array(z.string()),
});

export const dynamic = 'force-dynamic';

// 학반 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "학반 조회 권한이 없습니다." },
        { status: 403 }
      );
    }

    const course = await prisma.course.findFirst({
      where: { id: params.courseId },
      select: { teacherId: true, courseType: true },
    });

    if (!course) {
      return NextResponse.json(
        { error: "수업을 찾을 수 없거나 조회 권한이 없습니다." },
        { status: 404 }
      );
    }

    const isTeacherOwner = session.user.id === course.teacherId;
    const isAfterSchoolManager =
      course.courseType === "after_school" &&
      !!(await (prisma as any).afterSchoolManager.findFirst({
        where: { teacherId: session.user.id },
      }));

    if (!isTeacherOwner && !isAfterSchoolManager) {
      return NextResponse.json(
        { error: "학반 조회 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 학반 목록 조회
    const classGroups = await prisma.classGroup.findMany({
      where: {
        courseId: params.courseId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // schedules를 파싱하여 반환
    const formattedGroups = classGroups.map((group) => ({
      ...group,
      schedules: JSON.parse(group.schedules || "[]"),
    }));

    return NextResponse.json(
      { classGroups: formattedGroups },
      { status: 200 }
    );
  } catch (error) {
    console.error("학반 조회 오류:", error);
    return NextResponse.json(
      { error: "학반 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 학반 생성
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "학반 생성 권한이 없습니다." },
        { status: 403 }
      );
    }

    const course = await prisma.course.findFirst({
      where: { id: params.courseId },
      select: { teacherId: true, courseType: true },
    });

    if (!course) {
      return NextResponse.json(
        { error: "수업을 찾을 수 없거나 생성 권한이 없습니다." },
        { status: 404 }
      );
    }

    const isTeacherOwner = session.user.id === course.teacherId;
    const isAfterSchoolManager =
      course.courseType === "after_school" &&
      !!(await (prisma as any).afterSchoolManager.findFirst({
        where: { teacherId: session.user.id },
      }));

    if (!isTeacherOwner && !isAfterSchoolManager) {
      return NextResponse.json(
        { error: "학반 생성 권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createClassGroupSchema.parse(body);

    console.log("학반 생성 요청:", {
      courseId: params.courseId,
      teacherId: course.teacherId,
      name: validatedData.name,
      period: validatedData.period,
      schedulesCount: validatedData.schedules.length,
      studentIdsCount: validatedData.studentIds.length,
    });

    // 학반 생성
    const classGroup = await prisma.classGroup.create({
      data: {
        name: validatedData.name,
        period: validatedData.period,
        schedules: JSON.stringify(validatedData.schedules),
        courseId: params.courseId,
        studentIds: validatedData.studentIds,
        teacherId: course.teacherId!,
      },
    });

    console.log("학반 생성 성공:", classGroup.id);

    return NextResponse.json(
      {
        message: "학반이 성공적으로 생성되었습니다.",
        classGroup: {
          ...classGroup,
          schedules: JSON.parse(classGroup.schedules || "[]"),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("학반 생성 오류:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "입력 데이터가 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "학반 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

