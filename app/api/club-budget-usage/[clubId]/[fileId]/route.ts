import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getSchool(session: { user?: { id?: string; school?: string | null } }) {
  const school = session.user?.school;
  if (school) return school;
  const userId = session.user?.id;
  if (!userId) return null;
  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: {
      school: true,
      teacherProfile: { select: { school: true } },
      studentProfile: { select: { school: true } },
    },
  });
  return user?.school ?? user?.teacherProfile?.school ?? user?.studentProfile?.school ?? null;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ clubId: string; fileId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const school = await getSchool(session);
    if (!school) {
      return NextResponse.json({ error: "학교 정보가 없습니다." }, { status: 400 });
    }

    const { clubId, fileId } = await params;
    if (!clubId || !fileId) {
      return NextResponse.json(
        { error: "동아리 ID와 파일 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const file = await (prisma as any).clubBudgetUsagePlanFile.findFirst({
      where: {
        id: fileId,
        clubId,
        school,
      },
      select: { id: true },
    });

    if (!file) {
      return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
    }

    await (prisma as any).clubBudgetUsagePlanFile.delete({
      where: { id: file.id },
    });

    return NextResponse.json({ message: "파일이 삭제되었습니다." });
  } catch (error) {
    console.error("Club budget usage plan delete error:", error);
    return NextResponse.json(
      { error: "파일 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
