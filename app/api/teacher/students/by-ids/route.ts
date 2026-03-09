import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET: 교사가 여러 학생 정보를 ID 목록으로 조회 (같은 학교 학생만)
 * Query: ids=id1,id2,id3
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "teacher") {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    if (!idsParam || !idsParam.trim()) {
      return NextResponse.json(
        { error: "ids 쿼리 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ students: [] }, { status: 200 });
    }

    const school = session.user.school ?? undefined;

    const users = await (prisma as any).user.findMany({
      where: {
        id: { in: ids },
        role: "student",
        ...(school ? { school } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        studentProfile: {
          select: {
            studentId: true,
            classLabel: true,
          },
        },
      },
    });

    const students = users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      studentProfile: u.studentProfile,
    }));

    return NextResponse.json({ students }, { status: 200 });
  } catch (error) {
    console.error("Get students by ids error:", error);
    return NextResponse.json(
      { error: "학생 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
