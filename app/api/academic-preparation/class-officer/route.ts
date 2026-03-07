import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  grade: z.string().min(1, "학년을 입력해주세요"),
  classLabel: z.string().min(1, "학급을 입력해주세요"),
  role: z.string().min(1, "역할을 입력해주세요"),
  userId: z.string().nullable(), // null 또는 "" = 미지정(해제)
});

export const dynamic = "force-dynamic";

/**
 * 학급직 배정: 해당 학급 내 동일 역할 기존 담당자는 자동 해제 후, 지정한 학생만 해당 역할로 설정.
 * userId가 null/빈 문자열이면 해당 역할만 해제(미지정).
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

    const { grade, classLabel, role, userId } = parsed.data;
    const prismaAny = prisma as any;

    // 해당 학교의 해당 학년·학급 학생들의 userId 목록
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
      select: { id: true, userId: true, classOfficer: true },
    });

    const profileUserIds = profilesInClass.map((p: { userId: string }) => p.userId);

    // 해당 학급 내에서 이 역할(role)을 가진 모든 프로필의 classOfficer를 null로 해제
    const toClear = profilesInClass.filter(
      (p: { classOfficer: string | null }) => p.classOfficer === role
    );

    for (const p of toClear) {
      await prismaAny.studentProfile.update({
        where: { id: p.id },
        data: { classOfficer: null },
      });
    }

    // 지정한 학생이 있으면, 그 학생이 이 학급 소속인지 확인 후 classOfficer 설정
    if (userId) {
      const belongsToClass = profileUserIds.includes(userId);
      if (!belongsToClass) {
        return NextResponse.json(
          { error: "선택한 학생이 해당 학급 소속이 아닙니다." },
          { status: 400 }
        );
      }

      const targetProfile = await prismaAny.studentProfile.findFirst({
        where: { userId },
      });
      if (targetProfile) {
        await prismaAny.studentProfile.update({
          where: { id: targetProfile.id },
          data: { classOfficer: role, officerAssists: [] },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("Error updating class officer:", error);
    return NextResponse.json(
      { error: "학급직 배정을 저장하는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
