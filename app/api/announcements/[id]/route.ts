import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  assertSameSchoolForAnnouncement,
  rejectUnauthenticated,
  requireSession,
} from "@/lib/api-auth";
import { put } from '@vercel/blob';

const AUDIENCE_VALUES = ["all", "grade-1", "grade-2", "grade-3", "parents", "teacher", "students"] as const;
const BOARD_TYPES = [
  "board_test",
  "board_teachers",
  "board_students",
  "board_parents",
  "board_class",
  "board_homeroom",
  "board_after_school",
  "board_work_guide",
  "board_evaluation",
  "board_club",
] as const;

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

const attachmentSchema = z.object({
  filePath: z.string(),
  originalFileName: z.string(),
  fileSize: z.number().nullable().optional(),
  mimeType: z.string().nullable().optional(),
});

const normalizeNumber = (value: string) => value.trim().replace(/^0+/, "");
const parseClassKey = (profile: { grade?: string | null; classLabel?: string | null; section?: string | null; }) => {
  let grade = profile.grade?.trim() || null;
  let classNumber = profile.section?.trim() || null;
  if (!classNumber) {
    const classLabel = profile.classLabel?.trim() || "";
    const match = classLabel.match(/(\d+)\s*[-학년\s]*(\d+)\s*반?/);
    if (match) {
      if (!grade) {
        grade = match[1];
      }
      classNumber = match[2];
    }
  }
  if (grade && classNumber) {
    return `${normalizeNumber(grade)}-${normalizeNumber(classNumber)}`;
  }
  return null;
};

const toClassKey = (item: { grade: string; classNumber: string }) => {
  return `${normalizeNumber(item.grade)}-${normalizeNumber(item.classNumber)}`;
};

const computeConsentTotals = async (
  school: string | null | undefined,
  selectedClasses?: Array<{ grade: string; classNumber: string }>,
  parentSelectedClasses?: Array<{ grade: string; classNumber: string }>
) => {
  const studentTargetKeys = new Set(
    Array.isArray(selectedClasses) ? selectedClasses.map(toClassKey) : []
  );
  const parentTargetKeys = new Set(
    Array.isArray(parentSelectedClasses) ? parentSelectedClasses.map(toClassKey) : []
  );

  const allStudentProfiles = await prisma.studentProfile.findMany({
    where: school ? { school } : undefined,
    select: { userId: true, grade: true, classLabel: true, section: true },
  });

  const studentTargetsSet = new Set(
    allStudentProfiles
      .filter((profile) => {
        if (studentTargetKeys.size === 0) return false;
        const key = parseClassKey(profile);
        return key ? studentTargetKeys.has(key) : false;
      })
      .map((profile) => profile.userId)
  );

  const parentTargetsSet = new Set(
    allStudentProfiles
      .filter((profile) => {
        if (parentTargetKeys.size === 0) return false;
        const key = parseClassKey(profile);
        return key ? parentTargetKeys.has(key) : false;
      })
      .map((profile) => profile.userId)
  );

  const totalStudents = studentTargetsSet.size;
  const parentTargetStudentIds = Array.from(parentTargetsSet);
  const totalParents =
    parentTargetStudentIds.length === 0
      ? 0
      : await (prisma as any).user.count({
          where: {
            role: "parent",
            ...(school ? { school } : {}),
            parentProfile: {
              studentIds: { hasSome: parentTargetStudentIds },
            },
          },
        });

  return { totalStudents, totalParents };
};

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
  boardType: z.enum(BOARD_TYPES).optional(),
  audience: z.enum(AUDIENCE_VALUES),
  author: z.string().trim().min(1, "작성자를 입력하세요"),
  isScheduled: z.boolean().default(false),
  publishAt: z.string().datetime().optional(),
  selectedClassGroupIds: z.array(z.string()).optional(),
  selectedClasses: z.array(selectedClassSchema).optional(),
  parentSelectedClasses: z.array(selectedClassSchema).optional(),
  surveyData: z.array(surveyQuestionSchema).optional(),
  surveyStartDate: z.string().datetime().optional(),
  surveyEndDate: z.string().datetime().optional(),
  consentData: consentDataSchema.optional(),
  editableBy: z.array(z.string()).optional(),
  /** 수정 시 유지할 기존 첨부 목록 (개별 삭제 시 클라이언트에서 전달) */
  attachments: z.array(attachmentSchema).optional(),
});

export const dynamic = 'force-dynamic';

