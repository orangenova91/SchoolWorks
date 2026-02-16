import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateCleaningAreaSchema = z.object({
  classGroup: z.string().trim().min(1, "학반을 입력하세요").optional(),
  area: z.string().trim().min(1, "담당구역을 입력하세요").optional(),
  teacher: z.string().trim().min(1, "지도교사를 입력하세요").optional(),
  studentCount: z.number().int().min(0).optional().nullable(),
  studentIds: z.array(z.string()).optional().default([]),
  notes: z.string().trim().optional().nullable(),
});

export const dynamic = 'force-dynamic';

// 청소구역 수정
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
    const validatedData = updateCleaningAreaSchema.parse(body);

    // 해당 청소구역이 같은 학교인지 확인
    const existing = await (prisma as any).cleaningArea.findUnique({
      where: { id },
      select: { school: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "청소구역을 찾을 수 없습니다." }, { status: 404 });
    }

    if (existing.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const updated = await (prisma as any).cleaningArea.update({
      where: { id },
      data: {
        ...validatedData,
        studentIds: validatedData.studentIds || [],
        notes: validatedData.notes || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "청소구역이 수정되었습니다.",
      cleaningArea: {
        id: updated.id,
        classGroup: updated.classGroup,
        area: updated.area,
        teacher: updated.teacher,
        studentCount: updated.studentCount,
        studentIds: updated.studentIds || [],
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: error.errors[0]?.message || "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }
    console.error("Error updating cleaning area:", error);
    return NextResponse.json(
      { error: "청소구역 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// 청소구역 삭제
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

    // 해당 청소구역이 같은 학교인지 확인
    const existing = await (prisma as any).cleaningArea.findUnique({
      where: { id },
      select: { school: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "청소구역을 찾을 수 없습니다." }, { status: 404 });
    }

    if (existing.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    await (prisma as any).cleaningArea.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "청소구역이 삭제되었습니다.",
    });
  } catch (error: any) {
    console.error("Error deleting cleaning area:", error);
    return NextResponse.json(
      { error: "청소구역 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}

