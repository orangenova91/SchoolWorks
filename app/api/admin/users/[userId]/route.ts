import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const userId = params.userId;

    // 사용자 정보 가져오기 (ParentProfile 포함)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        parentProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({
      user,
      parentProfile: user.parentProfile,
    });
  } catch (error: any) {
    console.error("Get user error:", error);
    return NextResponse.json(
      {
        error: "사용자 정보 조회 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const userId = params.userId;
    const body = await request.json();

    // 사용자 존재 확인
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        parentProfile: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    // 사용자 기본 정보 업데이트
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name || null;
    if (body.role !== undefined) updateData.role = body.role || null;

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // 학생 프로필 업데이트 (역할이 student인 경우)
    if (body.role === "student" || existingUser.role === "student") {
      const prismaAny = prisma as any;
      const studentProfileData: any = {};
      
      // 현재 학번 가져오기
      const currentStudentId = existingUser.studentProfile?.studentId;
      
      // 학번이 변경되었을 때 grade와 section 자동 추출
      let extractedGrade: string | null | undefined = body.grade;
      let extractedSection: string | null | undefined = undefined;
      
      if (body.studentId !== undefined && body.studentId !== currentStudentId) {
        const studentId = body.studentId;
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
      }
      
      // 최종 grade와 section 값 결정 (추출된 값이 있으면 그것을, 없으면 업데이트 값, 없으면 기존 값 사용)
      const currentGrade = existingUser.studentProfile?.grade;
      const currentSection = existingUser.studentProfile?.section;
      const finalGrade = extractedGrade !== undefined ? extractedGrade : (body.grade !== undefined ? body.grade : currentGrade);
      const finalSection = extractedSection !== undefined ? extractedSection : (body.section !== undefined ? body.section : currentSection);
      
      // studentId 업데이트
      if (body.studentId !== undefined) studentProfileData.studentId = body.studentId || null;
      
      // grade 업데이트 (추출된 값 또는 명시적으로 제공된 값)
      if (extractedGrade !== undefined || body.grade !== undefined) {
        studentProfileData.grade = finalGrade;
      }
      
      // section 업데이트 (추출된 값 또는 명시적으로 제공된 값)
      if (extractedSection !== undefined || body.section !== undefined) {
        studentProfileData.section = finalSection;
      }
      
      // classLabel 자동 생성 로직
      // grade와 section이 모두 있으면 항상 자동 생성 (학번 변경 시 추출된 값 또는 명시적으로 제공된 값 사용)
      if (finalGrade && finalSection) {
        // 학번이 변경되었거나, grade 또는 section이 변경되었는지 확인
        const studentIdChanged = body.studentId !== undefined && body.studentId !== currentStudentId;
        const gradeChanged = (extractedGrade !== undefined || body.grade !== undefined) && finalGrade !== currentGrade;
        const sectionChanged = (extractedSection !== undefined || body.section !== undefined) && finalSection !== currentSection;
        
        // 학번 변경 시 또는 최초 생성 시 또는 변경 시 항상 자동 생성
        // 단, 명시적으로 className이 제공된 경우는 그것을 우선 사용하지 않고 자동 생성된 값을 사용
        if (studentIdChanged || !currentGrade || !currentSection || gradeChanged || sectionChanged) {
          studentProfileData.classLabel = `${finalGrade}-${finalSection}`;
        } else if (body.className !== undefined) {
          // 변경이 없고 명시적으로 className이 제공된 경우에만 사용
          studentProfileData.classLabel = body.className || null;
        }
      } else if (body.className !== undefined) {
        // grade나 section이 없어서 자동 생성할 수 없는 경우, 명시적으로 제공된 값 사용
        studentProfileData.classLabel = body.className || null;
      }

      if (Object.keys(studentProfileData).length > 0) {
        if (existingUser.studentProfile) {
          // 기존 프로필 업데이트
          await prismaAny.studentProfile.update({
            where: { userId: userId },
            data: studentProfileData,
          });
        } else if (body.role === "student") {
          // 새 프로필 생성
          await prismaAny.studentProfile.create({
            data: {
              userId: userId,
              ...studentProfileData,
            },
          });
        }
      }
    }

    // 학부모 프로필 업데이트 (역할이 parent인 경우)
    if (body.role === "parent" || existingUser.role === "parent") {
      const prismaAny = prisma as any;
      const parentProfileData: any = {};

      // studentIds 업데이트 (자녀이메일로 자녀 학생 찾기)
      if (body.childEmails !== undefined) {
        const childEmails = body.childEmails?.trim();
        const studentUserIds: string[] = [];

        if (childEmails) {
          // 쉼표로 구분된 이메일들을 분리
          const childEmailList = childEmails
            .split(",")
            .map((email: string) => email.trim().toLowerCase())
            .filter((email: string) => email.length > 0);

          if (childEmailList.length > 0) {
            // 이메일로 학생 찾기
            const students = await prisma.user.findMany({
              where: {
                email: { in: childEmailList },
                role: "student",
              },
              select: { id: true },
            });

            // User.id 수집
            studentUserIds.push(...students.map((s) => s.id));
          }
        }

        parentProfileData.studentIds = studentUserIds;
      }

      if (Object.keys(parentProfileData).length > 0) {
        if (existingUser.parentProfile) {
          // 기존 프로필 업데이트
          await prismaAny.parentProfile.update({
            where: { userId: userId },
            data: parentProfileData,
          });
        } else if (body.role === "parent") {
          // 새 프로필 생성
          await prismaAny.parentProfile.create({
            data: {
              userId: userId,
              studentIds: parentProfileData.studentIds || [],
            },
          });
        }
      }
    }

    return NextResponse.json({
      message: "사용자 정보가 업데이트되었습니다.",
    });
  } catch (error: any) {
    console.error("User update error:", error);
    return NextResponse.json(
      {
        error: "사용자 정보 업데이트 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const userId = params.userId;

    // 사용자 존재 확인
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    // 자기 자신을 삭제하는 것 방지
    if (existingUser.id === session.user.id) {
      return NextResponse.json(
        { error: "자기 자신을 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    // 사용자 삭제 (Cascade로 관련 Profile도 자동 삭제됨)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      message: "사용자가 삭제되었습니다.",
    });
  } catch (error: any) {
    console.error("User delete error:", error);
    return NextResponse.json(
      {
        error: "사용자 삭제 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
