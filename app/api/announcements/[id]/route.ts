import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const AUDIENCE_VALUES = ["all", "grade-1", "grade-2", "grade-3", "parents", "teachers"] as const;

const selectedClassSchema = z.object({
  grade: z.string(),
  classNumber: z.string(),
});

const updateAnnouncementSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요").max(200, "제목은 200자 이하여야 합니다"),
  content: z.string().trim().min(1, "본문을 입력하세요"),
  audience: z.enum(AUDIENCE_VALUES),
  author: z.string().trim().min(1, "작성자를 입력하세요"),
  isScheduled: z.boolean().default(false),
  publishAt: z.string().datetime().optional(),
  selectedClasses: z.array(selectedClassSchema).optional(),
});

export const dynamic = 'force-dynamic';

// 개별 공지사항 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const announcement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
    });

    if (!announcement) {
      return NextResponse.json({ error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
    }

    // 학교 필터 확인
    if (session.user.school && announcement.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 교사만 수정 가능하도록 권한 확인 (조회는 모든 인증된 사용자 가능)
    return NextResponse.json({
      announcement: {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        audience: announcement.audience,
        author: announcement.author,
        authorId: announcement.authorId,
        isScheduled: announcement.isScheduled,
        publishAt: announcement.publishAt?.toISOString() || null,
        publishedAt: announcement.publishedAt?.toISOString() || null,
        createdAt: announcement.createdAt.toISOString(),
        updatedAt: announcement.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Get announcement error:", error);
    return NextResponse.json(
      { error: "공지사항을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 공지사항 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "공지사항 수정 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 기존 공지사항 조회
    const existingAnnouncement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { error: "공지사항을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 작성자 확인 (본인이 작성한 공지사항만 수정 가능)
    if (existingAnnouncement.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "본인이 작성한 공지사항만 수정할 수 있습니다." },
        { status: 403 }
      );
    }

    // 학교 필터 확인
    if (session.user.school && existingAnnouncement.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateAnnouncementSchema.parse(body);

    // 예약 발행인 경우 publishAt 필수
    if (validatedData.isScheduled && !validatedData.publishAt) {
      return NextResponse.json(
        { error: "예약 발행 시 발행 시각을 지정해주세요." },
        { status: 400 }
      );
    }

    // publishAt이 현재 시간보다 과거인지 확인 (예약 발행인 경우)
    if (validatedData.publishAt) {
      const publishDate = new Date(validatedData.publishAt);
      if (publishDate <= new Date()) {
        return NextResponse.json(
          { error: "발행 시각은 현재 시간보다 미래여야 합니다." },
          { status: 400 }
        );
      }
    }

    // 공지사항 수정
    const updateData: any = {
      title: validatedData.title,
      content: validatedData.content,
      audience: validatedData.audience,
      author: validatedData.author,
      isScheduled: validatedData.isScheduled,
      publishAt: validatedData.publishAt ? new Date(validatedData.publishAt) : null,
      selectedClasses: validatedData.selectedClasses ? JSON.stringify(validatedData.selectedClasses) : null,
    };

    // 예약 발행 상태 변경 처리
    if (validatedData.isScheduled) {
      // 예약 발행으로 변경: publishedAt을 null로 설정
      updateData.publishedAt = null;
    } else if (!existingAnnouncement.publishedAt) {
      // 예약에서 즉시 발행으로 변경: publishedAt을 현재 시간으로 설정
      updateData.publishedAt = new Date();
    }
    // 이미 발행된 공지사항은 publishedAt을 변경하지 않음

    const announcement = await (prisma as any).announcement.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      message: validatedData.isScheduled
        ? "공지사항이 수정되고 예약되었습니다."
        : "공지사항이 수정되었습니다.",
      announcement: {
        id: announcement.id,
        title: announcement.title,
        audience: announcement.audience,
        author: announcement.author,
        isScheduled: announcement.isScheduled,
        publishAt: announcement.publishAt?.toISOString() || null,
        publishedAt: announcement.publishedAt?.toISOString() || null,
        createdAt: announcement.createdAt.toISOString(),
        updatedAt: announcement.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Update announcement error:", error);
    return NextResponse.json(
      { error: "공지사항 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 공지사항 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "공지사항 삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 기존 공지사항 조회
    const existingAnnouncement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { error: "공지사항을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 작성자 확인 (본인이 작성한 공지사항만 삭제 가능)
    if (existingAnnouncement.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "본인이 작성한 공지사항만 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    // 학교 필터 확인
    if (session.user.school && existingAnnouncement.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 공지사항 삭제
    await (prisma as any).announcement.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: "공지사항이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Delete announcement error:", error);
    return NextResponse.json(
      { error: "공지사항 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

