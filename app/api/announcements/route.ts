import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const AUDIENCE_VALUES = ["all", "grade-1", "grade-2", "grade-3", "parents"] as const;

const selectedClassSchema = z.object({
  grade: z.string(),
  classNumber: z.string(),
});

const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요").max(200, "제목은 200자 이하여야 합니다"),
  category: z.string().optional(),
  content: z.string().trim().min(1, "본문을 입력하세요"),
  audience: z.enum(AUDIENCE_VALUES),
  author: z.string().trim().min(1, "작성자를 입력하세요"),
  isScheduled: z.boolean().default(false),
  publishAt: z.string().datetime().optional(),
  selectedClasses: z.array(selectedClassSchema).optional(),
  parentSelectedClasses: z.array(selectedClassSchema).optional(),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "공지사항 생성 권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createAnnouncementSchema.parse(body);

    // 예약 발행인 경우 publishAt 필수
    if (validatedData.isScheduled && !validatedData.publishAt) {
      return NextResponse.json(
        { error: "예약 발행 시 발행 시각을 지정해주세요." },
        { status: 400 }
      );
    }

    // publishAt이 현재 시간보다 과거인지 확인
    if (validatedData.publishAt) {
      const publishDate = new Date(validatedData.publishAt);
      if (publishDate <= new Date()) {
        return NextResponse.json(
          { error: "발행 시각은 현재 시간보다 미래여야 합니다." },
          { status: 400 }
        );
      }
    }

    // 공지사항 생성
    const announcement = await (prisma as any).announcement.create({
      data: {
        title: validatedData.title,
        category: validatedData.category || null,
        content: validatedData.content,
        audience: validatedData.audience,
        author: validatedData.author,
        authorId: session.user.id,
        isScheduled: validatedData.isScheduled,
        publishAt: validatedData.publishAt ? new Date(validatedData.publishAt) : null,
        publishedAt: validatedData.isScheduled ? null : new Date(), // 예약이 아니면 즉시 발행
        school: session.user.school || null,
        selectedClasses: validatedData.selectedClasses ? JSON.stringify(validatedData.selectedClasses) : null,
        parentSelectedClasses: validatedData.parentSelectedClasses ? JSON.stringify(validatedData.parentSelectedClasses) : null,
      },
    });

    return NextResponse.json(
      {
        message: validatedData.isScheduled
          ? "공지사항이 예약되었습니다."
          : "공지사항이 발행되었습니다.",
        announcement: {
          id: announcement.id,
          title: announcement.title,
          audience: announcement.audience,
          author: announcement.author,
          isScheduled: announcement.isScheduled,
          publishAt: announcement.publishAt?.toISOString() || null,
          publishedAt: announcement.publishedAt?.toISOString() || null,
          createdAt: announcement.createdAt.toISOString(),
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

    console.error("Create announcement error:", error);
    return NextResponse.json(
      { error: "공지사항 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const audience = searchParams.get("audience");
    const includeScheduled = searchParams.get("includeScheduled") === "true";

    // 기본 조회 조건
    const where: any = {};

    // 발행된 공지사항만 조회 (예약 포함 여부에 따라)
    if (!includeScheduled) {
      where.publishedAt = { not: null };
    }

    // 학교 필터 (같은 학교의 공지사항만)
    if (session.user.school) {
      where.school = session.user.school;
    }

    // 대상 필터
    if (audience) {
      // 특정 대상으로 필터링하는 경우
      where.OR = [
        { audience: "all" }, // 전체 대상은 항상 포함
        { audience },
      ];
    } else {
      // 사용자 역할에 따른 기본 필터
      if (session.user.role === "student") {
        // 학생은 자신의 학년과 전체 대상만 볼 수 있음
        // TODO: 학생의 학년 정보를 StudentProfile에서 가져와야 함
        where.OR = [
          { audience: "all" },
          // { audience: `grade-${studentGrade}` }, // 실제 구현 시 추가
        ];
      } else if (session.user.role === "teacher") {
        // 교사는 모든 공지사항 조회 가능 (필터 없음)
        // where.OR 조건을 추가하지 않음
      }
    }

    const announcements = await (prisma as any).announcement.findMany({
      where,
      orderBy: [
        { createdAt: "desc" },
      ],
      take: 50, // 최대 50개
    });

    // 클라이언트 측에서 정렬: publishedAt 우선, 없으면 publishAt, 없으면 createdAt
    announcements.sort((a: any, b: any) => {
      const aDate = a.publishedAt || a.publishAt || a.createdAt;
      const bDate = b.publishedAt || b.publishAt || b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    console.log(`Found ${announcements.length} announcements for user ${session.user.role}`, {
      includeScheduled,
      audience,
      school: session.user.school,
      where,
    });

    return NextResponse.json({
      announcements: announcements.map((a: any) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        audience: a.audience,
        author: a.author,
        isScheduled: a.isScheduled,
        publishAt: a.publishAt?.toISOString() || null,
        publishedAt: a.publishedAt?.toISOString() || null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        selectedClasses: a.selectedClasses || null,
        parentSelectedClasses: a.parentSelectedClasses || null,
      })),
    });
  } catch (error) {
    console.error("Get announcements error:", error);
    return NextResponse.json(
      { error: "공지사항 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

