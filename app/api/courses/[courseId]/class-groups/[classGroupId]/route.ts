import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateClassGroupSchema = z.object({
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

// 학반 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string; classGroupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "학반 수정 권한이 없습니다." },
        { status: 403 }
      );
    }

    const course = await prisma.course.findFirst({
      where: { id: params.courseId },
      select: { teacherId: true, courseType: true },
    });

    if (!course) {
      return NextResponse.json(
        { error: "수업을 찾을 수 없거나 수정 권한이 없습니다." },
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
        { error: "학반 수정 권한이 없습니다." },
        { status: 403 }
      );
    }

    const existingClassGroup = await prisma.classGroup.findFirst({
      where: {
        id: params.classGroupId,
        courseId: params.courseId,
      },
    });

    if (!existingClassGroup) {
      return NextResponse.json(
        { error: "학반을 찾을 수 없거나 수정 권한이 없습니다." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateClassGroupSchema.parse(body);

    console.log("학반 수정 요청:", {
      classGroupId: params.classGroupId,
      courseId: params.courseId,
      teacherId: session.user.id,
      name: validatedData.name,
      period: validatedData.period,
      schedulesCount: validatedData.schedules.length,
      studentIdsCount: validatedData.studentIds.length,
    });

    // 학반 수정
    const classGroup = await prisma.classGroup.update({
      where: { id: params.classGroupId },
      data: {
        name: validatedData.name,
        period: validatedData.period,
        schedules: JSON.stringify(validatedData.schedules),
        studentIds: validatedData.studentIds,
      },
    });

    console.log("학반 수정 성공:", classGroup.id);

    return NextResponse.json(
      {
        message: "학반이 성공적으로 수정되었습니다.",
        classGroup: {
          ...classGroup,
          schedules: JSON.parse(classGroup.schedules || "[]"),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("학반 수정 오류:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "입력 데이터가 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "학반 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 학반 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; classGroupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "학반 삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    const course = await prisma.course.findFirst({
      where: { id: params.courseId },
      select: { teacherId: true, courseType: true },
    });

    if (!course) {
      return NextResponse.json(
        { error: "수업을 찾을 수 없거나 삭제 권한이 없습니다." },
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
        { error: "학반 삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    const existingClassGroup = await prisma.classGroup.findFirst({
      where: {
        id: params.classGroupId,
        courseId: params.courseId,
      },
    });

    if (!existingClassGroup) {
      return NextResponse.json(
        { error: "학반을 찾을 수 없거나 삭제 권한이 없습니다." },
        { status: 404 }
      );
    }

    console.log("학반 삭제 요청:", {
      classGroupId: params.classGroupId,
      courseId: params.courseId,
      teacherId: session.user.id,
    });

    // 학반 삭제
    await prisma.classGroup.delete({
      where: { id: params.classGroupId },
    });

    console.log("학반 삭제 성공:", params.classGroupId);

    return NextResponse.json(
      {
        message: "학반이 성공적으로 삭제되었습니다.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("학반 삭제 오류:", error);

    return NextResponse.json(
      { error: "학반 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

