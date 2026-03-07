import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_CLASS_OFFICER_ROLES = ["반장", "부반장", "없음"];
const DEFAULT_STUDENT_COUNCIL_ROLES = ["학생회장", "부회장", "없음"];

const patchSchema = z.object({
  classOfficerRoles: z.array(z.string().max(50)).max(30).optional(),
  studentCouncilRoles: z.array(z.string().max(50)).max(30).optional(),
});

export const dynamic = "force-dynamic";

// 학교별 학급·학생회 조직 명칭 조회 (없으면 기본값 반환)
export async function GET() {
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
      return NextResponse.json(
        {
          classOfficerRoles: DEFAULT_CLASS_OFFICER_ROLES,
          studentCouncilRoles: DEFAULT_STUDENT_COUNCIL_ROLES,
        }
      );
    }

    const config = await (prisma as any).organizationRoleConfig.findUnique({
      where: { school },
    });

    return NextResponse.json({
      classOfficerRoles:
        config?.classOfficerRoles?.length > 0
          ? config.classOfficerRoles
          : DEFAULT_CLASS_OFFICER_ROLES,
      studentCouncilRoles:
        config?.studentCouncilRoles?.length > 0
          ? config.studentCouncilRoles
          : DEFAULT_STUDENT_COUNCIL_ROLES,
    });
  } catch (error: unknown) {
    console.error("Error fetching organization roles:", error);
    return NextResponse.json(
      { error: "설정을 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

// 학교별 학급·학생회 조직 명칭 저장 (upsert)
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
    const validatedData = patchSchema.parse(body);

    const updateData: { classOfficerRoles?: string[]; studentCouncilRoles?: string[] } = {};
    if (validatedData.classOfficerRoles !== undefined) {
      updateData.classOfficerRoles = validatedData.classOfficerRoles;
    }
    if (validatedData.studentCouncilRoles !== undefined) {
      updateData.studentCouncilRoles = validatedData.studentCouncilRoles;
    }

    const upserted = await (prisma as any).organizationRoleConfig.upsert({
      where: { school },
      create: {
        school,
        classOfficerRoles: validatedData.classOfficerRoles ?? DEFAULT_CLASS_OFFICER_ROLES,
        studentCouncilRoles:
          validatedData.studentCouncilRoles ?? DEFAULT_STUDENT_COUNCIL_ROLES,
      },
      update: updateData,
    });

    return NextResponse.json({
      classOfficerRoles: upserted.classOfficerRoles ?? DEFAULT_CLASS_OFFICER_ROLES,
      studentCouncilRoles:
        upserted.studentCouncilRoles ?? DEFAULT_STUDENT_COUNCIL_ROLES,
    });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && (error as { name: string }).name === "ZodError") {
      const zodError = error as { errors?: Array<{ message?: string }> };
      return NextResponse.json(
        { error: zodError.errors?.[0]?.message ?? "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }
    console.error("Error saving organization roles:", error);
    return NextResponse.json(
      { error: "설정 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
