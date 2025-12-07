import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateAdminSchema } from "@/lib/validations/auth";
import { hashPassword } from "@/lib/utils";

export async function PUT(request: NextRequest) {
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
    const validatedData = updateAdminSchema.parse(body);

    // Admin 계정 존재 확인
    const existingAdmin = await prisma.user.findUnique({
      where: { id: validatedData.adminId },
      include: {
        adminProfile: {
          include: {
            school: true,
          },
        },
      },
    });

    if (!existingAdmin || existingAdmin.role !== "admin") {
      return NextResponse.json(
        { error: "Admin 계정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이메일 중복 확인 (다른 사용자가 사용 중인지)
    if (validatedData.adminEmail !== existingAdmin.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.adminEmail },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "이미 존재하는 이메일입니다." },
          { status: 400 }
        );
      }
    }

    // 계정 이름 중복 확인 (다른 Admin 계정이 사용 중인지)
    if (validatedData.adminName !== existingAdmin.name) {
      const nameExists = await prisma.user.findFirst({
        where: {
          name: validatedData.adminName,
          role: "admin",
          id: { not: validatedData.adminId }, // 현재 계정 제외
        },
      });

      if (nameExists) {
        return NextResponse.json(
          { error: "이미 존재하는 계정 이름입니다." },
          { status: 400 }
        );
      }
    }

    // 현재 학교 정보 가져오기
    const currentSchool = existingAdmin.adminProfile?.school;

    // 총 학급수 및 학생수 계산
    const totalClasses = validatedData.gradeInfo.reduce((sum, grade) => sum + grade.classCount, 0);
    const totalStudents = validatedData.gradeInfo.reduce((sum, grade) => sum + grade.studentCount, 0);

    // 트랜잭션으로 Admin 계정 및 학교 정보 업데이트
    const result = await prisma.$transaction(async (tx) => {
      // 비밀번호 업데이트 (제공된 경우만)
      let hashedPassword = existingAdmin.hashedPassword;
      if (validatedData.adminPassword && validatedData.adminPassword.trim() !== "") {
        hashedPassword = await hashPassword(validatedData.adminPassword);
      }

      // Admin 사용자 업데이트
      const adminUser = await tx.user.update({
        where: { id: validatedData.adminId },
        data: {
          email: validatedData.adminEmail,
          hashedPassword,
          name: validatedData.adminName,
          school: validatedData.schoolName,
        },
      });

      // 학교 정보 업데이트 또는 생성
      let school;
      if (currentSchool) {
        // 기존 학교 정보 업데이트
        school = await tx.school.update({
          where: { id: currentSchool.id },
          data: {
            name: validatedData.schoolName,
            schoolType: validatedData.schoolType,
            contactName: validatedData.contactName,
            contactPhone: validatedData.contactPhone,
            gradeInfo: JSON.stringify(validatedData.gradeInfo),
            totalClasses,
            totalStudents,
            status: validatedData.status,
            notes: validatedData.notes || null,
          },
        });
      } else {
        // 새 학교 정보 생성
        school = await tx.school.create({
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
            status: validatedData.status,
            notes: validatedData.notes || null,
          },
        });
      }

      // AdminProfile 업데이트 또는 생성
      if (existingAdmin.adminProfile) {
        await tx.adminProfile.update({
          where: { userId: validatedData.adminId },
          data: {
            schoolId: school.id,
            phoneNumber: validatedData.contactPhone,
            notes: validatedData.notes || null,
          },
        });
      } else {
        await tx.adminProfile.create({
          data: {
            userId: adminUser.id,
            schoolId: school.id,
            phoneNumber: validatedData.contactPhone,
            notes: validatedData.notes || null,
          },
        });
      }

      return { adminUser, school };
    });

    return NextResponse.json(
      {
        message: "Admin 계정이 성공적으로 수정되었습니다.",
        data: {
          userId: result.adminUser.id,
          email: result.adminUser.email,
          schoolId: result.school.id,
          schoolName: result.school.name,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Admin 계정 수정 오류:", error);
    return NextResponse.json(
      { error: "Admin 계정 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

