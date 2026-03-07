import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PERIOD_VALUES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const GRADE_VALUES = ["1", "2", "3"] as const;

const createEventSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요").max(200, "제목은 200자 이하여야 합니다"),
  description: z.string().trim().max(1000, "설명은 1000자 이하여야 합니다").optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  eventType: z.enum(["자율*자치", "동아리", "진로", "봉사", "학사행사", "개인 일정", "기타 행사"]).optional(),
  scope: z.enum(["school", "personal", "class"]),
  teacherId: z.string().optional(),
  school: z.string().trim().optional(),
  courseId: z.string().optional(),
  department: z.string().trim().max(100, "담당 부서는 100자 이하여야 합니다").optional(),
  responsiblePerson: z.string().trim().max(100, "담당자는 100자 이하여야 합니다").optional(),
  scheduleArea: z.enum(["창의적 체험활동", "교과", "기타", "개인일정(나만 보기)"]).optional(),
  gradeLevels: z.array(z.enum(GRADE_VALUES)).optional(),
  periods: z.array(z.enum(PERIOD_VALUES)).optional(),
  activityContent: z.string().trim().max(500, "활동 내용은 500자 이하여야 합니다").optional(),
});

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const scope = searchParams.get("scope"); // "school", "personal", "all"

    // 기본 조회 조건
    const where: any = {};

    // 날짜 필터
    if (start && end) {
      where.startDate = {
        gte: new Date(start),
        lte: new Date(end),
      };
    }

    // 범위 필터
    if (scope === "school") {
      // 학교 일정만: 같은 학교의 school scope 일정
      where.OR = [
        { scope: "school", school: session.user.school || undefined },
      ];
      if (session.user.school) {
        where.OR.push({ scope: "school", school: session.user.school });
      }
    } else if (scope === "personal") {
      // 개인 일정만
      where.scope = "personal";
      where.teacherId = session.user.id;
    } else {
      // 모두 조회: 학교 일정 + 개인 일정 (교사인 경우에만)
      if (session.user.role === "teacher") {
        where.OR = [
          { scope: "school", school: session.user.school || undefined },
          { scope: "personal", teacherId: session.user.id },
        ];
      } else {
        // 학생, 관리자 등은 학교 일정만 조회
        where.OR = [
          { scope: "school", school: session.user.school || undefined },
        ];
      }
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startDate: "asc" },
    }) as Array<{
      id: string;
      title: string;
      description: string | null;
      startDate: Date;
      endDate: Date | null;
      eventType: string | null;
      scope: string;
      school: string | null;
      courseId: string | null;
      department: string | null;
      responsiblePerson: string | null;
      scheduleArea: string | null;
      gradeLevels: string[];
      periods: string[];
    }>;

    const eventIds = events.map((e) => e.id);
    let questionCountMap: Record<string, number> = {};
    if (eventIds.length > 0) {
      const counts = await (prisma as any).activitySheetQuestion.groupBy({
        by: ["calendarEventId"],
        _count: { id: true },
        where: { calendarEventId: { in: eventIds } },
      });
      questionCountMap = counts.reduce(
        (acc: Record<string, number>, c: { calendarEventId: string; _count: { id: number } }) => {
          acc[c.calendarEventId] = c._count.id;
          return acc;
        },
        {}
      );
    }

    // FullCalendar 형식으로 변환
    const formattedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start: event.startDate.toISOString(),
      end: event.endDate ? event.endDate.toISOString() : null,
      allDay: !event.endDate || event.startDate.toDateString() === event.endDate.toDateString(),
      extendedProps: {
        eventType: event.eventType,
        scope: event.scope,
        school: event.school,
        courseId: event.courseId,
        department: event.department,
        responsiblePerson: event.responsiblePerson,
        scheduleArea: event.scheduleArea,
        gradeLevels: event.gradeLevels || [],
        periods: event.periods || [],
        activityContent: (event as any).activityContent ?? null,
        activityQuestionCount: questionCountMap[event.id] ?? 0,
      },
    }));

    return NextResponse.json({ events: formattedEvents }, { status: 200 });
  } catch (error: any) {
    console.error("Get calendar events error:", error);
    return NextResponse.json(
      { error: "일정을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "일정 생성 권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createEventSchema.parse(body);

    // scope에 따른 검증
    if (validatedData.scope === "personal") {
      // 개인 일정은 teacherId 필수
      validatedData.teacherId = session.user.id;
    } else if (validatedData.scope === "school") {
      // 학교 일정은 school 필수
      if (!session.user.school) {
        return NextResponse.json(
          { error: "학교 정보가 없어 학교 일정을 생성할 수 없습니다." },
          { status: 400 }
        );
      }
      validatedData.school = session.user.school;
    }

    const newEvent = await prisma.calendarEvent.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        eventType: validatedData.eventType || null,
        scope: validatedData.scope,
        school: validatedData.school,
        teacherId: validatedData.teacherId || session.user.id,
        courseId: validatedData.courseId || null,
        department: validatedData.department || null,
        responsiblePerson: validatedData.responsiblePerson || null,
        scheduleArea: validatedData.scheduleArea || null,
        gradeLevels: validatedData.gradeLevels ?? [],
        periods: validatedData.periods ?? [],
        activityContent: validatedData.activityContent ?? null,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(
      {
        message: "일정이 생성되었습니다.",
        event: {
          id: newEvent.id,
          title: newEvent.title,
          description: newEvent.description,
          start: newEvent.startDate.toISOString(),
          end: newEvent.endDate ? newEvent.endDate.toISOString() : null,
          eventType: newEvent.eventType,
          scope: newEvent.scope,
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

    console.error("Create calendar event error:", error);
    return NextResponse.json(
      { error: "일정 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

