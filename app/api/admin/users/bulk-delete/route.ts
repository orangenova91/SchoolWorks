import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const userIds = Array.isArray(body.userIds) ? body.userIds : [];

    if (userIds.length === 0) {
      return NextResponse.json({ error: "삭제할 사용자를 선택해주세요." }, { status: 400 });
    }

    const currentUserId = session.user.id;
    const adminSchool = session.user.school;

    // 자기 자신 제외
    const idsToDelete = userIds.filter((id: string) => id !== currentUserId);

    if (idsToDelete.length === 0) {
      return NextResponse.json(
        { error: "자기 자신을 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    // admin인 경우 같은 학교 사용자만 삭제 가능
    const whereCondition: { id: { in: string[] }; school?: string } = {
      id: { in: idsToDelete },
    };
    if (session.user.role === "admin" && adminSchool) {
      whereCondition.school = adminSchool;
    }

    const usersToDelete = await prisma.user.findMany({
      where: whereCondition,
      select: { id: true },
    });

    const deletableIds = usersToDelete.map((u) => u.id);

    await prisma.$transaction(
      deletableIds.map((id) =>
        prisma.user.delete({
          where: { id },
        })
      )
    );

    const skipped = idsToDelete.length - deletableIds.length;

    return NextResponse.json({
      message: `${deletableIds.length}명의 사용자가 삭제되었습니다.`,
      deleted: deletableIds.length,
      skipped,
    });
  } catch (error: unknown) {
    console.error("Bulk delete users error:", error);
    return NextResponse.json(
      {
        error: "사용자 일괄 삭제 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
