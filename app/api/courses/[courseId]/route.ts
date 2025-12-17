import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const course = await (prisma as unknown as {
      course: {
        findFirst: (args: {
          where: { id: string; teacherId?: string };
        }) => Promise<{
          id: string;
          subject: string;
          grade: string;
          teacherId: string;
        } | null>;
      };
    }).course.findFirst({
      where: {
        id: params.courseId,
        ...(session.user.role === "teacher" ? { teacherId: session.user.id } : {}),
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "수업을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: course.id,
      subject: course.subject,
      grade: course.grade,
    });
  } catch (error) {
    console.error("Failed to fetch course:", error);
    return NextResponse.json(
      { error: "수업 정보를 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
