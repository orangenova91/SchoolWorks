import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from '@vercel/blob';

const AUDIENCE_VALUES = ["all", "grade-1", "grade-2", "grade-3", "parents", "teacher"] as const;

const selectedClassSchema = z.object({
  grade: z.string(),
  classNumber: z.string(),
});

const surveyQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(["single", "multiple", "text", "textarea"]),
  question: z.string(),
  options: z.array(z.string()).optional(),
  required: z.boolean(),
});

const consentDataSchema = z.object({
  signatureImage: z.string().optional(), // Base64 이미지 (선택사항)
  signedAt: z.string().optional(),
  requiresSignature: z.boolean().optional(), // 서명이 필요한지 여부 (설문 조사에서 서명 포함 체크 시)
});

// 파일 업로드 허용 확장자
const ALLOWED_EXTENSIONS = [
  ".ppt", ".pptx", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".zip",
  ".hwp", ".hwpx", // 한글 파일
  ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", // 이미지 파일
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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
  surveyData: z.array(surveyQuestionSchema).optional(),
  surveyStartDate: z.string().datetime().optional(),
  surveyEndDate: z.string().datetime().optional(),
  consentData: consentDataSchema.optional(),
  editableBy: z.array(z.string()).optional(),
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

    // FormData 또는 JSON 처리
    const contentType = request.headers.get("content-type") || "";
    let body: any;
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const dataStr = formData.get("data") as string;
      if (dataStr) {
        body = JSON.parse(dataStr);
      }
      const fileList = formData.getAll("files") as File[];
      files = fileList.filter((f) => f && f.size > 0);
    } else {
      body = await request.json();
    }

    const validatedData = createAnnouncementSchema.parse(body);

    // 예약 발행인 경우 publishAt 필수 (빈 문자열도 체크)
    if (validatedData.isScheduled && (!validatedData.publishAt || validatedData.publishAt.trim() === "")) {
      return NextResponse.json(
        { error: "예약 발행 시 발행 시각을 지정해주세요." },
        { status: 400 }
      );
    }

    // publishAt이 현재 시간보다 과거인지 확인
    if (validatedData.publishAt) {
      const publishDate = new Date(validatedData.publishAt);
      if (isNaN(publishDate.getTime())) {
        return NextResponse.json(
          { error: "올바른 발행 시각을 입력해주세요." },
          { status: 400 }
        );
      }
      if (publishDate <= new Date()) {
        return NextResponse.json(
          { error: "발행 시각은 현재 시간보다 미래여야 합니다." },
          { status: 400 }
        );
      }
    }

    // 파일 저장 (선택적, 여러 개) - Vercel Blob Storage 사용
    const savedFiles: Array<{
      filePath: string;
      originalFileName: string;
      fileSize: number | null;
      mimeType: string | null;
    }> = [];
    if (files.length > 0) {
      for (const f of files) {
        if (!f || f.size === 0) continue;
        const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          return NextResponse.json(
            { error: `허용되지 않는 파일 형식입니다. 허용 형식: ${ALLOWED_EXTENSIONS.join(", ")}` },
            { status: 400 }
          );
        }
        if (f.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하여야 합니다.` },
            { status: 400 }
          );
        }
        // 고유한 파일명 생성 (타임스탬프 + 랜덤 문자열)
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 15);
        const extension = f.name.split('.').pop() || 'bin';
        const filename = `announcements/${timestamp}-${randomStr}.${extension}`;

        // Vercel Blob Storage에 업로드
        const blob = await put(filename, f, {
          access: 'public',
          contentType: f.type || 'application/octet-stream',
        });

        savedFiles.push({
          filePath: blob.url, // Blob Storage URL
          originalFileName: f.name,
          fileSize: f.size || null,
          mimeType: f.type || "application/octet-stream",
        });
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
        surveyData: validatedData.surveyData ? JSON.stringify(validatedData.surveyData) : null,
        surveyStartDate: validatedData.surveyStartDate ? new Date(validatedData.surveyStartDate) : null,
        surveyEndDate: validatedData.surveyEndDate ? new Date(validatedData.surveyEndDate) : null,
        consentData: validatedData.consentData ? JSON.stringify(validatedData.consentData) : null,
        attachments: savedFiles.length > 0 ? JSON.stringify(savedFiles) : null,
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

    // 예약된 공지사항 중 발행 시간이 지난 항목 자동 발행
    const now = new Date();
    const scheduledAnnouncements = await (prisma as any).announcement.findMany({
      where: {
        isScheduled: true,
        publishAt: { lte: now }, // publishAt이 현재 시간보다 이전이거나 같음
        publishedAt: null, // 아직 발행되지 않음
        ...(session.user.school ? { school: session.user.school } : {}), // 같은 학교의 공지사항만
      },
    });

    // 자동 발행 처리
    if (scheduledAnnouncements.length > 0) {
      await (prisma as any).announcement.updateMany({
        where: {
          id: { in: scheduledAnnouncements.map((a: any) => a.id) },
        },
        data: {
          publishedAt: now,
          isScheduled: false, // 발행 완료 후 예약 상태 해제
        },
      });
      console.log(`Auto-published ${scheduledAnnouncements.length} scheduled announcements`);
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
        // 교사는 일반 안내문만 조회 가능 (교직원 게시판 제외)
        // audience="teacher"는 제외하고 나머지만 표시
        where.AND = [
          {
            OR: [
              { audience: "all" },
              { audience: "parents" },
              { audience: "grade-1" },
              { audience: "grade-2" },
              { audience: "grade-3" },
            ],
          },
          {
            NOT: { audience: "teacher" },
          },
        ];
      } else if (session.user.role === "parent") {
        // 학부모는 "all" 또는 "parents"만 볼 수 있음 (teacher 제외)
        where.AND = [
          {
            OR: [
              { audience: "all" },
              { audience: "parents" },
            ],
          },
          {
            NOT: { audience: "teacher" },
          },
        ];
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
        authorId: a.authorId,
        isScheduled: a.isScheduled,
        publishAt: a.publishAt?.toISOString() || null,
        publishedAt: a.publishedAt?.toISOString() || null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        selectedClasses: a.selectedClasses || null,
        parentSelectedClasses: a.parentSelectedClasses || null,
        category: a.category || null,
        surveyData: a.surveyData || null,
        surveyStartDate: a.surveyStartDate?.toISOString() || null,
        surveyEndDate: a.surveyEndDate?.toISOString() || null,
        consentData: a.consentData || null,
        attachments: a.attachments || null,
        viewCount: a.viewCount || 0,
        editableBy: a.editableBy || [],
        lastEditedBy: a.lastEditedBy || null,
        lastEditedByName: a.lastEditedByName || null,
      })),
    });
  } catch (error) {
    console.error("Get announcements error:", error);
    return NextResponse.json(
      { error: "안내문 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}


