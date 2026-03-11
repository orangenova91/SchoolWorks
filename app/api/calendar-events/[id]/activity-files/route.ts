import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = [
  ".ppt", ".pptx", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".zip",
  ".hwp", ".hwpx",
  ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

async function checkEventPermission(
  eventId: string,
  userId: string,
  userRole?: string | null,
  userSchool?: string | null
) {
  const event = await (prisma as any).calendarEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return {
      ok: false as const,
      error: "일정을 찾을 수 없습니다.",
      status: 404 as const,
    };
  }

  // 창의적 체험활동인 경우: 동일 학교의 교사는 모두 허용
  if (event.scheduleArea === "창의적 체험활동" && userRole === "teacher") {
    if (event.school && userSchool && event.school === userSchool) {
      return { ok: true as const, event };
    }
  }

  const allowed =
    event.createdBy === userId ||
    (event.scope === "personal" && event.teacherId === userId);
  if (!allowed) {
    return {
      ok: false as const,
      error: "이 일정을 수정할 권한이 없습니다.",
      status: 403 as const,
    };
  }

  return { ok: true as const, event };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json(
        { error: "활동 자료 파일을 업로드할 권한이 없습니다." },
        { status: 403 }
      );
    }

    const eventId = params.id;
    const perm = await checkEventPermission(
      eventId,
      session.user.id,
      session.user.role,
      session.user.school
    );

    if (!perm.ok) {
      return NextResponse.json(
        { error: perm.error },
        { status: perm.status }
      );
    }

    const formData = await request.formData();
    const filesFromArrayRaw = formData.getAll("files");
    const filesFromArray = filesFromArrayRaw.filter(
      (v): v is File => typeof v !== "string" && v instanceof File
    );
    const singleRaw = formData.get("file");
    const singleFile =
      typeof singleRaw !== "string" && singleRaw instanceof File
        ? singleRaw
        : null;
    const files: File[] =
      filesFromArray.length > 0
        ? filesFromArray
        : singleFile
        ? [singleFile]
        : [];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "업로드할 파일이 없습니다." },
        { status: 400 }
      );
    }

    // 기존 첨부파일 로드
    let existing: Array<{
      filePath: string;
      originalFileName: string;
      fileSize: number | null;
      mimeType: string | null;
    }> = [];
    if (perm.event.activityAttachments) {
      try {
        const parsed =
          typeof perm.event.activityAttachments === "string"
            ? JSON.parse(perm.event.activityAttachments)
            : perm.event.activityAttachments;
        if (Array.isArray(parsed)) {
          existing = parsed;
        }
      } catch {
        existing = [];
      }
    }

    const savedFiles: Array<{
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
          {
            error: `허용되지 않는 파일 형식입니다. 허용 형식: ${ALLOWED_EXTENSIONS.join(
              ", "
            )}`,
          },
          { status: 400 }
        );
      }
      if (f.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `파일 크기는 ${
              MAX_FILE_SIZE / 1024 / 1024
            }MB 이하여야 합니다.`,
          },
          { status: 400 }
        );
      }

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const extension = f.name.split(".").pop() || "bin";
      const filename = `calendar-activities/${timestamp}-${randomStr}.${extension}`;

      const blob = await put(filename, f, {
        access: "public",
        contentType: f.type || "application/octet-stream",
      });

      savedFiles.push({
        filePath: blob.url,
        originalFileName: f.name,
        fileSize: f.size || null,
        mimeType: f.type || "application/octet-stream",
      });
    }

    const allFiles = [...existing, ...savedFiles];

    await (prisma as any).calendarEvent.update({
      where: { id: eventId },
      data: {
        activityAttachments:
          allFiles.length > 0 ? JSON.stringify(allFiles) : null,
      },
    });

    return NextResponse.json(
      {
        message: "활동 자료 파일이 업로드되었습니다.",
        attachments: allFiles,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload activity files error:", error);
    return NextResponse.json(
      { error: "활동 자료 파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

