import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  BANNER_COLUMNS,
  BANNER_DEFAULT_ROWS,
  BANNER_MAX_ROWS,
  BANNER_MAX_SLOTS,
} from "@/lib/bannerConstants";

export const dynamic = "force-dynamic";

const bannerSchema = z.object({
  icon: z.string().optional(),
  title: z.string().optional(),
  url: z.string().optional(),
});

const bannersSchema = z.array(bannerSchema).max(BANNER_MAX_SLOTS);

const saveSchema = z.object({
  banners: bannersSchema,
  rows: z.number().int().min(1).max(BANNER_MAX_ROWS),
});

function defaultBannersList() {
  return Array(BANNER_DEFAULT_ROWS * BANNER_COLUMNS)
    .fill(null)
    .map(() => ({ icon: "", title: "", url: "" }));
}

// GET: 같은 학교의 배너 1개 조회 (교사/관리자 모두 동일 학교면 같은 배너)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const role = session?.user.role;
    const userSchool = session.user.school;

    if (role !== "admin" && role !== "teacher") {
      return NextResponse.json({ banners: [], rows: BANNER_DEFAULT_ROWS });
    }

    if (!userSchool || userSchool.trim() === "") {
      return NextResponse.json({
        banners: defaultBannersList(),
        rows: BANNER_DEFAULT_ROWS,
      });
    }

    const db = prisma as any;
    let schoolBanner = await db.schoolBanner.findUnique({
      where: { school: userSchool },
    });

    if (!schoolBanner) {
      schoolBanner = await db.schoolBanner.create({
        data: {
          school: userSchool,
          banners: JSON.stringify(defaultBannersList()),
          rows: BANNER_DEFAULT_ROWS,
        },
      });
    }

    const banners =
      schoolBanner.banners != null
        ? JSON.parse(schoolBanner.banners)
        : defaultBannersList();
    const rawRows =
      typeof schoolBanner.rows === "number" ? schoolBanner.rows : BANNER_DEFAULT_ROWS;
    const rows =
      rawRows < 1 ? 1 : rawRows > BANNER_MAX_ROWS ? BANNER_MAX_ROWS : rawRows;

    return NextResponse.json({ banners, rows });
  } catch (error) {
    console.error("Get banners error:", error);
    return NextResponse.json(
      { error: "배너 데이터 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PUT: 같은 학교의 배너 업데이트 (교사/관리자 누구나 편집 가능, 학교당 1개 공유)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const role = session?.user.role;
    if (!session || (role !== "teacher" && role !== "admin")) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const userSchool = session.user.school;
    if (!userSchool || userSchool.trim() === "") {
      return NextResponse.json(
        { error: "학교 정보가 없어 배너를 저장할 수 없습니다." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { banners, rows } = saveSchema.parse(body);

    const db = prisma as any;

    const schoolBanner = await db.schoolBanner.upsert({
      where: { school: userSchool },
      update: {
        banners: JSON.stringify(banners),
        rows,
      },
      create: {
        school: userSchool,
        banners: JSON.stringify(banners),
        rows,
      },
    });

    return NextResponse.json({
      message: "배너가 저장되었습니다.",
      banners: JSON.parse(schoolBanner.banners),
      rows: schoolBanner.rows ?? rows,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Update banners error:", error);
    return NextResponse.json(
      { error: "배너 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
