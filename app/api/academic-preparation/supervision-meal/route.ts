import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toDateStr(d: Date): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

const patchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다."),
  eveningSupervision: z.array(z.string().trim()).optional(),
  mealGuidance: z.array(z.string().trim()).optional(),
  remarks: z.string().trim().optional().nullable(),
});

export const dynamic = "force-dynamic";

// 해당 월의 급식지도/야자감독 일정 조회
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
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const schedules = await (prisma as any).supervisionMealSchedule.findMany({
      where: {
        school,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
    });

    const toArray = (v: unknown): string[] => {
      if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
      if (typeof v === "string" && v) return [v];
      return [];
    };

    const items = (schedules || []).map((s: any) => ({
      id: s.id,
      date: s.date ? toDateStr(s.date) : "",
      eveningSupervision: toArray(s.eveningSupervision),
      mealGuidance: toArray(s.mealGuidance),
      remarks: s.remarks ?? null,
    }));

    return NextResponse.json({ schedules: items });
  } catch (error: any) {
    console.error("Error fetching supervision meal schedules:", error);
    return NextResponse.json(
      { error: "급식지도/야자감독 일정을 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

// 일정 저장 (upsert)
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = patchSchema.parse(body);

    const dateObj = new Date(validatedData.date + "T00:00:00.000Z");

    const eveningArr = validatedData.eveningSupervision ?? [];
    const mealArr = validatedData.mealGuidance ?? [];

    const upserted = await (prisma as any).supervisionMealSchedule.upsert({
      where: {
        school_date: {
          school,
          date: dateObj,
        },
      },
      create: {
        school,
        date: dateObj,
        eveningSupervision: eveningArr,
        mealGuidance: mealArr,
        remarks: validatedData.remarks !== undefined
          ? ((validatedData.remarks ?? "").trim() || null)
          : null,
      },
      update: {
        eveningSupervision: eveningArr,
        mealGuidance: mealArr,
        remarks: validatedData.remarks !== undefined
          ? ((validatedData.remarks ?? "").trim() || null)
          : undefined,
      },
    });

    return NextResponse.json({
      schedule: {
        id: upserted.id,
        date: upserted.date ? toDateStr(upserted.date) : undefined,
        eveningSupervision: Array.isArray(upserted.eveningSupervision) ? upserted.eveningSupervision : [],
        mealGuidance: Array.isArray(upserted.mealGuidance) ? upserted.mealGuidance : [],
        remarks: upserted.remarks,
      },
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: error.errors[0]?.message || "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }
    console.error("Error saving supervision meal schedule:", error);
    return NextResponse.json(
      { error: "저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
