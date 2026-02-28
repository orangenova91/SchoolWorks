import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const ids = searchParams.get("ids") || "";

    // 같은 학교의 교사만 조회
    const where: any = {
      role: "teacher",
      ...(session.user.school ? { school: session.user.school } : {}),
    };

    // IDs가 제공되면 ID로 필터링
    if (ids) {
      const idArray = ids.split(',').filter(id => id.trim());
      if (idArray.length > 0) {
        where.id = { in: idArray };
      }
    } else if (search) {
      // 검색어가 있으면 이름/이메일로 검색
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const teachers = await (prisma as any).user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        teacherProfile: {
          select: {
            roleLabel: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // roleLabel을 평탄화하여 반환
    const teachersWithRoleLabel = teachers.map((teacher: any) => ({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      roleLabel: teacher.teacherProfile?.roleLabel || null,
    }));

    return NextResponse.json({ teachers: teachersWithRoleLabel });
  } catch (error) {
    console.error("Get teachers error:", error);
    return NextResponse.json(
      { error: "교사 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

