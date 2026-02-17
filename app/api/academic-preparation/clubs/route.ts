import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createClubSchema = z.object({
  clubType: z.enum(["creative", "autonomous"]),
  clubName: z.string().trim().min(1, "동아리명을 입력하세요"),
  teacher: z.string().trim().min(1, "담당교사를 입력하세요"),
  category: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  maxMembers: z.number().int().min(0).optional().nullable(),
  location: z.string().trim().optional().nullable(),
});

export const dynamic = 'force-dynamic';

// 동아리 목록 조회
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "creative" | "autonomous"

    const where: any = {
      school: session.user.school || undefined,
    };

    if (type) {
      where.clubType = type;
    }

    const clubs = await (prisma as any).club.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        clubName: true,
        teacher: true,
        category: true,
        clubType: true,
        description: true,
        maxMembers: true,
        location: true,
        studentSelections: true,
        school: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 날짜를 ISO 문자열로 변환
    const cleanedClubs = (clubs || []).map((club: any) => ({
      ...club,
      createdAt: club.createdAt?.toISOString?.() || club.createdAt,
    }));

    return NextResponse.json({
      clubs: cleanedClubs,
    });
  } catch (error: any) {
    console.error("Error fetching clubs:", error);
    return NextResponse.json(
      { error: "동아리 목록을 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

// 동아리 생성
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
    const validatedData = createClubSchema.parse(body);

    const newClub = await (prisma as any).club.create({
      data: {
        clubType: validatedData.clubType,
        clubName: validatedData.clubName,
        teacher: validatedData.teacher,
        category: validatedData.category || null,
        description: validatedData.description || null,
        maxMembers: validatedData.maxMembers || null,
        location: validatedData.location || null,
        school: session.user.school || null,
      },
    });

    return NextResponse.json(
      {
        message: "동아리가 추가되었습니다.",
        club: {
          id: newClub.id,
          clubType: newClub.clubType,
          clubName: newClub.clubName,
          teacher: newClub.teacher,
          category: newClub.category,
          description: newClub.description,
          maxMembers: newClub.maxMembers,
          location: newClub.location,
          createdAt: newClub.createdAt?.toISOString?.() || newClub.createdAt,
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
    console.error("Error creating club:", error);
    return NextResponse.json(
      { error: "동아리 추가에 실패했습니다." },
      { status: 500 }
    );
  }
}

