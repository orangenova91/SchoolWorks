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
    
    // 기존 프로필 데이터 가져오기 (자동 생성 로직을 위해 필요)
    const currentGrade = student.studentProfile?.grade;
    const currentSection = student.studentProfile?.section;
    const currentStudentId = student.studentProfile?.studentId;
    
    // 학번이 변경되었을 때 grade, section, seatNumber 자동 추출
    let extractedGrade: string | null | undefined = validatedData.grade;
    let extractedSection: string | null | undefined = validatedData.section;
    let extractedSeatNumber: string | null | undefined = validatedData.seatNumber;
    
    if (validatedData.studentId !== undefined && validatedData.studentId !== currentStudentId) {
      const studentId = validatedData.studentId;
      // 학번의 첫 번째 글자를 학년으로 자동 추출
      if (studentId && studentId.length > 0) {
        extractedGrade = studentId[0];
      }
      
      // 학번의 2,3번째 값을 숫자로 변환하여 반(section) 필드에 저장
      if (studentId && studentId.length >= 3) {
        const sectionValue = parseInt(studentId.substring(1, 3), 10);
        if (!isNaN(sectionValue)) {
          extractedSection = String(sectionValue);
        }
      }
      
      // 학번의 뒤 두 자리를 좌석번호(seatNumber)로 자동 추출
      if (studentId && studentId.length >= 2) {
        const seatValue = parseInt(studentId.substring(studentId.length - 2), 10);
        if (!isNaN(seatValue)) {
          extractedSeatNumber = String(seatValue);
        }
      }
    }
    
    // 최종 grade와 section 값 결정 (추출된 값이 있으면 그것을, 없으면 업데이트 값, 없으면 기존 값 사용)
    const finalGrade = extractedGrade !== undefined ? extractedGrade : (validatedData.grade !== undefined ? validatedData.grade : currentGrade);
    const finalSection = extractedSection !== undefined ? extractedSection : (validatedData.section !== undefined ? validatedData.section : currentSection);
    
    // classLabel 자동 생성 로직
    // grade와 section이 모두 있으면 항상 자동 생성 (학번 변경 시 추출된 값 또는 명시적으로 제공된 값 사용)
    if (finalGrade && finalSection) {
      // 학번이 변경되었거나, grade 또는 section이 변경되었는지 확인
      const studentIdChanged = validatedData.studentId !== undefined && validatedData.studentId !== currentStudentId;
      const gradeChanged = (extractedGrade !== undefined || validatedData.grade !== undefined) && finalGrade !== currentGrade;
      const sectionChanged = (extractedSection !== undefined || validatedData.section !== undefined) && finalSection !== currentSection;
      
      // 학번 변경 시 또는 최초 생성 시 또는 변경 시 항상 자동 생성
      if (studentIdChanged || !currentGrade || !currentSection || gradeChanged || sectionChanged) {
        profileUpdateData.classLabel = `${finalGrade}-${finalSection}`;
      }
    }
    
    // 학번에서 추출된 grade, section, seatNumber를 profileUpdateData에 추가
    if (extractedGrade !== undefined) {
      profileUpdateData.grade = extractedGrade;
    }
    if (extractedSection !== undefined) {
      profileUpdateData.section = extractedSection;
    }
    if (extractedSeatNumber !== undefined) {
      profileUpdateData.seatNumber = extractedSeatNumber;
    }
    
    // seatNumber는 학번에서 자동 추출되므로, 명시적으로 제공된 경우에만 사용
    // (학번 변경 시 자동 추출된 값이 우선)
    if (extractedSeatNumber === undefined && validatedData.seatNumber !== undefined) {
      profileUpdateData.seatNumber = validatedData.seatNumber;
    }
    
    const profileFields = [
      "studentId", "grade", "section",
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

