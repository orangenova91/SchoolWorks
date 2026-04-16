import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function normalize(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function isClubTeacherMatch(clubTeacher: string, teacherName?: string | null, teacherEmail?: string | null) {
  const target = normalize(clubTeacher);
  if (!target) return false;
  return target === normalize(teacherName) || target === normalize(teacherEmail);
}

async function getAuthorizedClub(clubId: string, session: any) {
  const prismaAny = prisma as any;
  const club = await prismaAny.club.findUnique({
    where: { id: clubId },
    select: {
      id: true,
      school: true,
      teacher: true,
    },
  });

  if (!club) {
    return { error: NextResponse.json({ error: "동아리를 찾을 수 없습니다." }, { status: 404 }) };
  }

  if (club.school !== session.user.school) {
    return { error: NextResponse.json({ error: "권한이 없습니다." }, { status: 403 }) };
  }

  if (!isClubTeacherMatch(club.teacher, session.user.name, session.user.email)) {
    return { error: NextResponse.json({ error: "담당 동아리만 조회할 수 있습니다." }, { status: 403 }) };
  }

  return { club };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clubId = (searchParams.get("clubId") || "").trim();
    if (!clubId) {
      return NextResponse.json({ error: "clubId가 필요합니다." }, { status: 400 });
    }

    const authResult = await getAuthorizedClub(clubId, session);
    if (authResult.error) return authResult.error;

    const prismaAny = prisma as any;
    const rows = await prismaAny.clubStudentExpression.findMany({
      where: { clubId },
      select: {
        studentId: true,
        content: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      expressions: rows.map((row: any) => ({
        studentId: row.studentId,
        content: row.content || "",
        updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching club student expressions for teacher:", error);
    return NextResponse.json(
      { error: "학생 활동 표현을 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
