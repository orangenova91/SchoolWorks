import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateVolunteerSchema = z.object({
  department: z.string().trim().min(1, "부서명을 입력하세요").optional(),
  teacher: z.string().trim().min(1, "담당교사를 입력하세요").optional(),
  activityName: z.string().trim().min(1, "봉사활동명을 입력하세요").optional(),
  activityContent: z.string().trim().optional().nullable(),
  volunteerArea: z.string().trim().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  grade: z.string().trim().optional().nullable(),
  selectionCount: z.number().int().min(0).optional().nullable(),
  volunteerHours: z.number().int().min(0).optional().nullable(),
  location: z.string().trim().optional().nullable(),
  studentSelections: z.string().optional().nullable(), // JSON 문자열
});

export const dynamic = 'force-dynamic';

// 봉사활동 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 교사만 수정 가능
    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const validatedData = updateVolunteerSchema.parse(body);

    // 해당 봉사활동이 같은 학교인지 확인
    const existing = await (prisma as any).volunteer.findUnique({
      where: { id },
      select: { school: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "봉사활동을 찾을 수 없습니다." }, { status: 404 });
    }

    if (existing.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 날짜 문자열을 DateTime으로 변환
    const startDate = validatedData.startDate 
      ? new Date(validatedData.startDate) 
      : undefined;
    const endDate = validatedData.endDate 
      ? new Date(validatedData.endDate) 
      : undefined;

    // undefined가 아닌 필드만 업데이트 데이터에 포함
    const updateData: any = {
      updatedAt: new Date(),
    };

    // 각 필드가 undefined가 아닐 때만 업데이트
    if (validatedData.department !== undefined) updateData.department = validatedData.department;
    if (validatedData.teacher !== undefined) updateData.teacher = validatedData.teacher;
    if (validatedData.activityName !== undefined) updateData.activityName = validatedData.activityName;
    if (validatedData.activityContent !== undefined) updateData.activityContent = validatedData.activityContent || null;
    if (validatedData.volunteerArea !== undefined) updateData.volunteerArea = validatedData.volunteerArea || null;
    if (validatedData.startDate !== undefined) updateData.startDate = startDate !== undefined ? startDate : validatedData.startDate === null ? null : undefined;
    if (validatedData.endDate !== undefined) updateData.endDate = endDate !== undefined ? endDate : validatedData.endDate === null ? null : undefined;
    if (validatedData.grade !== undefined) updateData.grade = validatedData.grade || null;
    if (validatedData.selectionCount !== undefined) updateData.selectionCount = validatedData.selectionCount || null;
    if (validatedData.volunteerHours !== undefined) updateData.volunteerHours = validatedData.volunteerHours || null;
    if (validatedData.location !== undefined) updateData.location = validatedData.location || null;
    if (validatedData.studentSelections !== undefined) updateData.studentSelections = validatedData.studentSelections || null;

    const updated = await (prisma as any).volunteer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      message: "봉사활동이 수정되었습니다.",
      volunteer: {
        id: updated.id,
        department: updated.department,
        teacher: updated.teacher,
        activityName: updated.activityName,
        startDate: updated.startDate?.toISOString?.() || updated.startDate || null,
        endDate: updated.endDate?.toISOString?.() || updated.endDate || null,
        createdAt: updated.createdAt?.toISOString?.() || updated.createdAt,
      },
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: error.errors[0]?.message || "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }
    console.error("Error updating volunteer:", error);
    return NextResponse.json(
      { error: "봉사활동 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// 봉사활동 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 교사만 삭제 가능
    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = params;

    // 해당 봉사활동이 같은 학교인지 확인
    const existing = await (prisma as any).volunteer.findUnique({
      where: { id },
      select: { school: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "봉사활동을 찾을 수 없습니다." }, { status: 404 });
    }

    if (existing.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    await (prisma as any).volunteer.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "봉사활동이 삭제되었습니다.",
    });
  } catch (error: any) {
    console.error("Error deleting volunteer:", error);
    return NextResponse.json(
      { error: "봉사활동 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}

