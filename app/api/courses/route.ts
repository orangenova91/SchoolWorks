import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    if (session.user.role === "teacher") {
      const courses = await (prisma as unknown as {
        course: {
          findMany: (args: {
            where: { teacherId: string };
            select: { id: true; subject: true; grade: true };
            orderBy: { createdAt: "desc" };
          }) => Promise<{ id: string; subject: string; grade: string }[]>;
        };
      }).course.findMany({
        where: { teacherId: session.user.id },
        select: { id: true, subject: true, grade: true },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(courses);
    }

    if (session.user.role === "student") {
      const classGroups = await (prisma as unknown as {
        classGroup: {
          findMany: (args: {
            where: { studentIds: { has: string } };
            include: { course: { select: { id: true; subject: true; grade: true; createdAt: true } } };
            orderBy: { createdAt: "desc" };
          }) => Promise<Array<{ course: { id: string; subject: string; grade: string; createdAt: Date } }>>;
        };
      }).classGroup.findMany({
        where: { studentIds: { has: session.user.id } },
        include: {
          course: { select: { id: true, subject: true, grade: true, createdAt: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const uniqueCourses = new Map<string, { id: string; subject: string; grade: string; createdAt: Date }>();
      classGroups.forEach((group) => {
        if (group.course) {
          uniqueCourses.set(group.course.id, group.course);
        }
      });

      const courses = Array.from(uniqueCourses.values())
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(({ id, subject, grade }) => ({ id, subject, grade }));

      return NextResponse.json(courses);
    }

    return NextResponse.json(
      { error: "접근 권한이 없습니다." },
      { status: 403 }
    );
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    return NextResponse.json(
      { error: "수업 목록을 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

