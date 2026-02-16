import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createCleaningAreaSchema = z.object({
  classGroup: z.string().trim().min(1, "학반을 입력하세요"),
  area: z.string().trim().min(1, "담당구역을 입력하세요"),
  teacher: z.string().trim().min(1, "지도교사를 입력하세요"),
  studentCount: z.number().int().min(0).optional().nullable(),
  studentIds: z.array(z.string()).optional().default([]),
  notes: z.string().trim().optional().nullable(),
});

export const dynamic = 'force-dynamic';

// 청소구역 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 교사만 조회 가능
    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const cleaningAreas = await (prisma as any).cleaningArea.findMany({
      where: {
        school: session.user.school || undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        classGroup: true,
        area: true,
        teacher: true,
        studentCount: true,
        studentIds: true,
        notes: true,
        school: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // studentIds를 배열로 보장 (MongoDB에서 문자열로 올 수 있음)
    const cleanedAreas = (cleaningAreas || []).map((area: any) => ({
      ...area,
      studentIds: Array.isArray(area.studentIds) ? area.studentIds : (area.studentIds ? [area.studentIds] : []),
      createdAt: area.createdAt?.toISOString?.() || area.createdAt,
    }));

    return NextResponse.json({
      cleaningAreas: cleanedAreas,
    });
  } catch (error: any) {
    console.error("Error fetching cleaning areas:", error);
    return NextResponse.json(
      { error: "청소구역 목록을 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

// 청소구역 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 교사만 생성 가능
    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createCleaningAreaSchema.parse(body);

    const newCleaningArea = await (prisma as any).cleaningArea.create({
      data: {
        classGroup: validatedData.classGroup,
        area: validatedData.area,
        teacher: validatedData.teacher,
        studentCount: validatedData.studentCount || null,
        studentIds: validatedData.studentIds || [],
        notes: validatedData.notes || null,
        school: session.user.school || null,
      },
    });

    return NextResponse.json(
      {
        message: "청소구역이 추가되었습니다.",
        cleaningArea: {
          id: newCleaningArea.id,
          classGroup: newCleaningArea.classGroup,
          area: newCleaningArea.area,
          teacher: newCleaningArea.teacher,
          studentCount: newCleaningArea.studentCount,
          createdAt: newCleaningArea.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: error.errors[0]?.message || "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }
    console.error("Error creating cleaning area:", error);
    return NextResponse.json(
      { error: "청소구역 추가에 실패했습니다." },
      { status: 500 }
    );
  }
}

