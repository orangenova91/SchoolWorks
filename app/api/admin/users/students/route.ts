import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");

    if (!idsParam) {
      return NextResponse.json({ error: "학생 ID가 필요합니다." }, { status: 400 });
    }

    const studentIds = idsParam.split(",").filter((id) => id.trim().length > 0);

    if (studentIds.length === 0) {
      return NextResponse.json({ students: [] });
    }

    // 학생 정보 가져오기 (StudentProfile 포함)
    const prismaAny = prisma as any;
    const students = await prisma.user.findMany({
      where: {
        id: { in: studentIds },
        role: "student",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // 각 학생의 StudentProfile에서 studentId 가져오기
    const studentProfiles = students.length > 0
      ? await prismaAny.studentProfile.findMany({
          where: {
            userId: { in: students.map((s) => s.id) },
          },
          select: {
            userId: true,
            studentId: true,
          },
        })
      : [];

    const studentProfileMap = new Map(
      studentProfiles.map((profile: any) => [profile.userId, profile])
    );

    // studentId를 포함한 학생 정보 반환
    const studentsWithStudentId = students.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      studentId: studentProfileMap.get(student.id)?.studentId || null,
    }));

    return NextResponse.json({ students: studentsWithStudentId });
  } catch (error: any) {
    console.error("Get students error:", error);
    return NextResponse.json(
      {
        error: "학생 정보 조회 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

