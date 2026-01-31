import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createRequestSchema = z.object({
  courseName: z.string().trim().min(1, "희망 강좌명을 입력하세요").max(200, "희망 강좌명은 200자 이하여야 합니다"),
  desiredContent: z.string().trim().min(1, "듣고 싶은 내용을 입력하세요"),
  notes: z.string().trim().optional(),
});

export const dynamic = 'force-dynamic';

// 방과후 수업 신청 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 교사 또는 학생만 조회 가능
    if (session.user.role !== "teacher" && session.user.role !== "student") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // 필터링 옵션

    const where: any = {};

    // 학생은 같은 학교의 신청 목록을 조회하도록 변경 (모든 학생의 신청 보임)
    if (session.user.role === "student") {
      where.school = session.user.school || undefined;
    } else {
      // 교사는 학교 전체 신청 목록 조회
      where.school = session.user.school || undefined;
    }

    if (status && ["pending", "approved", "rejected", "ended"].includes(status)) {
      where.status = status;
    }

    const requests = await (prisma as any).afterSchoolCourseRequest.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Attach author studentId (학번) for display: "학번 이름"
    const authorUserIds = Array.from(
      new Set(
        (Array.isArray(requests) ? requests : [])
          .map((r: any) => r?.studentId)
          .filter((v: any) => typeof v === "string" && v.length > 0)
      )
    );

    const authors =
      authorUserIds.length > 0
        ? await (prisma as any).user.findMany({
            where: { id: { in: authorUserIds } },
            select: {
              id: true,
              studentProfile: { select: { studentId: true } },
            },
          })
        : [];

    const authorById = new Map((authors || []).map((u: any) => [u.id, u]));
    const withAuthorStudentId = (requests || []).map((r: any) => {
      const author = authorById.get(r.studentId);
      return {
        ...r,
        authorStudentId: author?.studentProfile?.studentId ?? null,
      };
    });

    return NextResponse.json({ requests: withAuthorStudentId });
  } catch (error) {
    console.error("Get after-school requests error:", error);
    return NextResponse.json(
      { error: "신청 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 방과후 수업 신청 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 학생만 신청 가능
    if (session.user.role !== "student") {
      return NextResponse.json({ error: "학생만 신청할 수 있습니다." }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createRequestSchema.parse(body);

    const studentName = session.user.name || session.user.email || "이름 미기재";

    const newRequest = await (prisma as any).afterSchoolCourseRequest.create({
      data: {
        courseName: validatedData.courseName,
        desiredContent: validatedData.desiredContent,
        notes: validatedData.notes || null,
        companionStudents: null,
        companionStudentUserIds: [],
        studentId: session.user.id,
        studentName,
        school: session.user.school || null,
        status: "pending",
      },
    });

    return NextResponse.json(
      {
        message: "신청이 완료되었습니다.",
        request: {
          id: newRequest.id,
          courseName: newRequest.courseName,
          desiredContent: newRequest.desiredContent,
          notes: newRequest.notes,
          companionStudents: newRequest.companionStudents || null,
          companionStudentUserIds: newRequest.companionStudentUserIds || [],
          studentName: newRequest.studentName,
          status: newRequest.status,
          createdAt: newRequest.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Create after-school request error:", error);
    return NextResponse.json(
      { error: "신청 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

