import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * POST: 교사가 소속 학교에 교직원(교사) 추가
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const teacherSchool = session.user.school?.trim() || null;
    if (!teacherSchool) {
      return NextResponse.json(
        { error: "학교 정보가 설정되지 않아 교직원을 추가할 수 없습니다." },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body.email || !body.email.trim()) {
      return NextResponse.json({ error: "이메일이 필요합니다." }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "유효하지 않은 이메일 형식입니다." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일입니다." },
        { status: 400 }
      );
    }

    const password = body.password?.trim() || "abcd1234!@";
    if (password.length < 8) {
      return NextResponse.json(
        { error: "비밀번호는 최소 8자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name: body.name?.trim() || null,
        school: teacherSchool,
        region: null,
        role: "teacher",
        emailVerified: new Date(),
      },
    });

    await prisma.teacherProfile.create({
      data: {
        userId: user.id,
        school: teacherSchool,
        roleLabel: body.roleLabel?.trim() || null,
      },
    });

    return NextResponse.json({
      message: "교직원이 추가되었습니다.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    console.error("Teacher create staff error:", error);
    return NextResponse.json(
      {
        error: "교직원 추가 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