// 개별 안내문 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!requireSession(session)) {
      return rejectUnauthenticated();
    }

    const announcement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
    });

    if (!announcement) {
      return NextResponse.json({ error: "안내문을 찾을 수 없습니다." }, { status: 404 });
    }

    const schoolErr = assertSameSchoolForAnnouncement(session, announcement.school);
    if (schoolErr) return schoolErr;

    // 교사만 수정 가능하도록 권한 확인 (조회는 모든 인증된 사용자 가능)
    return NextResponse.json({
      announcement: {
        id: announcement.id,
        title: announcement.title,
        category: announcement.category || null,
        content: announcement.content,
        boardType: announcement.boardType || null,
        audience: announcement.audience,
        author: announcement.author,
        authorId: announcement.authorId,
        isScheduled: announcement.isScheduled,
        publishAt: announcement.publishAt?.toISOString() || null,
        publishedAt: announcement.publishedAt?.toISOString() || null,
        createdAt: announcement.createdAt.toISOString(),
        updatedAt: announcement.updatedAt.toISOString(),
        selectedClassGroupIds: announcement.selectedClassGroupIds || [],
        selectedClasses: announcement.selectedClasses || null,
        parentSelectedClasses: announcement.parentSelectedClasses || null,
        surveyData: announcement.surveyData || null,
        surveyStartDate: announcement.surveyStartDate?.toISOString() || null,
        surveyEndDate: announcement.surveyEndDate?.toISOString() || null,
        consentData: announcement.consentData || null,
        attachments: announcement.attachments || null,
        viewCount: announcement.viewCount || 0,
        editableBy: announcement.editableBy || [],
        lastEditedBy: announcement.lastEditedBy || null,
        lastEditedByName: announcement.lastEditedByName || null,
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

// 조회수 증가
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!requireSession(session)) {
      return rejectUnauthenticated();
    }

    // 안내문 존재 여부 확인
    const existingAnnouncement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { error: "안내문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const patchSchoolErr = assertSameSchoolForAnnouncement(session, existingAnnouncement.school);
    if (patchSchoolErr) return patchSchoolErr;

    // 이미 조회한 이력이 있는지 확인
    const existingView = await (prisma as any).announcementView.findUnique({
      where: {
        announcementId_userId: {
          announcementId: params.id,
          userId: session.user.id,
        },
      },
    });

    // 이미 조회한 경우 조회수 증가하지 않음
    if (existingView) {
      const announcement = await (prisma as any).announcement.findUnique({
        where: { id: params.id },
        select: { viewCount: true },
      });
      
      return NextResponse.json({
        viewCount: announcement?.viewCount || 0,
        alreadyViewed: true,
      });
    }

    // 조회 이력 생성 (upsert 사용으로 중복 방지)
    try {
      await (prisma as any).announcementView.create({
        data: {
          announcementId: params.id,
          userId: session.user.id,
        },
      });

      // 조회수 증가
      const announcement = await (prisma as any).announcement.update({
        where: { id: params.id },
        data: {
          viewCount: { increment: 1 },
        },
        select: { viewCount: true },
      });

      return NextResponse.json({
        viewCount: announcement?.viewCount || 0,
        alreadyViewed: false,
      });
    } catch (createError: any) {
      // unique constraint 에러 - 동시 요청으로 인해 이미 생성된 경우
      if (createError?.code === 'P2002') {
        const announcement = await (prisma as any).announcement.findUnique({
          where: { id: params.id },
          select: { viewCount: true },
        });
        
        return NextResponse.json({
          viewCount: announcement?.viewCount || 0,
          alreadyViewed: true,
        });
      }
      throw createError;
    }
  } catch (error: any) {
    console.error("Increment view count error:", error);
    console.error("Error details:", {
      code: error?.code,
      message: error?.message,
      announcementId: params.id,
      userId: session?.user?.id,
    });

    // unique constraint 에러는 이미 조회한 것으로 처리
    if (error?.code === 'P2002') {
      try {
        const announcement = await (prisma as any).announcement.findUnique({
          where: { id: params.id },
          select: { viewCount: true },
        });
        
        return NextResponse.json({
          viewCount: announcement?.viewCount || 0,
          alreadyViewed: true,
        });
      } catch (fetchError) {
        console.error("Failed to fetch announcement after P2002 error:", fetchError);
      }
    }

    return NextResponse.json(
      { error: "조회수 증가 중 오류가 발생했습니다." },
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

    if (!session.user.school) {
      return NextResponse.json(
        { error: "학교 정보가 필요합니다. 관리자에게 문의하세요." },
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

    const putSchoolErr = assertSameSchoolForAnnouncement(session, existingAnnouncement.school);
    if (putSchoolErr) return putSchoolErr;

    // 작성자 확인 (본인이 작성한 안내문 또는 수정 권한이 있는 경우만 수정 가능)
    const editableBy = existingAnnouncement.editableBy || [];
    if (existingAnnouncement.authorId !== session.user.id && !editableBy.includes(session.user.id)) {
      return NextResponse.json(
        { error: "본인이 작성한 안내문만 수정할 수 있습니다." },
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

    const consentTotals = await computeConsentTotals(
      session.user.school || null,
      validatedData.selectedClasses || [],
      validatedData.parentSelectedClasses || []
    );

    // 기존 첨부 파일: 요청에 유지 목록(attachments)이 있으면 사용, 없으면 DB 값 사용
    let existingAttachments: Array<{
      filePath: string;
      originalFileName: string;
      fileSize: number | null;
      mimeType: string | null;
    }> = [];
    if (Array.isArray(validatedData.attachments)) {
      existingAttachments = validatedData.attachments.map((a) => ({
        filePath: a.filePath,
        originalFileName: a.originalFileName,
        fileSize: a.fileSize ?? null,
        mimeType: a.mimeType ?? null,
      }));
    } else if (existingAnnouncement.attachments) {
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

    // 수정한 사람 정보 확인 (원래 작성자가 아닌 경우에만 저장)
    const isOriginalAuthor = existingAnnouncement.authorId === session.user.id;
    
    // 안내문 수정
    const updateData: any = {
      title: validatedData.title,
      category: validatedData.category || null,
      content: validatedData.content,
      boardType: validatedData.boardType,
      audience: validatedData.audience,
      // author와 authorId는 원래 작성자 정보를 유지하므로 업데이트하지 않음
      // (수정 권한을 받은 사용자가 수정해도 원래 작성자는 변경되지 않음)
      isScheduled: validatedData.isScheduled,
      publishAt: validatedData.publishAt ? new Date(validatedData.publishAt) : null,
      selectedClassGroupIds: validatedData.selectedClassGroupIds || [],
      selectedClasses: validatedData.selectedClasses ? JSON.stringify(validatedData.selectedClasses) : null,
      parentSelectedClasses: validatedData.parentSelectedClasses ? JSON.stringify(validatedData.parentSelectedClasses) : null,
      surveyData: validatedData.surveyData ? JSON.stringify(validatedData.surveyData) : null,
      surveyStartDate: validatedData.surveyStartDate ? new Date(validatedData.surveyStartDate) : null,
      surveyEndDate: validatedData.surveyEndDate ? new Date(validatedData.surveyEndDate) : null,
      consentData: validatedData.consentData ? JSON.stringify(validatedData.consentData) : null,
      consentStats: JSON.stringify({
        totalStudents: consentTotals.totalStudents,
        totalParents: consentTotals.totalParents,
        updatedAt: new Date().toISOString(),
      }),
      attachments: allAttachments.length > 0 ? JSON.stringify(allAttachments) : null,
      editableBy: validatedData.editableBy || [],
    };

    // 원래 작성자가 아닌 경우에만 수정한 사람 정보 저장
    if (!isOriginalAuthor) {
      updateData.lastEditedBy = session.user.id;
      updateData.lastEditedByName = session.user.name || null;
    }

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
        boardType: announcement.boardType || null,
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
  const id = params.id;
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "안내문 삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    if (!session.user.school) {
      return NextResponse.json(
        { error: "학교 정보가 필요합니다. 관리자에게 문의하세요." },
        { status: 403 }
      );
    }

    // 기존 안내문 조회
    const existingAnnouncement = await (prisma as any).announcement.findUnique({
      where: { id },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { error: "안내문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const delSchoolErr = assertSameSchoolForAnnouncement(session, existingAnnouncement.school);
    if (delSchoolErr) return delSchoolErr;

    // 작성자 확인 (본인이 작성한 안내문만 삭제 가능)
    if (existingAnnouncement.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "본인이 작성한 안내문만 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    // 연관 데이터를 순서대로 삭제 (Comment는 self-relation이라 리프부터 삭제)
    const p = prisma as any;
    for (;;) {
      const all = await p.comment.findMany({
        where: { announcementId: id },
        select: { id: true },
      });
      if (all.length === 0) break;
      const asParent = await p.comment.findMany({
        where: { announcementId: id, parentId: { not: null } },
        select: { parentId: true },
      });
      const parentIds = new Set(asParent.map((r: { parentId: string | null }) => r.parentId).filter(Boolean));
      const leafIds = all.filter((c: { id: string }) => !parentIds.has(c.id)).map((c: { id: string }) => c.id);
      if (leafIds.length === 0) break;
      await p.comment.deleteMany({
        where: { id: { in: leafIds } },
      });
    }
    await p.announcementView.deleteMany({ where: { announcementId: id } });
    await p.announcementConsent.deleteMany({ where: { announcementId: id } });
    await p.announcementSurveyResponse.deleteMany({ where: { announcementId: id } });

    // 안내문 삭제
    await p.announcement.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "안내문이 삭제되었습니다.",
    });
  } catch (error: any) {
    const message = error?.message ?? "안내문 삭제 중 오류가 발생했습니다.";
    console.error("Delete announcement error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

