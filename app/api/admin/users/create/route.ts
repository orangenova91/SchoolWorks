import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();

    // 필수 필드 검증
    if (!body.email || !body.email.trim()) {
      return NextResponse.json({ error: "이메일이 필요합니다." }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "유효하지 않은 이메일 형식입니다." }, { status: 400 });
    }

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 400 });
    }

    // 역할 검증
    const role = body.role?.trim() || null;
    if (role && !["student", "teacher", "admin", "parent"].includes(role)) {
      return NextResponse.json({ error: "유효하지 않은 역할입니다." }, { status: 400 });
    }

    // 같은 학교 내 동일 이름 사용자 확인
    const schoolTrimmed = body.school?.trim() || null;
    const nameTrimmed = body.name?.trim() || null;
    if (schoolTrimmed && nameTrimmed) {
      const existingSameName = await prisma.user.findFirst({
        where: {
          school: schoolTrimmed,
          name: nameTrimmed,
        },
      });
      if (existingSameName) {
        return NextResponse.json(
          { error: "이미 같은 학교에 동일한 이름의 사용자가 등록되어 있습니다." },
          { status: 400 }
        );
      }
    }

    // 학생 역할일 때 학번 중복 확인 (같은 학교 내)
    if (role === "student") {
      const studentIdTrimmed = body.studentId?.trim() || null;
      if (studentIdTrimmed && schoolTrimmed) {
        const existingStudentId = await prisma.studentProfile.findFirst({
          where: {
            studentId: studentIdTrimmed,
            school: schoolTrimmed,
          },
        });
        if (existingStudentId) {
          return NextResponse.json({ error: "이미 사용 중인 학번입니다." }, { status: 400 });
        }
      }
    }

    // 비밀번호 처리 (기본값 또는 제공된 값)
    const password = body.password?.trim() || "abcd1234!@";
    if (password.length < 8) {
      return NextResponse.json({ error: "비밀번호는 최소 8자 이상이어야 합니다." }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name: body.name?.trim() || null,
        school: body.school?.trim() || null,
        region: body.region?.trim() || null,
        role,
        emailVerified: new Date(), // 관리자가 등록하는 경우 바로 활성화
      },
    });

    // Profile 생성 (role에 따라)
    if (user.role === "student") {
      // 학번의 첫 번째 글자를 학년으로 자동 추출
      const studentId = body.studentId?.trim() || null;
      const grade = studentId && studentId.length > 0 ? studentId[0] : (body.grade?.trim() || null);
      
      // 학번의 2,3번째 값을 숫자로 변환하여 반 필드에 저장
      let section: string | null = null;
      if (studentId && studentId.length >= 3) {
        const sectionValue = parseInt(studentId.substring(1, 3), 10);
        if (!isNaN(sectionValue)) {
          section = String(sectionValue);
        }
      }
      // 학번에서 추출하지 못한 경우 body에서 가져오기
      if (!section && body.section?.trim()) {
        section = body.section.trim();
      }
      
      // 학반 필드는 학년-반 형식으로 저장 (예: "1-1", "2-10")
      let classLabel: string | null = null;
      if (grade && section) {
        classLabel = `${grade}-${section}`;
      } else if (body.className?.trim()) {
        // 명시적으로 제공된 경우 사용
        classLabel = body.className.trim();
      }
      
      // 번호 필드는 학번의 마지막 2자리 숫자로 저장
      let seatNumber: string | null = null;
      if (studentId && studentId.length >= 2) {
        const seatValue = parseInt(studentId.substring(studentId.length - 2), 10);
        if (!isNaN(seatValue)) {
          seatNumber = String(seatValue);
        }
      }

      await prisma.studentProfile.create({
        data: {
          userId: user.id,
          studentId: studentId,
          school: body.school?.trim() || null,
          grade: grade,
          classLabel: classLabel,
          section: section,
          seatNumber: seatNumber,
          enrollmentStatus: "재학",
        },
      });
    } else if (user.role === "teacher") {
      await prisma.teacherProfile.create({
        data: {
          userId: user.id,
          school: body.school?.trim() || null,
          roleLabel: body.roleLabel?.trim() || null,
        },
      });
    } else if (user.role === "parent") {
      // ParentProfile 생성 (자녀이메일로 자녀 학생 찾기)
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

      // ParentProfile 생성 (학생이 없어도 생성)
      const prismaAny = prisma as any;
      await prismaAny.parentProfile.create({
        data: {
          userId: user.id,
          studentIds: studentUserIds,
        },
      });
    }
    // admin role은 Profile이 없으므로 User만 생성됨

    return NextResponse.json({
      message: "사용자 등록이 완료되었습니다.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("User creation error:", error);
    return NextResponse.json(
      {
        error: "사용자 등록 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

