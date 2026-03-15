import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

// 교직원 프로필 업데이트 스키마 (빈 값은 null로 저장)
const updateStaffProfileSchema = z.object({
  roleLabel: z.string().optional().nullable(),
  major: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
});

// PUT: 교사가 교직원 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "teacher") {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const staffId = params.staffId;
    const body = await request.json();
    const validatedData = updateStaffProfileSchema.parse(body);

    // 교직원 정보 확인 (같은 학교의 교직원인지 확인)
    const staff = await prisma.user.findUnique({
      where: { id: staffId },
      include: {
        teacherProfile: true,
      },
    });

    if (!staff || (staff.role !== "teacher" && staff.role !== "admin")) {
      return NextResponse.json(
        { error: "교직원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 같은 학교인지 확인
    if (staff.school !== session.user.school) {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    // TeacherProfile 업데이트할 데이터 준비
    const profileUpdateData: any = {};

    const profileFields = ["roleLabel", "major", "phoneNumber"];

    profileFields.forEach((field) => {
      if (validatedData[field as keyof typeof validatedData] !== undefined) {
        profileUpdateData[field] = validatedData[field as keyof typeof validatedData];
      }
    });

    // 트랜잭션으로 TeacherProfile 업데이트
    const result = await prisma.$transaction(async (tx) => {
      // TeacherProfile 업데이트 또는 생성
      const existingProfile = await (tx as any).teacherProfile.findUnique({
        where: { userId: staffId },
      });

      if (existingProfile) {
        // 기존 프로필 업데이트
        if (Object.keys(profileUpdateData).length > 0) {
          await (tx as any).teacherProfile.update({
            where: { userId: staffId },
            data: profileUpdateData,
          });
        }
      } else {
        // 새 프로필 생성
        await (tx as any).teacherProfile.create({
          data: {
            userId: staffId,
            ...profileUpdateData,
          },
        });
      }

      // 업데이트된 데이터 반환
      return await tx.user.findUnique({
        where: { id: staffId },
        include: {
          teacherProfile: true,
        },
      });
    });

    return NextResponse.json({
      message: "교직원 정보가 성공적으로 업데이트되었습니다.",
      user: {
        id: result!.id,
        email: result!.email,
        name: result!.name,
        school: result!.school,
        role: result!.role,
      },
      profile: (result as any).teacherProfile,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Update staff error:", error);
    return NextResponse.json(
      { error: "교직원 정보 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

