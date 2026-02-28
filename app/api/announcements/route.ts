import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from '@vercel/blob';

const AUDIENCE_VALUES = ["all", "grade-1", "grade-2", "grade-3", "parents", "teacher", "students"] as const;
const BOARD_TYPES = [
  "board_test",
  "board_teachers",
  "board_students",
  "board_parents",
  "board_class",
  "board_after_school",
  "board_work_guide",
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

const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요").max(200, "제목은 200자 이하여야 합니다"),
  category: z.string().optional(),
  content: z.string().trim().min(1, "본문을 입력하세요"),
  courseId: z.string().trim().optional(),
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

    const consentTotals = await computeConsentTotals(
      session.user.school || null,
      validatedData.selectedClasses || [],
      validatedData.parentSelectedClasses || []
    );

    // 공지사항 생성
    const announcement = await (prisma as any).announcement.create({
      data: {
        title: validatedData.title,
        category: validatedData.category || null,
        content: validatedData.content,
        courseId: validatedData.courseId || null,
        selectedClassGroupIds: validatedData.selectedClassGroupIds || [],
        boardType: validatedData.boardType || null,
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
        consentStats: JSON.stringify({
          totalStudents: consentTotals.totalStudents,
          totalParents: consentTotals.totalParents,
          updatedAt: new Date().toISOString(),
        }),
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

    // Defensive: require that the session includes a school. If not, return empty list to avoid leaking cross-school data.
    if (!session.user.school) {
      console.warn(`User ${session.user.id} requested announcements but has no school set; returning empty list.`);
      return NextResponse.json({ announcements: [] });
    }

    const { searchParams } = new URL(request.url);
    const audience = searchParams.get("audience");
    const courseId = searchParams.get("courseId");
    const includeScheduled = searchParams.get("includeScheduled") === "true";
    const boardType = searchParams.get("boardType");

    // 예약된 공지사항 중 발행 시간이 지난 항목 자동 발행
    const now = new Date();
    const scheduledAnnouncements = await (prisma as any).announcement.findMany({
      where: {
        isScheduled: true,
        publishAt: { lte: now }, // publishAt이 현재 시간보다 이전이거나 같음
        publishedAt: null, // 아직 발행되지 않음
        ...(courseId ? { courseId } : {}),
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

    // 기본 조회 조건
    const where: any = {};
    let studentGrade: string | null = null;
    let studentClassNumber: string | null = null;
    let parentClassKeys: Set<string> | null = null;
    let studentClassGroupIds: Set<string> | null = null;

    // 발행된 공지사항만 조회 (예약 포함 여부에 따라)
    if (!includeScheduled) {
      where.publishedAt = { not: null };
    }

    if (courseId) {
      where.courseId = courseId;
    }
    // 전역 게시판(강의실 아님)에서는 수업 공지를 제외
    if (!courseId) {
      where.courseId = null;
    }
    if (boardType) {
      where.boardType = boardType;
      // 업무 안내 게시판은 교직원 전용
      if (boardType === "board_work_guide" && session.user.role !== "teacher") {
        return NextResponse.json({ announcements: [] });
      }
    }

    // 학교 필터 (같은 학교의 공지사항만)
    if (session.user.school) {
      where.school = session.user.school;
    }

    if (session.user.role === "student") {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        select: { grade: true, classLabel: true, section: true },
      });
      studentGrade = studentProfile?.grade?.trim() || null;

      const sectionValue = studentProfile?.section?.trim() || null;
      let classNumber = sectionValue || null;
      if (!classNumber) {
        const classLabel = studentProfile?.classLabel?.trim() || "";
        const match = classLabel.match(/(\d+)\s*[-학년\s]*(\d+)\s*반?/);
        if (match) {
          if (!studentGrade) {
            studentGrade = match[1];
          }
          classNumber = match[2];
        }
      }
      studentClassNumber = classNumber ? classNumber.replace(/^0+/, "") : null;
    }

    if (session.user.role === "student" && boardType === "board_class" && courseId) {
      const classGroups = await prisma.classGroup.findMany({
        where: {
          courseId,
          studentIds: { has: session.user.id },
        },
        select: { id: true },
      });
      studentClassGroupIds = new Set(classGroups.map((group) => group.id));
    }
    
    if (session.user.role === "parent" && boardType === "board_parents") {
      const parentProfile = await prisma.parentProfile.findUnique({
        where: { userId: session.user.id },
        select: { studentIds: true },
      });

      if (parentProfile?.studentIds?.length) {
        const studentProfiles = await prisma.studentProfile.findMany({
          where: { userId: { in: parentProfile.studentIds } },
          select: { grade: true, classLabel: true, section: true },
        });

        const normalizeNumber = (value: string) => value.trim().replace(/^0+/, "");
        parentClassKeys = new Set<string>();

        studentProfiles.forEach((profile) => {
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
            parentClassKeys!.add(`${normalizeNumber(grade)}-${normalizeNumber(classNumber)}`);
          }
        });
      }
    }

    // 대상 필터
    if (audience) {
      // 특정 대상으로 필터링하는 경우
      const audienceFilters: Array<{ audience: string }> = [
        { audience: "all" }, // 전체 대상은 항상 포함
        { audience },
      ];
      // 가정 안내문 보드에서는 학년 단위 공지도 포함
      if (boardType === "board_parents" && audience === "parents") {
        audienceFilters.push(
          { audience: "grade-1" },
          { audience: "grade-2" },
          { audience: "grade-3" }
        );
      }
      // 학생 게시판 보드에서는 학년 단위 공지도 포함
      if ((boardType === "board_students" || boardType === "board_after_school") && audience === "students") {
        audienceFilters.push(
          { audience: "grade-1" },
          { audience: "grade-2" },
          { audience: "grade-3" }
        );
      }
      where.OR = audienceFilters;
    } else {
      // 수업 공지(board_class)는 수강생 대상으로 제한
      if (boardType === "board_class" && courseId) {
        where.OR = [{ audience: "students" }];
      } else if (session.user.role === "student") {
        // 학생은 자신의 학년과 전체 대상만 볼 수 있음
        const gradeAudience = studentGrade ? `grade-${studentGrade}` : null;

        where.OR = [
          { audience: "all" },
          { audience: "students" },
          ...(gradeAudience ? [{ audience: gradeAudience }] : []),
        ];
      } else if (session.user.role === "teacher") {
        // 교사는 일반 안내문만 조회 가능 (교직원 게시판 제외)
        // audience="teacher"는 제외하고 나머지만 표시
        where.AND = [
          {
            OR: [
              { audience: "all" },
              { audience: "students" },
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

    // 전체 개수 먼저 가져오기
    const totalCount = await (prisma as any).announcement.count({
      where,
    });

    // 전체 데이터 가져오기 (전체 개수만큼 명시적으로 가져오기)
    let announcements = await (prisma as any).announcement.findMany({
      where,
      orderBy: [
        { createdAt: "desc" },
      ],
      take: totalCount > 0 ? totalCount : undefined, // 전체 개수만큼 가져오기
    });

    let classGroupMap: Map<string, { id: string; name: string; period?: string | null }> | null = null;
    if (courseId && boardType === "board_class") {
      const classGroups = await prisma.classGroup.findMany({
        where: { courseId },
        select: { id: true, name: true, period: true },
      });
      classGroupMap = new Map(classGroups.map((group) => [group.id, group]));
    }

    // 학생 게시판 또는 방과후 전용 게시판에서만 학반 단위 필터링 (selectedClasses가 있는 경우에만 적용)
    if (session.user.role === "student" && (boardType === "board_students" || boardType === "board_after_school")) {
      const normalizeNumber = (value: string) => value.trim().replace(/^0+/, "");
      announcements = announcements.filter((announcement: any) => {
        // If selectedClasses is missing -> treat as "all students" (include)
        if (!announcement.selectedClasses) {
          console.log(
            `Announcement ${announcement.id} has no selectedClasses -> treating as all students`
          );
          return true;
        }

        if (!studentGrade || !studentClassNumber) {
          console.log(
            `Student grade/class unknown for user ${session.user.id} -> excluding announcement ${announcement.id}`
          );
          return false;
        }

        try {
          const selected = JSON.parse(announcement.selectedClasses) as Array<{
            grade: string;
            classNumber: string;
          }>;

          // If parsed value is not an array or empty -> treat as "all students"
          if (!Array.isArray(selected) || selected.length === 0) {
            console.log(
              `Announcement ${announcement.id} selectedClasses empty or invalid -> treating as all students`
            );
            return true;
          }

          const matches = selected.some((cls) =>
            normalizeNumber(cls.grade) === normalizeNumber(studentGrade) &&
            normalizeNumber(cls.classNumber) === normalizeNumber(studentClassNumber)
          );

          if (!matches) {
            console.log(
              `Announcement ${announcement.id} excluded for student ${session.user.id} (grade ${studentGrade} class ${studentClassNumber})`
            );
          }

          return matches;
        } catch (error) {
          console.error(
            `Error parsing selectedClasses for announcement ${announcement.id}:`,
            error
          );
          // Be permissive on parse error to avoid accidentally hiding notices: include for all students
          return true;
        }
      });
    }

    if (session.user.role === "student" && boardType === "board_class" && courseId) {
      announcements = announcements.filter((announcement: any) => {
        const selectedIds = Array.isArray(announcement.selectedClassGroupIds)
          ? announcement.selectedClassGroupIds
          : [];
        if (selectedIds.length === 0) return true;
        if (!studentClassGroupIds || studentClassGroupIds.size === 0) return false;
        return selectedIds.some((id: string) => studentClassGroupIds!.has(id));
      });
    }

    if (session.user.role === "parent" && boardType === "board_parents" && parentClassKeys?.size) {
      const normalizeNumber = (value: string) => value.trim().replace(/^0+/, "");
      announcements = announcements.filter((announcement: any) => {
        if (!announcement.parentSelectedClasses) return true;
        try {
          const selected = JSON.parse(announcement.parentSelectedClasses) as Array<{
            grade: string;
            classNumber: string;
          }>;
          if (!Array.isArray(selected) || selected.length === 0) return false;
          return selected.some((cls) =>
            parentClassKeys!.has(
              `${normalizeNumber(cls.grade)}-${normalizeNumber(cls.classNumber)}`
            )
          );
        } catch (error) {
          console.error("Error parsing parentSelectedClasses:", error);
          return false;
        }
      });
    }

    // 클라이언트 측에서 정렬: publishedAt 우선, 없으면 publishAt, 없으면 createdAt
    announcements.sort((a: any, b: any) => {
      const aDate = a.publishedAt || a.publishAt || a.createdAt;
      const bDate = b.publishedAt || b.publishAt || b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    console.log(`Found ${announcements.length} announcements for user ${session.user.role}`, {
      includeScheduled,
      audience,
      boardType,
      school: session.user.school,
      where,
    });

    return NextResponse.json({
      announcements: announcements.map((a: any) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        boardType: a.boardType || null,
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
        selectedClassGroupIds: a.selectedClassGroupIds || [],
        selectedClassGroups: classGroupMap
          ? (a.selectedClassGroupIds || [])
              .map((id: string) => classGroupMap!.get(id))
              .filter(Boolean)
          : [],
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
        school: a.school || null,
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


