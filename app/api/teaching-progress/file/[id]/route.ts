import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const sanitizeFileName = (name: string) => {
  const trimmed = (name || "file").trim();
  const safe = trimmed.replace(/[\/\\\u0000-\u001F\u007F]+/g, "_");
  return safe.length > 0 ? safe : "file";
};

const encodeContentDisposition = (fileName: string) => {
  const safeName = sanitizeFileName(fileName).replace(/[\r\n"]/g, "_");
  const asciiFallback = safeName.replace(/[^\x20-\x7E]+/g, "_");
  const utf8 = encodeURIComponent(safeName);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8}`;
};

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
  return user?.school ?? user?.teacherProfile?.school ?? user?.studentProfile?.school ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "파일 ID가 필요합니다." }, { status: 400 });
    }

    const file = await (prisma as any).teachingProgressFile.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
    }

    if (file.school !== school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const url = String(file.filePath || "");
    if (!url) {
      return NextResponse.json({ error: "파일 경로가 없습니다." }, { status: 400 });
    }

    const resp = await fetch(url);
    if (!resp.ok || !resp.body) {
      return NextResponse.json({ error: "원본 파일을 가져오지 못했습니다." }, { status: 502 });
    }

    const contentType = resp.headers.get("content-type") || "application/octet-stream";
    const contentLength = resp.headers.get("content-length") || undefined;
    const originalName = String(file.originalFileName || "파일");

    return new NextResponse(resp.body as any, {
      headers: {
        "Content-Type": contentType,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
        "Content-Disposition": encodeContentDisposition(originalName),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Teaching progress single file download error:", error);
    return NextResponse.json(
      { error: "파일 다운로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

