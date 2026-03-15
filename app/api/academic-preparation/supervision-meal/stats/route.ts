import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** 년간 누적 급식지도/야자감독 통계 조회 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const school = session.user.school;
    if (!school) {
      return NextResponse.json({ error: "학교 정보가 없습니다." }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
    if (Number.isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "유효한 연도를 입력해 주세요." }, { status: 400 });
    }

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const schedules = await (prisma as any).supervisionMealSchedule.findMany({
      where: {
        school,
        date: { gte: startDate, lte: endDate },
      },
      select: { mealGuidance: true, eveningSupervision: true },
    });

    const meal: Record<string, number> = {};
    const evening: Record<string, number> = {};

    const toArray = (v: unknown): string[] => {
      if (Array.isArray(v)) return v.filter((x) => typeof x === "string" && String(x).trim());
      if (typeof v === "string" && v.trim()) return [v.trim()];
      return [];
    };

    for (const s of schedules || []) {
      for (const name of toArray(s.mealGuidance)) {
        meal[name] = (meal[name] ?? 0) + 1;
      }
      for (const name of toArray(s.eveningSupervision)) {
        evening[name] = (evening[name] ?? 0) + 1;
      }
    }

    return NextResponse.json({ year, meal, evening });
  } catch (error: unknown) {
    console.error("Error fetching supervision meal stats:", error);
    return NextResponse.json(
      { error: "통계를 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
