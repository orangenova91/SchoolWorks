import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminSchema } from "@/lib/validations/auth";
import { hashPassword } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    // 슈퍼어드민 권한 확인
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "superadmin") {
      return NextResponse.json(
        { error: "슈퍼어드민 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createAdminSchema.parse(body);

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.adminEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 존재하는 이메일입니다." },
        { status: 400 }
      );
    }

    // 계정 이름 중복 확인 (Admin 계정만)
    const existingAdminName = await prisma.user.findFirst({
      where: {
        name: validatedData.adminName,
        role: "admin",
      },
    });

    if (existingAdminName) {
      return NextResponse.json(
        { error: "이미 존재하는 계정 이름입니다." },
        { status: 400 }
      );
    }

    // 비밀번호 해시
    const hashedPassword = await hashPassword(validatedData.adminPassword);

    // 총 학급수 및 학생수 계산
    const totalClasses = validatedData.gradeInfo.reduce((sum, grade) => sum + grade.classCount, 0);
    const totalStudents = validatedData.gradeInfo.reduce((sum, grade) => sum + grade.studentCount, 0);

    // 트랜잭션으로 Admin 계정 및 학교 정보 생성
    const result = await prisma.$transaction(async (tx) => {
      // Admin 사용자 생성
      const adminUser = await tx.user.create({
        data: {
          email: validatedData.adminEmail,
          hashedPassword,
          name: validatedData.adminName,
          school: validatedData.schoolName,
          role: "admin",
          emailVerified: new Date(),
        },
      });

      // 학교 정보 생성
      const school = await tx.school.create({
        data: {
          name: validatedData.schoolName,
          schoolType: validatedData.schoolType,
          adminUserId: adminUser.id,
          createdBy: session.user.id!,
          contactName: validatedData.contactName,
          contactPhone: validatedData.contactPhone,
          gradeInfo: JSON.stringify(validatedData.gradeInfo),
          totalClasses,
          totalStudents,
          notes: validatedData.notes || null,
          status: "active",
        },
      });

      // AdminProfile 생성
      await tx.adminProfile.create({
        data: {
          userId: adminUser.id,
          schoolId: school.id,
          phoneNumber: validatedData.contactPhone,
          notes: validatedData.notes || null,
        },
      });

      return { adminUser, school };
    });

    return NextResponse.json(
      {
        message: "Admin 계정이 성공적으로 생성되었습니다.",
        data: {
          userId: result.adminUser.id,
          email: result.adminUser.email,
          schoolId: result.school.id,
          schoolName: result.school.name,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Admin 계정 생성 오류:", error);
    return NextResponse.json(
      { error: "Admin 계정 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

