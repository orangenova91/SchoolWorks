import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  eveningCount: z.number().int().min(1).max(5),
  mealCount: z.number().int().min(1).max(5),
});

export const dynamic = "force-dynamic";

// 해당 월의 슬롯 설정 조회
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

    const config = await (prisma as any).supervisionMealConfig.findUnique({
      where: { school_year_month: { school, year, month } },
    });

    return NextResponse.json({
      eveningCount: config?.eveningCount ?? 1,
      mealCount: config?.mealCount ?? 1,
    });
  } catch (error: any) {
    console.error("Error fetching supervision meal config:", error);
    return NextResponse.json(
      { error: "설정을 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

// 슬롯 설정 저장 (upsert)
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

    const upserted = await (prisma as any).supervisionMealConfig.upsert({
      where: {
        school_year_month: {
          school,
          year: validatedData.year,
          month: validatedData.month,
        },
      },
      create: {
        school,
        year: validatedData.year,
        month: validatedData.month,
        eveningCount: validatedData.eveningCount,
        mealCount: validatedData.mealCount,
      },
      update: {
        eveningCount: validatedData.eveningCount,
        mealCount: validatedData.mealCount,
      },
    });

    return NextResponse.json({
      eveningCount: upserted.eveningCount,
      mealCount: upserted.mealCount,
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: error.errors[0]?.message || "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }
    console.error("Error saving supervision meal config:", error);
    return NextResponse.json(
      { error: "설정 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
