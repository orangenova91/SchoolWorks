import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createClassSchema = z
  .object({
    courseType: z.enum(["regular", "after_school"]).optional(),
    academicYear: z
      .string()
      .trim()
      .min(1, "학년도를 입력하세요")
      .max(9, "학년도가 너무 깁니다 (예: 2025)"),
    semester: z.string().trim().min(1, "학기를 선택하세요"),
    subjectGroup: z
      .string()
      .trim()
      .min(1, "교과군을 입력하세요")
      .max(50, "교과군은 50자 이하여야 합니다"),
    subjectArea: z
      .string()
      .trim()
      .min(1, "교과영역을 입력하세요")
      .max(50, "교과영역은 50자 이하여야 합니다"),
    careerTrack: z
      .string()
      .trim()
      .min(1, "진로구분을 입력하세요")
      .max(50, "진로구분은 50자 이하여야 합니다"),
    subject: z
      .string()
      .trim()
      .min(1, "교과명을 입력하세요")
      .max(50, "교과명은 50자 이하여야 합니다"),
    // 방과후는 대상 학년 입력을 받지 않으므로 필수 검증에서 제외
    grade: z.string().trim().optional(),
    // 프론트(CreateClassForm)에서 classroom을 optional로 두고 있으므로 서버도 동일하게 허용
    classroom: z.string().trim().max(50, "강의실은 50자 이하여야 합니다").optional(),
    description: z
      .string()
      .trim()
      .min(1, "강의소개를 입력하세요")
      .max(1000, "강의소개는 1000자 이하여야 합니다"),
    instructor: z.string().trim().optional(),
    capacity: z.union([z.number().int().positive(), z.string()]).optional(),
    totalSessions: z.union([z.number().int().positive(), z.string()]).optional(),
  })
  .superRefine((data, ctx) => {
    const courseType = data.courseType ?? "regular";
    if (courseType === "regular") {
      if (!data.grade || data.grade.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "대상 학년을 선택하세요",
          path: ["grade"],
        });
      }
    }
  });

export const dynamic = 'force-dynamic';

async function generateUniqueJoinCode() {
  const MAX_ATTEMPTS = 5;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = randomBytes(3).toString("hex").toUpperCase();

    const existing = await prisma.course.findFirst({
      where: { joinCode: code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("수업 코드를 생성할 수 없습니다. 잠시 후 다시 시도해주세요.");
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "수업 생성 권한이 없습니다." },
        { status: 403 }
      );
    }

    const json = await request.json();
    const data = createClassSchema.parse(json);
    const courseType = data.courseType ?? "regular";

    const instructorName =
      session.user?.name && session.user.name.trim().length > 0
        ? session.user.name
        : session.user?.email ?? "이름 미기재";

    const joinCode = await generateUniqueJoinCode();

    const capacityNum =
      data.capacity !== undefined && data.capacity !== ""
        ? (typeof data.capacity === "number" ? data.capacity : parseInt(String(data.capacity), 10))
        : undefined;
    const totalSessionsNum =
      data.totalSessions !== undefined && data.totalSessions !== ""
        ? (typeof data.totalSessions === "number"
            ? data.totalSessions
            : parseInt(String(data.totalSessions), 10))
        : undefined;

    const newClass = await prisma.course.create({
      data: {
        courseType,
        academicYear: data.academicYear,
        semester: data.semester,
        subjectGroup: data.subjectGroup,
        subjectArea: data.subjectArea,
        careerTrack: data.careerTrack,
        subject: data.subject,
        grade: courseType === "after_school" ? (data.grade ?? "") : (data.grade as string),
        instructor: instructorName,
        classroom: data.classroom ?? "",
        description: data.description,
        capacity: capacityNum !== undefined && !isNaN(capacityNum) ? capacityNum : undefined,
        totalSessions: totalSessionsNum !== undefined && !isNaN(totalSessionsNum) ? totalSessionsNum : undefined,
        joinCode,
        teacherId: session.user.id,
      },
    });

    return NextResponse.json(
      {
        message: "수업이 생성되었습니다.",
        class: {
          id: newClass.id,
          courseType: newClass.courseType,
          academicYear: newClass.academicYear,
          semester: newClass.semester,
          subjectGroup: newClass.subjectGroup,
          subjectArea: newClass.subjectArea,
          careerTrack: newClass.careerTrack,
          subject: newClass.subject,
          grade: newClass.grade,
          instructor: newClass.instructor,
          classroom: newClass.classroom,
          description: newClass.description,
          joinCode: newClass.joinCode,
          createdAt: newClass.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Create class error:", error);
    return NextResponse.json(
      { error: "수업 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

