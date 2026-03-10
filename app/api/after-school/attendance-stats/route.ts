import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AttendanceStat = {
  courseId: string;
  courseSubject: string;
  classGroupId: string;
  classGroupName: string;
  totalExpectedCount: number;
  nonPresentCount: number;
  attendanceRate: number; // 0 ~ 1
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "교사만 통계를 조회할 수 있습니다." }, { status: 403 });
    }

    const teacherId = session.user.id;

    // 쿼리 파라미터: scope (mine|all), 기본은 mine
    const url = new URL(request.url);
    const scopeAll = url.searchParams.get("scope") === "all";

    // 우선은 자신의 방과후 강의만 대상으로 한다.
    // 추후 방과후 담당자/관리자에 대해 scope=all 을 허용하도록 확장 가능.
    const whereCourses: any = {
      courseType: "after_school",
      teacherId,
    };

    const courses = await (prisma as any).course.findMany({
      where: whereCourses,
      select: {
        id: true,
        subject: true,
        classGroups: {
          select: {
            id: true,
            name: true,
            studentIds: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!courses || courses.length === 0) {
      return NextResponse.json({ stats: [] as AttendanceStat[] });
    }

    const stats: AttendanceStat[] = [];

    for (const course of courses) {
      const courseId: string = course.id;
      const courseSubject: string = course.subject ?? "";

      for (const group of course.classGroups ?? []) {
        const classGroupId: string = group.id;
        const classGroupName: string = group.name ?? "";
        const studentIds: string[] = Array.isArray(group.studentIds) ? group.studentIds : [];

        if (studentIds.length === 0) {
          // 수강생이 없는 학반은 통계 대상에서 제외
          continue;
        }

        // 이 학반에 대해 출결이 "완료"된 날짜들 (즉, attendanceSaveRecord 가 있는 날짜들)
        const saveRecords = await (prisma as any).attendanceSaveRecord.findMany({
          where: {
            classGroupId,
          },
          select: {
            date: true,
          },
        });

        if (!saveRecords || saveRecords.length === 0) {
          continue;
        }

        const dates = saveRecords.map((r: any) => r.date as Date);

        // 총 기대 출석 횟수 = (출결 저장 완료된 날짜 수) * (수강생 수)
        const totalExpectedCount = dates.length * studentIds.length;

        // 해당 날짜들에 대해 기록된 "비출석" (지각/결석 등) 총 수
        // attendance 테이블에는 present 는 저장되지 않고, 비출석만 저장되므로
        // 단순 count 로 충분하다.
        const nonPresentCount = await (prisma as any).attendance.count({
          where: {
            classGroupId,
            date: {
              in: dates,
            },
          },
        });

        const attendanceRate =
          totalExpectedCount > 0
            ? (totalExpectedCount - nonPresentCount) / totalExpectedCount
            : 0;

        stats.push({
          courseId,
          courseSubject,
          classGroupId,
          classGroupName,
          totalExpectedCount,
          nonPresentCount,
          attendanceRate,
        });
      }
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("after-school attendance stats error:", error);
    return NextResponse.json(
      { error: "방과후 출석 통계를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

