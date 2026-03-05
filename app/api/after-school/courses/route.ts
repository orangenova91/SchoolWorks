import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createCourseSchema = z.object({
  title: z.string().trim().min(1, "강좌명을 입력하세요").max(200, "강좌명은 200자 이하여야 합니다"),
  description: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "강의를 생성할 권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const validated = createCourseSchema.parse(body);

    const instructorName = session.user.name || session.user.email || "강사 미기재";

    // Course model requires subject, grade, instructor, classroom - use empty strings for optional fields
    // 방과후 수업임을 표시하기 위해 모든 선택 필드를 빈 문자열로 설정
    const newCourse = await (prisma as any).course.create({
      data: {
        courseType: "after_school",
        subject: validated.title,
        grade: "",
        instructor: instructorName,
        classroom: "",
        description: validated.description || "",
        academicYear: "",
        semester: "",
        subjectGroup: "",
        subjectArea: "",
        careerTrack: "",
        teacherId: session.user.id,
      },
    });

    return NextResponse.json(
      {
        message: "강의가 생성되었습니다.",
        course: {
          id: newCourse.id,
          subject: newCourse.subject,
          instructor: newCourse.instructor,
          createdAt: newCourse.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "입력값이 올바르지 않습니다.", details: err.errors }, { status: 400 });
    }
    console.error("Create after-school course error:", err);
    return NextResponse.json({ error: "강의 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 교사 또는 학생만 조회 가능
    if (session.user.role !== "teacher" && session.user.role !== "student") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // Backfill legacy after-school courses (previously identified by empty-string fields)
    // into the explicit courseType field. This is idempotent and keeps old data visible.
    await (prisma as any).course.updateMany({
      where: {
        teacherId: { not: null },
        grade: "",
        classroom: "",
        academicYear: "",
        semester: "",
        subjectGroup: "",
        subjectArea: "",
        careerTrack: "",
      },
      data: { courseType: "after_school" },
    });

    const where: any = {
      courseType: "after_school",
    };

    const url = new URL(request.url);
    const scopeAll = url.searchParams.get("scope") === "all";

    // 교사: 기본은 자신 강의만, scope=all이면 같은 학교 교사 전체 강의. 학생: 같은 학교 전체 강의
    if (session.user.role === "teacher" && !scopeAll) {
      where.teacherId = session.user.id;
      console.log("Fetching after-school courses for teacherId:", session.user.id);
    } else {
      // 학생이거나 교사+scope=all: 같은 학교의 모든 방과후 수업 강의 조회
      const teachers = await (prisma as any).user.findMany({
        where: {
          role: "teacher",
          school: session.user.school || undefined,
        },
        select: { id: true },
      });
      const teacherIds = teachers.map((t: any) => t.id);
      if (teacherIds.length > 0) {
        where.teacherId = { in: teacherIds };
      } else {
        return NextResponse.json({ courses: [] });
      }
      console.log("Fetching after-school courses (scope=all or student), school:", session.user.school, "teacherIds:", teacherIds.length);
    }

    const courses = await (prisma as any).course.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        subject: true,
        instructor: true,
        classroom: true,
        description: true,
        enrollmentOpen: true,
        academicYear: true,
        semester: true,
        grade: true,
        teacherId: true,
        createdAt: true,
      },
    });

    // For each course, fetch the latest class-group (if any) to expose schedules for UI
    const coursesWithSchedules = await Promise.all(
      courses.map(async (course: any) => {
        try {
          const groups = await (prisma as any).classGroup.findMany({
            where: { courseId: course.id },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, name: true, schedules: true, studentIds: true },
          });
          const firstGroup = groups && groups.length > 0 ? groups[0] : null;
          const schedules = firstGroup ? JSON.parse(firstGroup.schedules || "[]") : [];
          // produce a compact display string like "월 3교시, 수 2교시"
          const scheduleDisplay =
            schedules && Array.isArray(schedules) && schedules.length > 0
              ? schedules.map((s: any) => `${s.day} ${s.period}`).join(", ")
              : "";
          // include first class-group id and studentIds for client decision
          return {
            ...course,
            classGroupSchedule: scheduleDisplay,
            firstClassGroupId: firstGroup ? firstGroup.id : null,
            firstClassGroupStudentIds: firstGroup ? (firstGroup.studentIds || []) : [],
          };
        } catch (err) {
          console.error("Failed to fetch class-groups for course:", course.id, err);
          return { ...course, classGroupSchedule: "", firstClassGroupId: null, firstClassGroupStudentIds: [] };
        }
      })
    );

    console.log("Found after-school courses:", coursesWithSchedules.length);

    return NextResponse.json({ courses: coursesWithSchedules });
  } catch (err) {
    console.error("Get courses error:", err);
    return NextResponse.json({ error: "강의 목록을 불러오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}


