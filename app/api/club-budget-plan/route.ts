import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/haansofthwp",
  "application/x-hwp",
  "application/vnd.hancom.hwp",
  "application/vnd.hancom.hwpx",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

async function getSchool(session: { user?: { id?: string; school?: string | null } }) {
  const school = session.user?.school;
  if (school) return school;
  const userId = session.user?.id;
  if (!userId) return null;
  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: {
      school: true,
      teacherProfile: { select: { school: true } },
      studentProfile: { select: { school: true } },
    },
  });
  return (
    user?.school ??
    user?.teacherProfile?.school ??
    user?.studentProfile?.school ??
    null
  );
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const school = await getSchool(session);
    if (!school) {
      return NextResponse.json({ files: [] });
    }

    const files = await (prisma as any).clubBudgetPlanFile.findMany({
      where: { school },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Club budget plan list error:", error);
    return NextResponse.json(
      { error: "동아리 예산 사용 계획서 목록을 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const school = await getSchool(session);
    if (!school) {
      return NextResponse.json({ error: "학교 정보가 없습니다." }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !file.size) {
      return NextResponse.json({ error: "파일을 선택해주세요." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 20MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    const mime = file.type || "";
    const allowed = ALLOWED_TYPES.some(
      (t) => mime.startsWith(t.split("/")[0]) || mime === t
    );
    if (!allowed && !ALLOWED_TYPES.includes(mime)) {
      const ext = (file.name || "").split(".").pop()?.toLowerCase();
      const allowedExts = [
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "hwp",
        "hwpx",
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
      ];
      if (!ext || !allowedExts.includes(ext)) {
        return NextResponse.json(
          {
            error:
              "PDF, Word, Excel, 한글(HWP/HWPX), 이미지 파일만 업로드할 수 있습니다.",
          },
          { status: 400 }
        );
      }
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = (file.name || "bin").split(".").pop() || "bin";
    const filename = `club-budget-plan/${school.replace(
      /[^a-zA-Z0-9가-힣_-]/g,
      "_"
    )}/${timestamp}-${randomStr}.${ext}`;

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });

    const record = await (prisma as any).clubBudgetPlanFile.create({
      data: {
        school,
        filePath: blob.url,
        originalFileName: file.name || "파일",
        fileSize: file.size,
        mimeType: file.type || null,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json({
      file: {
        id: record.id,
        filePath: record.filePath,
        originalFileName: record.originalFileName,
        createdAt: record.createdAt,
      },
    });
  } catch (error) {
    console.error("Club budget plan upload error:", error);
    return NextResponse.json(
      { error: "파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
