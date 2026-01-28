import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    let course: { id: string; subject: string; grade: string } | null = null;

    if (session.user.role === "teacher") {
      course = await (prisma as unknown as {
        course: {
          findFirst: (args: {
            where: { id: string; teacherId?: string };
            select: { id: true; subject: true; grade: true };
          }) => Promise<{ id: string; subject: string; grade: string } | null>;
        };
      }).course.findFirst({
        where: {
          id: params.courseId,
          teacherId: session.user.id,
        },
        select: { id: true, subject: true, grade: true },
      });
    } else if (session.user.role === "student") {
      const classGroup = await (prisma as unknown as {
        classGroup: {
          findFirst: (args: {
            where: { courseId: string; studentIds: { has: string } };
            include: { course: { select: { id: true; subject: true; grade: true } } };
          }) => Promise<{ course: { id: string; subject: string; grade: string } } | null>;
        };
      }).classGroup.findFirst({
        where: { courseId: params.courseId, studentIds: { has: session.user.id } },
        include: { course: { select: { id: true, subject: true, grade: true } } },
      });
      course = classGroup?.course ?? null;
    } else {
      return NextResponse.json(
        { error: "접근 권한이 없습니다." },
        { status: 403 }
      );
    }

    if (!course) {
      return NextResponse.json(
        { error: "수업을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: course.id,
      subject: course.subject,
      grade: course.grade,
    });
  } catch (error) {
    console.error("Failed to fetch course:", error);
    return NextResponse.json(
      { error: "수업 정보를 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const courseId = params.courseId;
    const body = await request.json().catch(() => ({}));

    const {
      subject,
      grade,
      classroom,
      careerTrack,
      subjectGroup,
      subjectArea,
      instructor,
      description,
    } = body as {
      subject?: string;
      grade?: string;
      classroom?: string | null;
      careerTrack?: string;
      subjectGroup?: string;
      subjectArea?: string;
      instructor?: string;
      description?: string;
    };

    if (!subject || typeof subject !== "string" || subject.trim() === "") {
      return NextResponse.json({ error: "과목명이 필요합니다." }, { status: 400 });
    }

    const existing = await prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "수업을 찾을 수 없습니다." }, { status: 404 });
    }

    const isTeacherOwner = session.user.role === "teacher" && session.user.id === existing.teacherId;
    const isAdmin = session.user.role === "admin";
    if (!isTeacherOwner && !isAdmin) {
      return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: {
        subject: subject.trim(),
        grade: grade ?? undefined,
        classroom: typeof classroom === "string" && classroom.trim() !== "" ? classroom.trim() : null,
        careerTrack: careerTrack ?? undefined,
        subjectGroup: subjectGroup ?? undefined,
        subjectArea: subjectArea ?? undefined,
        instructor: instructor ?? undefined,
        description: description ?? undefined,
      },
    });

    return NextResponse.json({ course: updated });
  } catch (error) {
    console.error("Failed to update course:", error);
    return NextResponse.json({ error: "수업 정보 수정 중 오류가 발생했습니다." }, { status: 500 });
  }
}
