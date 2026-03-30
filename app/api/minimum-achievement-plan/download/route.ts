import archiver from "archiver";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Readable, PassThrough } from "node:stream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  return (
    user?.school ??
    user?.teacherProfile?.school ??
    user?.studentProfile?.school ??
    null
  );
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const grade = (searchParams.get("grade") || "").trim();
    if (!["1", "2", "3"].includes(grade)) {
      return NextResponse.json(
        { error: "학년(1, 2, 3)을 지정해주세요." },
        { status: 400 }
      );
    }
    const semesterParam = (searchParams.get("semester") || "1").trim();
    const semester = ["1", "2"].includes(semesterParam) ? semesterParam : "1";

    const files = await (prisma as any).minimumAchievementPlanFile.findMany({
      where: { school, grade, semester },
      orderBy: { createdAt: "desc" },
    });

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "다운로드할 파일이 없습니다." }, { status: 404 });
    }

    const zipName = `최소성취수준보장_계획서_${semester}학기_${grade}학년.zip`;

    const passthrough = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      console.error("ZIP archive error:", err);
      passthrough.destroy(err);
    });

    archive.pipe(passthrough);

    const webStream = Readable.toWeb(passthrough) as unknown as ReadableStream;
    void (async () => {
      try {
        const usedNames = new Map<string, number>();
        let appendedCount = 0;

        for (const f of files) {
          const url = String(f.filePath || "");
          if (!url) continue;

          let baseName = sanitizeFileName(String(f.originalFileName || "file"));
          const count = usedNames.get(baseName) ?? 0;
          usedNames.set(baseName, count + 1);
          if (count > 0) {
            const dot = baseName.lastIndexOf(".");
            if (dot > 0) {
              baseName = `${baseName.slice(0, dot)} (${count + 1})${baseName.slice(dot)}`;
            } else {
              baseName = `${baseName} (${count + 1})`;
            }
          }

          const resp = await fetch(url);
          if (!resp.ok || !resp.body) {
            console.warn("Skipping file (fetch failed):", { url, status: resp.status });
            continue;
          }

          const nodeStream = Readable.fromWeb(resp.body as any);
          archive.append(nodeStream, { name: baseName });
          appendedCount += 1;
        }

        if (appendedCount === 0) {
          throw new Error("No downloadable files could be fetched for ZIP.");
        }

        await archive.finalize();
      } catch (err) {
        console.error("Minimum achievement plan ZIP stream error:", err);
        passthrough.destroy(err as Error);
      }
    })();

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": encodeContentDisposition(zipName),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Minimum achievement plan ZIP download error:", error);
    return NextResponse.json(
      { error: "ZIP 다운로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

