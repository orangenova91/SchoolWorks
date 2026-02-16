import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function findByKey(key: string) {
  return await (prisma as any).periodSetting.findUnique({ where: { key } });
}

export async function GET(_req: NextRequest, { params }: { params: { key: string } }) {
  try {
    const { key } = params;
    const rec = await findByKey(key);
    return NextResponse.json({ period: rec ?? null });
  } catch (err) {
    console.error("GET period error:", err);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { key: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const { key } = params;
    if (!["teacher", "admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { start, end } = body as { start?: string | null; end?: string | null };
    if (start && end && new Date(end) < new Date(start)) {
      return NextResponse.json({ error: "종료일은 시작일 이후여야 합니다." }, { status: 400 });
    }

    const existing = await findByKey(key);
    if (existing) {
      const updated = await (prisma as any).periodSetting.update({
        where: { key },
        data: { start: start ? new Date(start) : null, end: end ? new Date(end) : null, updatedBy: session.user.id },
      });
      return NextResponse.json({ period: updated });
    } else {
      const created = await (prisma as any).periodSetting.create({
        data: { key, start: start ? new Date(start) : null, end: end ? new Date(end) : null, updatedBy: session.user.id },
      });
      return NextResponse.json({ period: created });
    }
  } catch (err) {
    console.error("PUT period error:", err);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}


