import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

// 허용할 최대 배너 줄 수 및 개수 (프론트 편집 UI와 맞춰야 함)
const MAX_ROWS = 4;
const COLUMNS = 7;
const MAX_BANNERS = MAX_ROWS * COLUMNS;
const DEFAULT_ROWS = 3;

const bannerSchema = z.object({
  icon: z.string().optional(),
  title: z.string().optional(),
  url: z.string().optional(),
});

// 길이를 고정하지 않고, 최대 개수만 제한
const bannersSchema = z.array(bannerSchema).max(MAX_BANNERS);

const saveSchema = z.object({
  banners: bannersSchema,
  rows: z.number().int().min(1).max(MAX_ROWS),
});

// GET: 현재 사용자의 배너 목록 조회 (같은 학교의 관리자 배너 표시)
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
    const teacherId = session.user.id;

    // 헬퍼: 빈 배너 여부 판단
    const isEmptyBannerList = (banners: any[]) =>
      Array.isArray(banners) &&
      banners.every(
        (b) =>
          (!b?.icon || b.icon.trim() === "") &&
          (!b?.title || b.title.trim() === "") &&
          (!b?.url || b.url.trim() === "")
      );

    // Prisma Mongo 클라이언트 타입에 없는 모델이므로 any 캐스팅
    const db = prisma as any;

    // 1순위: 본인 배너 (admin/teacher만)
    let teacherBanner = null;
    let parsed = null;
    
    if (role === "admin" || role === "teacher") {
      teacherBanner = await db.teacherBanner.findUnique({
        where: { teacherId },
      });
      parsed = teacherBanner ? JSON.parse(teacherBanner.banners) : null;
    }

    // 2순위: 본인 배너가 없거나 비어있으면 같은 학교의 관리자 최신 배너 fallback
    if ((!teacherBanner || isEmptyBannerList(parsed)) && userSchool) {
      const adminBanner = await db.teacherBanner.findFirst({
        where: {
          user: {
            role: "admin",
            school: userSchool, // 같은 학교의 관리자만
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (adminBanner) {
        teacherBanner = adminBanner;
        parsed = JSON.parse(adminBanner.banners);
      }
    }

    // 없으면 기본값 생성 (admin/teacher만 본인 소유로 생성)
    if (!teacherBanner && (role === "admin" || role === "teacher")) {
      const defaultBanners = Array(21)
        .fill(null)
        .map(() => ({
          icon: "",
          title: "",
          url: "",
        }));

      teacherBanner = await db.teacherBanner.create({
        data: {
          teacherId,
          banners: JSON.stringify(defaultBanners),
          rows: DEFAULT_ROWS,
        },
      });

      parsed = defaultBanners;
    }

    // 배너가 없으면 기본값 또는 빈 배열 반환
    const banners =
      parsed ??
      (teacherBanner
        ? JSON.parse(teacherBanner.banners)
        : Array(21)
            .fill(null)
            .map(() => ({ icon: "", title: "", url: "" })));

    const rawRows =
      teacherBanner && typeof (teacherBanner as any).rows === "number"
        ? (teacherBanner as any).rows
        : DEFAULT_ROWS;
    const rows =
      rawRows < 1 ? 1 : rawRows > MAX_ROWS ? MAX_ROWS : rawRows;

    return NextResponse.json({ banners, rows });
  } catch (error) {
    console.error("Get banners error:", error);
    return NextResponse.json(
      { error: "배너 데이터 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PUT: 배너 목록 업데이트
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

    const body = await request.json();
    const { banners, rows } = saveSchema.parse(body);

    const teacherId = session.user.id;

    // Prisma Mongo 클라이언트 타입에 없는 모델이므로 any 캐스팅
    const db = prisma as any;

    // 배너 업데이트 또는 생성
    const teacherBanner = await db.teacherBanner.upsert({
      where: { teacherId },
      update: {
        banners: JSON.stringify(banners),
        rows,
      },
      create: {
        teacherId,
        banners: JSON.stringify(banners),
        rows,
      },
    });

    return NextResponse.json({
      message: "배너가 저장되었습니다.",
      banners: JSON.parse(teacherBanner.banners),
      rows: rows,
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

