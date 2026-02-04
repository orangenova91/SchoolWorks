import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string; classGroupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    if (session.user.role !== "student") {
      return NextResponse.json({ error: "학생만 가입할 수 있습니다." }, { status: 403 });
    }

    const { courseId, classGroupId } = params;

    const existing = await prisma.classGroup.findFirst({
      where: { id: classGroupId, courseId },
      select: { id: true, studentIds: true, schedules: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "학반을 찾을 수 없습니다." }, { status: 404 });
    }

    const currentIds: string[] = Array.isArray(existing.studentIds) ? existing.studentIds : [];
    if (currentIds.includes(session.user.id)) {
      return NextResponse.json({ message: "이미 가입되어 있습니다.", classGroup: { id: existing.id } }, { status: 200 });
    }

    // Use atomic push for Mongo (Prisma supports push on array fields)
    const updated = await prisma.classGroup.update({
      where: { id: classGroupId },
      data: { studentIds: { push: session.user.id } as any },
    });

    return NextResponse.json({
      message: "가입되었습니다.",
      classGroup: { id: updated.id, schedules: JSON.parse(updated.schedules || "[]"), studentIds: updated.studentIds || [] },
    });
  } catch (err) {
    console.error("Join class-group error:", err);
    return NextResponse.json({ error: "가입 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; classGroupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    if (session.user.role !== "student") {
      return NextResponse.json({ error: "학생만 취소할 수 있습니다." }, { status: 403 });
    }

    const { courseId, classGroupId } = params;

    const existing = await prisma.classGroup.findFirst({
      where: { id: classGroupId, courseId },
      select: { id: true, studentIds: true, schedules: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "학반을 찾을 수 없습니다." }, { status: 404 });
    }

    const currentIds: string[] = Array.isArray(existing.studentIds) ? existing.studentIds : [];
    const nextIds = currentIds.filter((id) => id !== session.user.id);

    const updated = await prisma.classGroup.update({
      where: { id: classGroupId },
      data: { studentIds: nextIds },
    });

    return NextResponse.json({
      message: "가입이 취소되었습니다.",
      classGroup: { id: updated.id, schedules: JSON.parse(updated.schedules || "[]"), studentIds: updated.studentIds || [] },
    });
  } catch (err) {
    console.error("Unjoin class-group error:", err);
    return NextResponse.json({ error: "취소 중 오류가 발생했습니다." }, { status: 500 });
  }
}


