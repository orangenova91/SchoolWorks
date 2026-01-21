import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { put } from '@vercel/blob';

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createAssignmentSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요").max(200, "제목은 200자 이하여야 합니다"),
  description: z.string().trim().max(5000, "설명은 5000자 이하여야 합니다").optional(),
  dueDate: z.string().optional(), // ISO string
});

// 파일 업로드 허용 확장자
const ALLOWED_EXTENSIONS = [
  ".ppt", ".pptx", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".zip",
  ".hwp", ".hwpx", // 한글 파일
  ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", // 이미지 파일
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "수업 자료 생성 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 수업 소유권 확인
    const course = await (prisma as unknown as {
      course: {
        findFirst: (args: {
          where: { id: string; teacherId: string };
        }) => Promise<{ id: string } | null>;
      };
    }).course.findFirst({
      where: {
        id: params.courseId,
        teacherId: session.user.id,
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "수업을 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || null;
    const dueDateStr = formData.get("dueDate") as string | null;
    // 멀티 파일 지원: files[], file(백워드 호환)
    const filesFromArrayRaw = formData.getAll("files");
    const filesFromArray = filesFromArrayRaw.filter((v): v is File => typeof v !== "string" && v instanceof File);
    const singleRaw = formData.get("file");
    const singleFile = typeof singleRaw !== "string" && singleRaw instanceof File ? singleRaw : null;
    const files: File[] = filesFromArray.length > 0 ? filesFromArray : (singleFile ? [singleFile] : []);

    // 데이터 검증
    const validatedData = createAssignmentSchema.parse({
      title,
      description: description || undefined,
      dueDate: dueDateStr || undefined,
    });

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
        const filename = `assignments/${timestamp}-${randomStr}.${extension}`;

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

    // 과제 생성
    const assignment = await (prisma as unknown as {
      assignment: {
        create: (args: {
          data: {
            title: string;
            description: string | null;
            dueDate: Date | null;
            courseId: string;
            teacherId: string;
          };
        }) => Promise<{
          id: string;
          title: string;
          description: string | null;
          createdAt: Date;
          dueDate: Date | null;
        }>;
      };
    }).assignment.create({
      data: {
        title: validatedData.title,
        description: validatedData.description || null,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        courseId: params.courseId,
        teacherId: session.user.id,
      },
    });

    // 첨부파일 레코드 생성
    if (savedFiles.length > 0) {
      await (prisma as unknown as {
        assignmentAttachment: {
          createMany: (args: {
            data: Array<{
              assignmentId: string;
              filePath: string;
              originalFileName: string;
              fileSize: number | null;
              mimeType: string | null;
            }>;
          }) => Promise<{ count: number }>;
        };
      }).assignmentAttachment.createMany({
        data: savedFiles.map((sf) => ({
          assignmentId: assignment.id,
          filePath: sf.filePath,
          originalFileName: sf.originalFileName,
          fileSize: sf.fileSize,
          mimeType: sf.mimeType,
        })),
      });
    }

    return NextResponse.json(
      {
        message: "수업 자료가 생성되었습니다.",
        assignment: {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          attachments: savedFiles,
          viewCount: 0,
          createdAt: assignment.createdAt.toISOString(),
          dueDate: assignment.dueDate?.toISOString() || null,
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

    console.error("Create assignment error:", error);
    return NextResponse.json(
      { error: "수업 자료 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 수업 소유권 확인 (교사만)
    const course = await (prisma as unknown as {
      course: {
        findFirst: (args: {
          where: { id: string; teacherId?: string };
        }) => Promise<{ id: string } | null>;
      };
    }).course.findFirst({
      where: {
        id: params.courseId,
        ...(session.user?.role === "teacher" ? { teacherId: session.user.id } : {}),
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "수업을 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    const assignments = await (prisma as unknown as {
      assignment: {
        findMany: (args: {
          where: { courseId: string };
          orderBy: { createdAt: "desc" };
          include?: { attachments: true };
        }) => Promise<
          Array<{
            id: string;
            title: string;
            description: string | null;
            dueDate: Date | null;
            createdAt: Date;
            updatedAt: Date;
            attachments?: Array<{
              id: string;
              filePath: string;
              originalFileName: string;
              fileSize: number | null;
              mimeType: string | null;
            }>;
          }>
        >;
      };
    }).assignment.findMany({
      where: { courseId: params.courseId },
      orderBy: { createdAt: "desc" },
      include: { attachments: true } as any,
    });

    return NextResponse.json({
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        attachments: (a as any).attachments?.map((att: any) => ({
          id: att.id,
          filePath: att.filePath,
          originalFileName: att.originalFileName,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
        })) ?? [],
        viewCount: (a as any).viewCount ?? 0,
        dueDate: a.dueDate?.toISOString() || null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get assignments error:", error);
    return NextResponse.json(
      { error: "수업 자료 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

