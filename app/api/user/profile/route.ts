import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET: 현재 로그인한 사용자의 프로필 정보 조회 (모든 역할 지원)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // User 정보와 역할별 프로필 정보 가져오기
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

    // 기본 사용자 정보
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      school: user.school,
      region: user.region,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // 역할별 프로필 정보
    let profileData = null;
    
    if (user.role === "student" && user.studentProfile) {
      profileData = user.studentProfile;
    } else if (user.role === "teacher" && user.teacherProfile) {
      profileData = user.teacherProfile;
    } else if ((user.role === "admin" || user.role === "superadmin") && user.adminProfile) {
      profileData = {
        ...user.adminProfile,
        school: user.adminProfile.school,
      };
    }

    return NextResponse.json({
      user: userData,
      profile: profileData,
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return NextResponse.json(
      { error: "프로필 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

