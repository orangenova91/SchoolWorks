import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "조회 권한이 없습니다." }, { status: 403 });
    }

    const announcement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true, school: true, consentStats: true },
    });

    if (!announcement) {
      return NextResponse.json({ error: "안내문을 찾을 수 없습니다." }, { status: 404 });
    }

    if (announcement.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "작성한 교사만 확인할 수 있습니다." },
        { status: 403 }
      );
    }

    if (session.user.school && announcement.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const consentStats = (() => {
      try {
        return announcement.consentStats
          ? JSON.parse(announcement.consentStats)
          : null;
      } catch {
        return null;
      }
    })();

    const consentRows = await (prisma as any).announcementConsent.findMany({
      where: {
        announcementId: params.id,
        submittedAt: { not: null },
      },
      select: { userId: true, returnedAt: true },
    });

    const userIds = consentRows.map((row: any) => row.userId);
    const users = userIds.length
      ? await (prisma as any).user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, role: true },
        })
      : [];

    const roleById = new Map(users.map((user: any) => [user.id, user.role]));

    const submittedStudents = consentRows.filter(
      (row: any) => roleById.get(row.userId) === "student" && !row.returnedAt
    ).length;
    const submittedParents = consentRows.filter(
      (row: any) => roleById.get(row.userId) === "parent" && !row.returnedAt
    ).length;
    const returnedStudents = consentRows.filter(
      (row: any) => roleById.get(row.userId) === "student" && row.returnedAt
    ).length;
    const returnedParents = consentRows.filter(
      (row: any) => roleById.get(row.userId) === "parent" && row.returnedAt
    ).length;

    return NextResponse.json({
      stats: {
        totalStudents: consentStats?.totalStudents || 0,
        totalParents: consentStats?.totalParents || 0,
        submittedStudents,
        submittedParents,
        returnedStudents,
        returnedParents,
      },
    });
  } catch (error) {
    console.error("Get consent stats error:", error);
    return NextResponse.json(
      { error: "통계를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
