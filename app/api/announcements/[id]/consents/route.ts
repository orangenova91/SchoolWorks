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
      select: {
        id: true,
        authorId: true,
        school: true,
        consentStats: true,
      },
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

    const consents = await (prisma as any).announcementConsent.findMany({
      where: {
        announcementId: params.id,
        submittedAt: { not: null },
      },
      orderBy: { submittedAt: "desc" },
    });

    const userIds = consents.map((consent: any) => consent.userId);
    const users = await (prisma as any).user.findMany({
      where: { id: { in: userIds } },
      include: {
        studentProfile: true,
        parentProfile: true,
      },
    });

    const usersById = new Map(
      users.map((user: any) => [user.id, user])
    );

    const childIds = users
      .flatMap((user: any) => user.parentProfile?.studentIds || [])
      .filter(Boolean);

    const targetChildIds = Array.from(new Set(childIds));

    const children = targetChildIds.length
      ? await (prisma as any).user.findMany({
          where: { id: { in: targetChildIds } },
          include: { studentProfile: true },
        })
      : [];

    const childrenById = new Map(
      children.map((child: any) => [child.id, child])
    );

    const totalTargetStudents = consentStats?.totalStudents || 0;
    const totalTargetParents = consentStats?.totalParents || 0;

    const result = consents.map((consent: any) => {
      const user = usersById.get(consent.userId);
      const parentChildren = user?.parentProfile?.studentIds
        ? user.parentProfile.studentIds
            .map((id: string) => childrenById.get(id))
            .filter(Boolean)
        : [];
      const studentId =
        user?.role === "student"
          ? user?.studentProfile?.studentId
          : parentChildren.find((child: any) => child?.studentProfile?.studentId)
              ?.studentProfile?.studentId;

      return {
        userId: consent.userId,
        signatureUrl: consent.signatureUrl || null,
        signedAt: consent.signedAt?.toISOString?.() || null,
        submittedAt: consent.submittedAt?.toISOString?.() || null,
        returnedAt: consent.returnedAt?.toISOString?.() || null,
        returnReason: consent.returnReason || null,
        studentId: studentId || null,
        user: user
          ? {
              id: user.id,
              name: user.name || null,
              email: user.email || null,
              role: user.role || null,
              studentProfile: user.studentProfile || null,
              parentProfile: user.parentProfile || null,
              children: parentChildren.map((child: any) => ({
                id: child.id,
                name: child.name || null,
                studentProfile: child.studentProfile || null,
              })),
            }
          : null,
      };
    });

    const sortedResult = [...result].sort((a, b) => {
      const aValue = (a.studentId || "").toString().trim();
      const bValue = (b.studentId || "").toString().trim();
      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;
      return aValue.localeCompare(bValue, "ko-KR", { numeric: true });
    });

    const submittedStudents = sortedResult.filter(
      (item) => item.user?.role === "student" && !item.returnedAt
    ).length;
    const submittedParents = sortedResult.filter(
      (item) => item.user?.role === "parent" && !item.returnedAt
    ).length;
    const returnedStudents = sortedResult.filter(
      (item) => item.user?.role === "student" && item.returnedAt
    ).length;
    const returnedParents = sortedResult.filter(
      (item) => item.user?.role === "parent" && item.returnedAt
    ).length;

    return NextResponse.json({
      consents: sortedResult,
      stats: {
        totalStudents: totalTargetStudents,
        totalParents: totalTargetParents,
        submittedStudents,
        submittedParents,
        returnedStudents,
        returnedParents,
      },
    });
  } catch (error) {
    console.error("Get consents error:", error);
    return NextResponse.json(
      { error: "동의서 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
