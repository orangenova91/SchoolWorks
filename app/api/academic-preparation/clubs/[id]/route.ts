import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateClubSchema = z.object({
  clubName: z.string().trim().min(1, "동아리명을 입력하세요").optional(),
  teacher: z.string().trim().min(1, "담당교사를 입력하세요").optional(),
  category: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  maxMembers: z.number().int().min(0).optional().nullable(),
  location: z.string().trim().optional().nullable(),
  studentSelections: z.string().optional().nullable(), // JSON 문자열
});

export const dynamic = 'force-dynamic';

// 동아리 수정
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
    const validatedData = updateClubSchema.parse(body);

    // 해당 동아리가 같은 학교인지 확인
    const existing = await (prisma as any).club.findUnique({
      where: { id },
      select: { school: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "동아리를 찾을 수 없습니다." }, { status: 404 });
    }

    if (existing.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // undefined가 아닌 필드만 업데이트 데이터에 포함
    const updateData: any = {
      updatedAt: new Date(),
    };

    // 각 필드가 undefined가 아닐 때만 업데이트
    if (validatedData.clubName !== undefined) updateData.clubName = validatedData.clubName;
    if (validatedData.teacher !== undefined) updateData.teacher = validatedData.teacher;
    if (validatedData.category !== undefined) updateData.category = validatedData.category || null;
    if (validatedData.description !== undefined) updateData.description = validatedData.description || null;
    if (validatedData.maxMembers !== undefined) updateData.maxMembers = validatedData.maxMembers || null;
    if (validatedData.location !== undefined) updateData.location = validatedData.location || null;
    if (validatedData.studentSelections !== undefined) updateData.studentSelections = validatedData.studentSelections || null;

    const updated = await (prisma as any).club.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      message: "동아리가 수정되었습니다.",
      club: {
        id: updated.id,
        clubName: updated.clubName,
        teacher: updated.teacher,
        category: updated.category,
        description: updated.description,
        maxMembers: updated.maxMembers,
        location: updated.location,
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
    console.error("Error updating club:", error);
    return NextResponse.json(
      { error: "동아리 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// 동아리 삭제
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

    // 해당 동아리가 같은 학교인지 확인
    const existing = await (prisma as any).club.findUnique({
      where: { id },
      select: { school: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "동아리를 찾을 수 없습니다." }, { status: 404 });
    }

    if (existing.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    await (prisma as any).club.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "동아리가 삭제되었습니다.",
    });
  } catch (error: any) {
    console.error("Error deleting club:", error);
    return NextResponse.json(
      { error: "동아리 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}

