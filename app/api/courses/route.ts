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

    if (session.user.role !== "teacher") {
      return NextResponse.json(
        { error: "교사만 접근할 수 있습니다." },
        { status: 403 }
      );
    }

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
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    return NextResponse.json(
      { error: "수업 목록을 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

