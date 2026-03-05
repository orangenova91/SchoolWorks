import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: 현재 학교의 방과후 담당자 및 교사 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const school = session.user.school || "";
    if (!school) {
      return NextResponse.json(
        { error: "학교 정보가 없어 담당자를 조회할 수 없습니다." },
        { status: 400 }
      );
    }

    const manager = await (prisma as any).afterSchoolManager.findFirst({
      where: { school },
    });

    const teachers = await (prisma as any).user.findMany({
      where: {
        role: "teacher",
        school,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      manager: manager ? { teacherId: manager.teacherId } : null,
      teachers,
    });
  } catch (error) {
    console.error("Failed to fetch after-school manager:", error);
    return NextResponse.json(
      { error: "방과후 담당자 정보를 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PUT: 현재 학교의 방과후 담당자 설정/변경
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const role = session.user.role;
    const isAdmin = role === "admin" || role === "superadmin";
    const isTeacher = role === "teacher";
    // A안: 일반 교사도 담당자를 설정할 수 있도록 허용
    if (!isAdmin && !isTeacher) {
      return NextResponse.json(
        { error: "담당자를 설정할 권한이 없습니다." },
        { status: 403 }
      );
    }

    const school = session.user.school || "";
    if (!school) {
      return NextResponse.json(
        { error: "학교 정보가 없어 담당자를 설정할 수 없습니다." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const teacherId = typeof body.teacherId === "string" ? body.teacherId : "";
    if (!teacherId) {
      return NextResponse.json(
        { error: "담당자로 지정할 교사 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const teacher = await (prisma as any).user.findFirst({
      where: {
        id: teacherId,
        role: "teacher",
        school,
      },
      select: { id: true },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "해당 학교의 교사를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const manager = await (prisma as any).afterSchoolManager.upsert({
      where: { school },
      update: { teacherId: teacherId },
      create: {
        school,
        teacherId: teacherId,
      },
    });

    return NextResponse.json({
      manager: { teacherId: manager.teacherId },
    });
  } catch (error) {
    console.error("Failed to update after-school manager:", error);
    return NextResponse.json(
      { error: "방과후 담당자를 설정하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

