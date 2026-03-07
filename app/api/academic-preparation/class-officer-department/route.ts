import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  grade: z.string().min(1, "학년을 입력해주세요"),
  classLabel: z.string().min(1, "학급을 입력해주세요"),
  role: z.string().min(1, "역할을 입력해주세요"),
  memberUserIds: z.array(z.string()),
});

export const dynamic = "force-dynamic";

/**
 * 역할별 부서원 설정.
 * - memberUserIds에 포함된 학생: officerAssists = [role], classOfficer = null (한 학생당 부서원 1개만).
 * - 제외된 학생 중 해당 역할이 officerAssists에 있으면 제거.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (session.user.role !== "teacher" && session.user.role !== "admin") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const school = session.user.school;
    if (!school) {
      return NextResponse.json({ error: "학교 정보가 없습니다." }, { status: 400 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const { grade, classLabel, role, memberUserIds } = parsed.data;
    const prismaAny = prisma as any;

    const schoolStudents = await prisma.user.findMany({
      where: { role: "student", school },
      select: { id: true },
    });
    const schoolStudentIds = schoolStudents.map((u) => u.id);

    const profilesInClass = await prismaAny.studentProfile.findMany({
      where: {
        userId: { in: schoolStudentIds },
        grade,
        classLabel,
      },
      select: { id: true, userId: true, officerAssists: true },
    });

    const profileByUserId = new Map(
      profilesInClass.map((p: { userId: string }) => [p.userId, p])
    );
    const classUserIds = profilesInClass.map((p: { userId: string }) => p.userId);

    // memberUserIds는 해당 학급 소속만 허용
    const validMemberIds = memberUserIds.filter((id) => classUserIds.includes(id));

    for (const p of profilesInClass) {
      const prof = p as { id: string; userId: string; officerAssists: string[] };
      const assists = Array.isArray(prof.officerAssists) ? prof.officerAssists : [];
      const isMember = validMemberIds.includes(prof.userId);

      if (isMember) {
        await prismaAny.studentProfile.update({
          where: { id: prof.id },
          data: { officerAssists: [role], classOfficer: null },
        });
      } else if (assists.includes(role)) {
        const next = assists.filter((r: string) => r !== role);
        await prismaAny.studentProfile.update({
          where: { id: prof.id },
          data: { officerAssists: next },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("Error updating class officer department:", error);
    return NextResponse.json(
      { error: "부서원 배정을 저장하는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
