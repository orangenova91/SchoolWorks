import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const getQuerySchema = z.object({
  studentId: z.string().min(1),
  academicYear: z.coerce.number().int(),
});

const patchSchema = z.object({
  studentId: z.string().min(1),
  academicYear: z.coerce.number().int(),
  content: z.string().max(20000).default(""),
});

async function requireTeacher(session: any) {
  if (!session?.user?.id || session.user.role !== "teacher") {
    return {
      ok: false as const,
      status: 401 as const,
      error: "인증이 필요합니다.",
    };
  }
  return { ok: true as const, teacherId: session.user.id as string };
}

async function checkStudentTeacherPermission(studentId: string, teacherId: string) {
  const teacherProfile = await (prisma as any).teacherProfile.findUnique({
    where: { userId: teacherId },
    select: { classLabel: true, school: true },
  });

  if (!teacherProfile) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "담임 교사 정보를 찾을 수 없습니다.",
    };
  }

  const student = await (prisma as any).user.findUnique({
    where: { id: studentId },
    select: {
      role: true,
      school: true,
      studentProfile: { select: { classLabel: true, school: true } },
    },
  });

  if (!student || student.role !== "student") {
    return { ok: false as const, status: 404 as const, error: "학생 정보를 찾을 수 없습니다." };
  }

  const studentClassLabel = (student.studentProfile?.classLabel ?? "").trim();
  const teacherClassLabel = (teacherProfile?.classLabel ?? "").trim();
  const studentSchool = student.school || student.studentProfile?.school;
  const teacherSchool = teacherProfile?.school;

  // 비교 기준이 하나도 없는 경우 권한 검증 불가
  if (!teacherClassLabel && !teacherSchool) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "담임 교사 학급/학교 정보가 없어 기록 접근을 할 수 없습니다.",
    };
  }

  // 담임반(classLabel)이 있는 경우: classLabel 일치 조건을 우선 적용
  if (teacherClassLabel) {
    if (!studentClassLabel || studentClassLabel !== teacherClassLabel) {
      return { ok: false as const, status: 403 as const, error: "다른 학급 학생의 기록은 조회할 수 없습니다." };
    }
  }

  // classLabel이 없거나 일치 검증이 불가한 경우: school 일치로 보강
  if (teacherSchool && studentSchool && teacherSchool !== studentSchool) {
    return { ok: false as const, status: 403 as const, error: "다른 학교 학생의 기록은 조회할 수 없습니다." };
  }

  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const teacher = await requireTeacher(session);
    if (!teacher.ok) {
      return NextResponse.json({ error: teacher.error }, { status: teacher.status });
    }

    const { searchParams } = new URL(request.url);
    const parsed = getQuerySchema.safeParse({
      studentId: searchParams.get("studentId"),
      academicYear: searchParams.get("academicYear"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "studentId와 academicYear가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const { studentId, academicYear } = parsed.data;

    const perm = await checkStudentTeacherPermission(studentId, teacher.teacherId);
    if (!perm.ok) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    const record = await (prisma as any).homeroomLifeRecord.findUnique({
      where: {
        studentId_academicYear_teacherId: {
          studentId,
          academicYear,
          teacherId: teacher.teacherId,
        },
      },
      select: { content: true, updatedAt: true },
    });

    return NextResponse.json({
      content: record?.content ?? "",
      updatedAt: record?.updatedAt ?? null,
    });
  } catch (error) {
    console.error("GET teacher life-record error:", error);
    return NextResponse.json(
      { error: "생활기록부 내용을 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const teacher = await requireTeacher(session);
    if (!teacher.ok) {
      return NextResponse.json({ error: teacher.error }, { status: teacher.status });
    }

    const body = patchSchema.parse(await request.json());
    const { studentId, academicYear, content } = body;

    const perm = await checkStudentTeacherPermission(studentId, teacher.teacherId);
    if (!perm.ok) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    const record = await (prisma as any).homeroomLifeRecord.upsert({
      where: {
        studentId_academicYear_teacherId: {
          studentId,
          academicYear,
          teacherId: teacher.teacherId,
        },
      },
      create: {
        studentId,
        teacherId: teacher.teacherId,
        academicYear,
        content,
      },
      update: {
        content,
      },
      select: { content: true, updatedAt: true },
    });

    return NextResponse.json({
      content: record.content ?? "",
      updatedAt: record.updatedAt ?? null,
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json({ error: error.errors?.[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
    }
    console.error("PATCH teacher life-record error:", error);
    return NextResponse.json(
      { error: "생활기록부 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}

