import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * POST: 교사가 소속 학교에 재학생 추가
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
        { error: "학교 정보가 설정되지 않아 재학생을 추가할 수 없습니다." },
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

    const studentIdTrimmed = body.studentId?.trim() || null;
    if (studentIdTrimmed) {
      const existingStudentId = await prisma.studentProfile.findFirst({
        where: {
          studentId: studentIdTrimmed,
          school: teacherSchool,
        },
      });
      if (existingStudentId) {
        return NextResponse.json(
          { error: "이미 사용 중인 학번입니다." },
          { status: 400 }
        );
      }
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
        role: "student",
        emailVerified: new Date(),
      },
    });

    const studentId = studentIdTrimmed;
    const grade =
      studentId && studentId.length > 0
        ? studentId[0]
        : (body.grade?.trim() || null);

    let section: string | null = null;
    if (studentId && studentId.length >= 3) {
      const sectionValue = parseInt(studentId.substring(1, 3), 10);
      if (!isNaN(sectionValue)) {
        section = String(sectionValue);
      }
    }
    if (!section && body.section?.trim()) {
      section = body.section.trim();
    }

    let classLabel: string | null = null;
    if (grade && section) {
      classLabel = `${grade}-${section}`;
    } else if (body.className?.trim()) {
      classLabel = body.className.trim();
    }

    let seatNumber: string | null = null;
    if (studentId && studentId.length >= 2) {
      const seatValue = parseInt(
        studentId.substring(studentId.length - 2),
        10
      );
      if (!isNaN(seatValue)) {
        seatNumber = String(seatValue);
      }
    }

    await prisma.studentProfile.create({
      data: {
        userId: user.id,
        studentId: studentId,
        school: teacherSchool,
        grade: grade,
        classLabel: classLabel,
        section: section,
        seatNumber: seatNumber,
        enrollmentStatus: "재학",
      },
    });

    return NextResponse.json({
      message: "재학생이 추가되었습니다.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    console.error("Teacher create student error:", error);
    return NextResponse.json(
      {
        error: "재학생 추가 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
