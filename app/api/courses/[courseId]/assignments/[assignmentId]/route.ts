import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { put } from '@vercel/blob';
import { join } from "path";
import { existsSync } from "fs";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateAssignmentSchema = z.object({
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string; assignmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "수업 자료 수정 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 과제 소유권 확인
    const existingAssignment = await (prisma as unknown as {
      assignment: {
        findFirst: (args: {
          where: { id: string; courseId: string; teacherId: string };
        }) => Promise<{
          id: string;
          filePath: string | null;
        } | null>;
      };
    }).assignment.findFirst({
      where: {
        id: params.assignmentId,
        courseId: params.courseId,
        teacherId: session.user.id,
      },
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "수업 자료를 찾을 수 없거나 권한이 없습니다." },
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
    const removeFiles = formData.get("removeFile") === "true";

    // 데이터 검증
    const validatedData = updateAssignmentSchema.parse({
      title,
      description: description || undefined,
      dueDate: dueDateStr || undefined,
    });

    // 기존 단일 파일 필드는 더 이상 사용하지 않지만, 하위 호환을 위해 그대로 둡니다.

    // 기존 파일 삭제 처리
    // 기존 첨부 삭제 옵션: 모든 첨부 삭제
    if (removeFiles) {
      const existingAttachments = await (prisma as any).assignmentAttachment.findMany({
        where: { assignmentId: params.assignmentId },
      });
      for (const att of existingAttachments) {
        // Blob Storage URL인 경우 삭제하지 않음 (로컬 파일만 삭제)
        if (att.filePath && !att.filePath.startsWith('http')) {
          const oldFilePath = join(process.cwd(), "public", att.filePath);
          if (existsSync(oldFilePath)) {
            try {
              const { unlink } = await import("fs/promises");
              await unlink(oldFilePath);
            } catch (err) {
              console.error("Failed to delete old file:", err);
            }
          }
        }
      }
      await (prisma as any).assignmentAttachment.deleteMany({
        where: { assignmentId: params.assignmentId },
      });
    }

    // 새 파일 업로드 처리
    // 새 파일 업로드 처리 (여러 개) - Vercel Blob Storage 사용
    if (files.length > 0) {
      const newAttachments: Array<{
        assignmentId: string;
        filePath: string;
        originalFileName: string;
        fileSize: number | null;
        mimeType: string | null;
      }> = [];
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

        newAttachments.push({
          assignmentId: params.assignmentId,
          filePath: blob.url, // Blob Storage URL
          originalFileName: f.name,
          fileSize: f.size || null,
          mimeType: f.type || "application/octet-stream",
        });
      }
      if (newAttachments.length > 0) {
        await (prisma as any).assignmentAttachment.createMany({
          data: newAttachments,
        });
      }
    }

    // 과제 업데이트
    const updateData: any = {
      title: validatedData.title,
      description: validatedData.description || null,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
    };

    const assignment = await (prisma as unknown as {
      assignment: {
        update: (args: {
          where: { id: string };
          data: any;
        }) => Promise<{
          id: string;
          title: string;
          description: string | null;
          filePath: string | null;
          originalFileName: string | null;
          createdAt: Date;
          dueDate: Date | null;
        }>;
      };
    }).assignment.update({
      where: { id: params.assignmentId },
      data: updateData,
    });

    return NextResponse.json(
      {
        message: "수업 자료가 수정되었습니다.",
        assignment: {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          // 첨부파일 목록은 상세 조회/목록 API에서 제공합니다.
          createdAt: assignment.createdAt.toISOString(),
          dueDate: assignment.dueDate?.toISOString() || null,
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

    console.error("Update assignment error:", error);
      return NextResponse.json(
        { error: "수업 자료 수정 중 오류가 발생했습니다." },
        { status: 500 }
      );
  }
}

// 조회수 증가
export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string; assignmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const assignment = await (prisma as unknown as {
      assignment: {
        findFirst: (args: {
          where: { id: string; courseId: string; teacherId?: string };
          select: { id: true };
        }) => Promise<{ id: string } | null>;
        update: (args: {
          where: { id: string };
          data: { viewCount: { increment: number } };
          select: { viewCount: true };
        }) => Promise<{ viewCount: number }>;
      };
    }).assignment.findFirst({
      where: {
        id: params.assignmentId,
        courseId: params.courseId,
        ...(session.user?.role === "teacher" ? { teacherId: session.user.id } : {}),
      },
      select: { id: true },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "자료를 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    const updated = await (prisma as any).assignment.update({
      where: { id: params.assignmentId },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });

    return NextResponse.json({ viewCount: updated.viewCount });
  } catch (error) {
    console.error("Increment assignment view error:", error);
    return NextResponse.json(
      { error: "조회수 증가 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; assignmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "수업 자료 삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 과제 소유권 확인
    const existingAssignment = await (prisma as unknown as {
      assignment: {
        findFirst: (args: {
          where: { id: string; courseId: string; teacherId: string };
        }) => Promise<{
          id: string;
          filePath: string | null;
        } | null>;
      };
    }).assignment.findFirst({
      where: {
        id: params.assignmentId,
        courseId: params.courseId,
        teacherId: session.user.id,
      },
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "수업 자료를 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    // 파일 삭제 (로컬 파일만, Blob Storage URL은 삭제하지 않음)
    if (existingAssignment.filePath && !existingAssignment.filePath.startsWith('http')) {
      const filePathOnDisk = join(process.cwd(), "public", existingAssignment.filePath);
      if (existsSync(filePathOnDisk)) {
        try {
          const { unlink } = await import("fs/promises");
          await unlink(filePathOnDisk);
        } catch (err) {
          console.error("Failed to delete file:", err);
          // 파일 삭제 실패해도 DB 레코드는 삭제 진행
        }
      }
    }

    // 과제 삭제
    await (prisma as unknown as {
      assignment: {
        delete: (args: {
          where: { id: string };
        }) => Promise<void>;
      };
    }).assignment.delete({
      where: { id: params.assignmentId },
    });

    return NextResponse.json(
      { message: "수업 자료가 삭제되었습니다." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete assignment error:", error);
    return NextResponse.json(
      { error: "수업 자료 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

