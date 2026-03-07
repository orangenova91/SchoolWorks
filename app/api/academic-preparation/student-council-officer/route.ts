import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  role: z.string().min(1, "역할을 입력해주세요"),
  userId: z.string().nullable(),
});

export const dynamic = "force-dynamic";

/**
 * 학생회 직위 배정 (학교 단위). 동일 역할 기존 담당 해제 후 지정한 학생만 설정.
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
    const parsed = patchSchema.safeParse({
      ...body,
      userId: body.userId == null || body.userId === "" ? null : body.userId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const { role, userId } = parsed.data;
    const prismaAny = prisma as any;

    const schoolStudents = await prisma.user.findMany({
      where: { role: "student", school },
      select: { id: true },
    });
    const schoolStudentIds = schoolStudents.map((u) => u.id);

    const profilesWithRole = await prismaAny.studentProfile.findMany({
      where: {
        userId: { in: schoolStudentIds },
        studentCouncilRole: role,
      },
      select: { id: true },
    });

    for (const p of profilesWithRole) {
      await prismaAny.studentProfile.update({
        where: { id: p.id },
        data: { studentCouncilRole: null },
      });
    }

    if (userId) {
      if (!schoolStudentIds.includes(userId)) {
        return NextResponse.json(
          { error: "선택한 학생이 해당 학교 소속이 아닙니다." },
          { status: 400 }
        );
      }
      const target = await prismaAny.studentProfile.findFirst({
        where: { userId },
      });
      if (target) {
        await prismaAny.studentProfile.update({
          where: { id: target.id },
          data: { studentCouncilRole: role },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("Error updating student council officer:", error);
    return NextResponse.json(
      { error: "학생회 직위 배정을 저장하는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
