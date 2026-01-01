import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from '@vercel/blob';

const AUDIENCE_VALUES = ["all", "grade-1", "grade-2", "grade-3", "parents"] as const;

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

const updateAnnouncementSchema = z.object({
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
  consentData: consentDataSchema.optional(),
});

export const dynamic = 'force-dynamic';

// 개별 안내문 조회
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
      return NextResponse.json({ error: "안내문을 찾을 수 없습니다." }, { status: 404 });
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
        category: announcement.category || null,
        content: announcement.content,
        audience: announcement.audience,
        author: announcement.author,
        authorId: announcement.authorId,
        isScheduled: announcement.isScheduled,
        publishAt: announcement.publishAt?.toISOString() || null,
        publishedAt: announcement.publishedAt?.toISOString() || null,
        createdAt: announcement.createdAt.toISOString(),
        updatedAt: announcement.updatedAt.toISOString(),
        selectedClasses: announcement.selectedClasses || null,
        parentSelectedClasses: announcement.parentSelectedClasses || null,
        surveyData: announcement.surveyData || null,
        consentData: announcement.consentData || null,
        attachments: announcement.attachments || null,
      },
    });
  } catch (error) {
    console.error("Get announcement error:", error);
    return NextResponse.json(
      { error: "안내문을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 안내문 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "안내문 수정 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 기존 안내문 조회
    const existingAnnouncement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { error: "안내문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 작성자 확인 (본인이 작성한 안내문만 수정 가능)
    if (existingAnnouncement.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "본인이 작성한 안내문만 수정할 수 있습니다." },
        { status: 403 }
      );
    }

    // 학교 필터 확인
    if (session.user.school && existingAnnouncement.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
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

    const validatedData = updateAnnouncementSchema.parse(body);

    // 예약 발행인 경우 publishAt 필수 (빈 문자열도 체크)
    if (validatedData.isScheduled && (!validatedData.publishAt || validatedData.publishAt.trim() === "")) {
      return NextResponse.json(
        { error: "예약 발행 시 발행 시각을 지정해주세요." },
        { status: 400 }
      );
    }

    // publishAt이 현재 시간보다 과거인지 확인 (예약 발행인 경우)
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

    // 기존 첨부 파일 가져오기
    let existingAttachments: Array<{
      filePath: string;
      originalFileName: string;
      fileSize: number | null;
      mimeType: string | null;
    }> = [];
    if (existingAnnouncement.attachments) {
      try {
        existingAttachments = typeof existingAnnouncement.attachments === 'string'
          ? JSON.parse(existingAnnouncement.attachments)
          : existingAnnouncement.attachments;
      } catch (e) {
        existingAttachments = [];
      }
    }

    // 새 파일 저장 (선택적, 여러 개) - Vercel Blob Storage 사용
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

    // 첨부 파일 병합 (기존 + 새 파일)
    const allAttachments = [...existingAttachments, ...savedFiles];

    // 안내문 수정
    const updateData: any = {
      title: validatedData.title,
      category: validatedData.category || null,
      content: validatedData.content,
      audience: validatedData.audience,
      author: validatedData.author,
      isScheduled: validatedData.isScheduled,
      publishAt: validatedData.publishAt ? new Date(validatedData.publishAt) : null,
      selectedClasses: validatedData.selectedClasses ? JSON.stringify(validatedData.selectedClasses) : null,
      parentSelectedClasses: validatedData.parentSelectedClasses ? JSON.stringify(validatedData.parentSelectedClasses) : null,
      surveyData: validatedData.surveyData ? JSON.stringify(validatedData.surveyData) : null,
      consentData: validatedData.consentData ? JSON.stringify(validatedData.consentData) : null,
      attachments: allAttachments.length > 0 ? JSON.stringify(allAttachments) : null,
    };

    // 예약 발행 상태 변경 처리
    if (validatedData.isScheduled) {
      // 예약 발행으로 변경: publishedAt을 null로 설정
      updateData.publishedAt = null;
    } else if (!existingAnnouncement.publishedAt) {
      // 예약에서 즉시 발행으로 변경: publishedAt을 현재 시간으로 설정
      updateData.publishedAt = new Date();
    }
    // 이미 발행된 안내문은 publishedAt을 변경하지 않음

    const announcement = await (prisma as any).announcement.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      message: validatedData.isScheduled
        ? "안내문이 수정되고 예약되었습니다."
        : "안내문이 수정되었습니다.",
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
      { error: "안내문 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 안내문 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "안내문 삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 기존 안내문 조회
    const existingAnnouncement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { error: "안내문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 작성자 확인 (본인이 작성한 안내문만 삭제 가능)
    if (existingAnnouncement.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "본인이 작성한 안내문만 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    // 학교 필터 확인
    if (session.user.school && existingAnnouncement.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 안내문 삭제
    await (prisma as any).announcement.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: "안내문이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Delete announcement error:", error);
    return NextResponse.json(
      { error: "안내문 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

