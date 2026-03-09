import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_DOMAINS = [
  "blob.vercel-storage.com",
  "public.blob.vercel-storage.com",
  ".blob.vercel-storage.com",
];

const isAllowedUrl = (urlStr: string): boolean => {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    return (
      ALLOWED_DOMAINS.some((d) => host === d || host.endsWith(d)) ||
      host === "localhost" ||
      host.endsWith(".vercel.app")
    );
  } catch {
    return false;
  }
};

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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    const filename = searchParams.get("filename") || "download";

    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return NextResponse.json({ error: "유효한 URL이 필요합니다." }, { status: 400 });
    }

    if (!isAllowedUrl(url)) {
      return NextResponse.json({ error: "허용되지 않은 다운로드 URL입니다." }, { status: 403 });
    }

    const resp = await fetch(url, {
      headers: {
        "User-Agent": request.headers.get("user-agent") || "Download-Proxy",
      },
    });

    if (!resp.ok || !resp.body) {
      return NextResponse.json(
        { error: "파일을 가져오지 못했습니다." },
        { status: resp.status >= 400 ? resp.status : 502 }
      );
    }

    const contentType = resp.headers.get("content-type") || "application/octet-stream";
    const contentLength = resp.headers.get("content-length") || undefined;
    const decodedFilename = decodeURIComponent(filename || "download");
    const safeFilename = sanitizeFileName(decodedFilename) || "file";

    return new NextResponse(resp.body as any, {
      headers: {
        "Content-Type": contentType,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
        "Content-Disposition": encodeContentDisposition(safeFilename),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Download proxy error:", error);
    return NextResponse.json(
      { error: "다운로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
