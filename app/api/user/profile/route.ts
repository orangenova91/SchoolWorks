import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // User와 관련 프로필 정보 가져오기
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        studentProfile: true,
        teacherProfile: true,
        adminProfile: {
          include: {
            school: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get user profile error:", error);
    return NextResponse.json(
      { error: "프로필 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { major, classLabel, phoneNumber, club } = body;

    // 교사인지 확인
    if (session.user.role !== "teacher") {
      return NextResponse.json(
        { error: "교사만 프로필을 수정할 수 있습니다." },
        { status: 403 }
      );
    }

    // 사용자 확인
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { teacherProfile: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // TeacherProfile이 없으면 생성, 있으면 업데이트
    if (!user.teacherProfile) {
      await prisma.teacherProfile.create({
        data: {
          userId: user.id,
          major: major || null,
          classLabel: classLabel || null,
          phoneNumber: phoneNumber || null,
          club: club || null,
        },
      });
    } else {
      await prisma.teacherProfile.update({
        where: { userId: user.id },
        data: {
          major: major !== undefined ? (major || null) : undefined,
          classLabel: classLabel !== undefined ? (classLabel || null) : undefined,
          phoneNumber: phoneNumber !== undefined ? (phoneNumber || null) : undefined,
          club: club !== undefined ? (club || null) : undefined,
        },
      });
    }

    // 업데이트된 프로필 정보 가져오기
    const updatedUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        studentProfile: true,
        teacherProfile: true,
        adminProfile: {
          include: {
            school: true,
          },
        },
      },
    });

    return NextResponse.json({ 
      message: "프로필이 성공적으로 업데이트되었습니다.",
      user: updatedUser 
    });
  } catch (error) {
    console.error("Update user profile error:", error);
    return NextResponse.json(
      { error: "프로필 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

