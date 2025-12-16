import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PERIOD_VALUES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const GRADE_VALUES = ["1", "2", "3"] as const;

const updateEventSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요").max(200, "제목은 200자 이하여야 합니다").optional(),
  description: z.string().trim().max(1000, "설명은 1000자 이하여야 합니다").optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
  eventType: z.enum(["자율*자치", "동아리", "진로", "봉사", "학사행사", "개인 일정"]).optional(),
  department: z.string().trim().max(100, "담당 부서는 100자 이하여야 합니다").optional(),
  responsiblePerson: z.string().trim().max(100, "담당자는 100자 이하여야 합니다").optional(),
  scheduleArea: z.enum(["창의적 체험활동", "교과", "개인일정(나만 보기)"]).optional(),
  gradeLevels: z.array(z.enum(GRADE_VALUES)).optional(),
  periods: z.array(z.enum(PERIOD_VALUES)).optional(),
});

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "일정 수정 권한이 없습니다." },
        { status: 403 }
      );
    }

    const eventId = params.id;
    const body = await request.json();
    const validatedData = updateEventSchema.parse(body);

    // 일정 조회 및 권한 확인
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
    }

    // 권한 확인: 생성한 사람이거나 개인 일정의 경우에만 수정 가능
    if (event.createdBy !== session.user.id && event.scope === "personal" && event.teacherId !== session.user.id) {
      return NextResponse.json(
        { error: "이 일정을 수정할 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 업데이트 데이터 구성
    const updateData: any = {};
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.startDate !== undefined) updateData.startDate = new Date(validatedData.startDate);
    if (validatedData.endDate !== undefined) {
      updateData.endDate = validatedData.endDate ? new Date(validatedData.endDate) : null;
    }
    if (validatedData.eventType !== undefined) updateData.eventType = validatedData.eventType || null;
    if (validatedData.department !== undefined) updateData.department = validatedData.department || null;
    if (validatedData.responsiblePerson !== undefined) updateData.responsiblePerson = validatedData.responsiblePerson || null;
    if (validatedData.scheduleArea !== undefined) updateData.scheduleArea = validatedData.scheduleArea || null;
    if (validatedData.gradeLevels !== undefined) updateData.gradeLevels = validatedData.gradeLevels ?? [];
    if (validatedData.periods !== undefined) updateData.periods = validatedData.periods ?? [];

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: updateData,
    });

    return NextResponse.json(
      {
        message: "일정이 수정되었습니다.",
        event: {
          id: updatedEvent.id,
          title: updatedEvent.title,
          description: updatedEvent.description,
          start: updatedEvent.startDate.toISOString(),
          end: updatedEvent.endDate ? updatedEvent.endDate.toISOString() : null,
          eventType: updatedEvent.eventType,
          scope: updatedEvent.scope,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Update calendar event error:", error);
    return NextResponse.json(
      { error: "일정 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "일정 삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    const eventId = params.id;

    // 일정 조회 및 권한 확인
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
    }

    // 권한 확인: 생성한 사람이거나 개인 일정의 경우에만 삭제 가능
    if (event.createdBy !== session.user.id && event.scope === "personal" && event.teacherId !== session.user.id) {
      return NextResponse.json(
        { error: "이 일정을 삭제할 권한이 없습니다." },
        { status: 403 }
      );
    }

    await prisma.calendarEvent.delete({
      where: { id: eventId },
    });

    return NextResponse.json(
      { message: "일정이 삭제되었습니다." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Delete calendar event error:", error);
    return NextResponse.json(
      { error: "일정 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

