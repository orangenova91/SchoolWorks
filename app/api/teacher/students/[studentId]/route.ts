import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateStudentProfileSchema } from "@/lib/validations/student";

export const dynamic = 'force-dynamic';

// GET: 특정 학생 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "teacher") {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const studentId = params.studentId;

    // 교사 프로필 확인 (담임반 정보)
    const teacherProfile = await (prisma as any).teacherProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        grade: true,
        classLabel: true,
      },
    });

    // 학생 정보 조회
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentProfile: true,
      },
    });

    if (!student || student.role !== "student") {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 담임반 학생인지 확인 (선택사항 - 보안 강화)
    if (teacherProfile?.grade && teacherProfile?.classLabel) {
      const studentProfile = student.studentProfile;
      if (
        studentProfile?.grade !== teacherProfile.grade ||
        studentProfile?.classLabel !== teacherProfile.classLabel
      ) {
        return NextResponse.json(
          { error: "권한이 없습니다." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      user: {
        id: student.id,
        email: student.email,
        name: student.name,
        school: student.school,
        region: student.region,
        role: student.role,
      },
      profile: student.studentProfile,
    });
  } catch (error) {
    console.error("Get student error:", error);
    return NextResponse.json(
      { error: "학생 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PUT: 교사가 학생 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "teacher") {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const studentId = params.studentId;
    const body = await request.json();
    
    // electiveSubjects가 문자열인 경우 배열로 변환
    if (body.electiveSubjects && typeof body.electiveSubjects === 'string') {
      body.electiveSubjects = body.electiveSubjects.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    }
    
    const validatedData = updateStudentProfileSchema.parse(body);

    // 교사 프로필 확인 (담임반 정보)
    const teacherProfile = await (prisma as any).teacherProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        grade: true,
        classLabel: true,
      },
    });

    // 학생 정보 확인
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentProfile: true,
      },
    });

    if (!student || student.role !== "student") {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 담임반 학생인지 확인
    if (teacherProfile?.grade && teacherProfile?.classLabel) {
      const studentProfile = student.studentProfile;
      if (
        studentProfile?.grade !== teacherProfile.grade ||
        studentProfile?.classLabel !== teacherProfile.classLabel
      ) {
        return NextResponse.json(
          { error: "권한이 없습니다." },
          { status: 403 }
        );
      }
    }

    // User 업데이트할 데이터 준비
    const userUpdateData: {
      name?: string;
      school?: string;
      region?: string | null;
    } = {};

    if (validatedData.name !== undefined) {
      userUpdateData.name = validatedData.name;
    }
    if (validatedData.school !== undefined) {
      userUpdateData.school = validatedData.school;
    }
    if (validatedData.region !== undefined) {
      userUpdateData.region = validatedData.region;
    }

    // StudentProfile 업데이트할 데이터 준비
    const profileUpdateData: any = {};
    
    const profileFields = [
      "studentId", "grade", "classLabel", "section", "seatNumber",
      "major", "sex", "classOfficer", "specialEducation", "phoneNumber",
      "siblings", "academicStatus", "remarks", "club", "clubTeacher",
      "clubLocation", "dateOfBirth", "address", "residentRegistrationNumber",
      "motherName", "motherPhone", "motherRemarks",
      "fatherName", "fatherPhone", "fatherRemarks", "electiveSubjects"
    ];

    profileFields.forEach((field) => {
      if (validatedData[field as keyof typeof validatedData] !== undefined) {
        profileUpdateData[field] = validatedData[field as keyof typeof validatedData];
      }
    });

    // 트랜잭션으로 User와 StudentProfile 업데이트
    const result = await prisma.$transaction(async (tx) => {
      // User 업데이트
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: studentId },
          data: userUpdateData,
        });
      }

      // StudentProfile 업데이트 또는 생성
      const existingProfile = await tx.studentProfile.findUnique({
        where: { userId: studentId },
      });

      if (existingProfile) {
        // 기존 프로필 업데이트
        if (Object.keys(profileUpdateData).length > 0) {
          await tx.studentProfile.update({
            where: { userId: studentId },
            data: profileUpdateData,
          });
        }
      } else {
        // 새 프로필 생성
        await tx.studentProfile.create({
          data: {
            userId: studentId,
            ...profileUpdateData,
          },
        });
      }

      // 업데이트된 데이터 반환
      return await tx.user.findUnique({
        where: { id: studentId },
        include: {
          studentProfile: true,
        },
      });
    });

    return NextResponse.json({
      message: "학생 정보가 성공적으로 업데이트되었습니다.",
      user: {
        id: result!.id,
        email: result!.email,
        name: result!.name,
        school: result!.school,
        region: result!.region,
        role: result!.role,
      },
      profile: result!.studentProfile,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Update student error:", error);
    return NextResponse.json(
      { error: "학생 정보 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

