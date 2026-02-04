import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // Only teachers who own the course can toggle enrollment
    const courseId = params.courseId;
    const existing = await prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "수업을 찾을 수 없습니다." }, { status: 404 });
    }
    const isTeacherOwner = session.user.role === "teacher" && session.user.id === existing.teacherId;
    const isAdmin = session.user.role === "admin";
    if (!isTeacherOwner && !isAdmin) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const open = typeof body.open === "boolean" ? body.open : undefined;
    if (open === undefined) {
      // toggle if not provided
      const course = await prisma.course.findUnique({ where: { id: courseId }, select: { enrollmentOpen: true } });
      const next = !(course?.enrollmentOpen ?? true);
      const updated = await prisma.course.update({ where: { id: courseId }, data: { enrollmentOpen: next } });
      return NextResponse.json({ enrollmentOpen: updated.enrollmentOpen });
    } else {
      const updated = await prisma.course.update({ where: { id: courseId }, data: { enrollmentOpen: open } });
      return NextResponse.json({ enrollmentOpen: updated.enrollmentOpen });
    }
  } catch (err) {
    console.error("Toggle enrollment error:", err);
    return NextResponse.json({ error: "신청 상태 변경 중 오류가 발생했습니다." }, { status: 500 });
  }
}

// Some hosting environments or clients may issue POST instead of PUT.
// Add a POST handler that delegates to the same logic for compatibility.
export async function POST(
  request: NextRequest,
  ctx: { params: { courseId: string } }
) {
  // Reuse the same logic as PUT by calling PUT with same args.
  return await PUT(request, ctx);
}


