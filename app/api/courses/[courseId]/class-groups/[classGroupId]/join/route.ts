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

    // 현재 신청하려는 학반의 스케줄
    let newSchedules: Array<{ day: string; period: string }> = [];
    try {
      const parsed = JSON.parse(existing.schedules || "[]");
      if (Array.isArray(parsed)) {
        newSchedules = parsed;
      }
    } catch {
      newSchedules = [];
    }

    if (newSchedules.length > 0) {
      // 이미 학생이 가입해 있는 (다른) 방과후 학반들의 스케줄과 충돌하는지 확인
      const joinedGroups = await prisma.classGroup.findMany({
        where: {
          studentIds: { has: session.user.id },
          id: { not: classGroupId },
        },
        select: {
          id: true,
          schedules: true,
          course: {
            select: {
              id: true,
              subject: true,
              courseType: true,
            },
          },
        },
      });

      let conflict:
        | {
            day: string;
            period: string;
            courseSubject?: string | null;
          }
        | null = null;

      outer: for (const group of joinedGroups) {
        // 방과후 수업(courseType === "after_school")에 대해서만 시간 중복을 막음
        if (group.course && group.course.courseType !== "after_school") {
          continue;
        }

        let existingSchedules: Array<{ day: string; period: string }> = [];
        try {
          const parsed = JSON.parse(group.schedules || "[]");
          if (Array.isArray(parsed)) {
            existingSchedules = parsed;
          }
        } catch {
          existingSchedules = [];
        }

        for (const es of existingSchedules) {
          for (const ns of newSchedules) {
            if (es.day === ns.day && es.period === ns.period) {
              conflict = {
                day: es.day,
                period: es.period,
                courseSubject: group.course?.subject,
              };
              break outer;
            }
          }
        }
      }

      if (conflict) {
        const baseMessage = `이미 신청한 다른 방과후 수업과 시간(${conflict.day} ${conflict.period}교시)가 겹쳐 신청할 수 없습니다.`;
        const detailedMessage = conflict.courseSubject
          ? `이미 신청한 "${conflict.courseSubject}" 수업과 시간(${conflict.day} ${conflict.period}교시)가 겹쳐 신청할 수 없습니다.`
          : baseMessage;

        return NextResponse.json(
          {
            error: detailedMessage,
          },
          { status: 400 }
        );
      }
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


