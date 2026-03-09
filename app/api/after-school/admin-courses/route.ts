import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createAfterSchoolAdminCourseSchema = z.object({
  teacherId: z.string().trim().min(1, "교사 ID가 필요합니다."),
  academicYear: z.string().trim().optional(),
  semester: z.string().trim().optional(),
  grade: z.string().trim().optional(),
  subject: z.string().trim().min(1, "강좌명을 입력하세요").max(200, "강좌명은 200자 이하여야 합니다"),
  classroom: z.string().trim().optional(),
  description: z.string().trim().optional(),
  capacity: z.union([z.number().int().positive(), z.string()]).optional(),
  totalSessions: z.union([z.number().int().positive(), z.string()]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (session.user.role !== "teacher" && session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "강의 생성 권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = createAfterSchoolAdminCourseSchema.parse(body);
    const capacityNum =
      parsed.capacity !== undefined && parsed.capacity !== ""
        ? (typeof parsed.capacity === "number"
            ? parsed.capacity
            : parseInt(String(parsed.capacity), 10))
        : undefined;
    const totalSessionsNum =
      parsed.totalSessions !== undefined && parsed.totalSessions !== ""
        ? (typeof parsed.totalSessions === "number"
            ? parsed.totalSessions
            : parseInt(String(parsed.totalSessions), 10))
        : undefined;
    const data = { ...parsed, capacityNum, totalSessionsNum };

    const school = session.user.school || "";
    if (!school) {
      return NextResponse.json(
        { error: "학교 정보가 없어 강의를 생성할 수 없습니다." },
        { status: 400 }
      );
    }

    // 방과후 담당자인지 확인
    const manager = await (prisma as any).afterSchoolManager.findFirst({
      where: {
        teacherId: session.user.id,
        school,
      },
    });

    if (!manager && session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json(
        { error: "방과후 담당자만 다른 교사의 강의를 생성할 수 있습니다." },
        { status: 403 }
      );
    }

    // 대상 교사가 같은 학교의 교사인지 확인
    const targetTeacher = await (prisma as any).user.findFirst({
      where: {
        id: data.teacherId,
        role: "teacher",
        school,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!targetTeacher) {
      return NextResponse.json(
        { error: "해당 학교의 교사를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const instructorName =
      (targetTeacher.name && targetTeacher.name.trim().length > 0
        ? targetTeacher.name
        : targetTeacher.email) || "강사 미기재";

    const newCourse = await (prisma as any).course.create({
      data: {
        courseType: "after_school",
        academicYear: data.academicYear || "",
        semester: data.semester || "",
        subjectGroup: "-",
        subjectArea: "-",
        careerTrack: "-",
        subject: data.subject,
        grade: data.grade || "",
        instructor: instructorName,
        classroom: data.classroom || "",
        description: data.description || "",
        teacherId: targetTeacher.id,
        capacity:
          data.capacityNum !== undefined && !isNaN(data.capacityNum) ? data.capacityNum : undefined,
        totalSessions:
          data.totalSessionsNum !== undefined && !isNaN(data.totalSessionsNum)
            ? data.totalSessionsNum
            : undefined,
      },
    });

    return NextResponse.json(
      {
        message: "방과후 강의가 생성되었습니다.",
        course: {
          id: newCourse.id,
          subject: newCourse.subject,
          instructor: newCourse.instructor,
          classroom: newCourse.classroom,
          description: newCourse.description,
          enrollmentOpen: newCourse.enrollmentOpen,
          academicYear: newCourse.academicYear,
          semester: newCourse.semester,
          grade: newCourse.grade,
          teacherId: newCourse.teacherId,
          createdAt: newCourse.createdAt,
          classGroupSchedule: "",
          firstClassGroupId: null,
          firstClassGroupStudentIds: [],
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

    console.error("Create after-school admin course error:", error);
    return NextResponse.json(
      { error: "강의 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

