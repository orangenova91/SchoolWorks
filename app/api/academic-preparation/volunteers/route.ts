import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createVolunteerSchema = z.object({
  type: z.enum(["homeroom", "manager"]),
  department: z.string().trim().min(1, "부서명을 입력하세요"),
  teacher: z.string().trim().min(1, "담당교사를 입력하세요"),
  activityName: z.string().trim().min(1, "봉사활동명을 입력하세요"),
  activityContent: z.string().trim().optional().nullable(),
  volunteerArea: z.string().trim().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  grade: z.string().trim().optional().nullable(),
  selectionCount: z.number().int().min(0).optional().nullable(),
  volunteerHours: z.number().int().min(0).optional().nullable(),
  location: z.string().trim().optional().nullable(),
});

export const dynamic = 'force-dynamic';

// 봉사활동 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 교사만 조회 가능
    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "homeroom" | "manager"

    const where: any = {
      school: session.user.school || undefined,
    };

    if (type) {
      where.type = type;
    }

    const volunteers = await (prisma as any).volunteer.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        type: true,
        department: true,
        teacher: true,
        activityName: true,
        activityContent: true,
        volunteerArea: true,
        startDate: true,
        endDate: true,
        grade: true,
        selectionCount: true,
        volunteerHours: true,
        location: true,
        studentSelections: true,
        school: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 날짜를 ISO 문자열로 변환
    const cleanedVolunteers = (volunteers || []).map((volunteer: any) => ({
      ...volunteer,
      startDate: volunteer.startDate?.toISOString?.() || volunteer.startDate || null,
      endDate: volunteer.endDate?.toISOString?.() || volunteer.endDate || null,
      createdAt: volunteer.createdAt?.toISOString?.() || volunteer.createdAt,
    }));

    return NextResponse.json({
      volunteers: cleanedVolunteers,
    });
  } catch (error: any) {
    console.error("Error fetching volunteers:", error);
    return NextResponse.json(
      { error: "봉사활동 목록을 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

// 봉사활동 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 교사만 생성 가능
    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createVolunteerSchema.parse(body);

    // 날짜 문자열을 DateTime으로 변환
    const startDate = validatedData.startDate 
      ? new Date(validatedData.startDate) 
      : null;
    const endDate = validatedData.endDate 
      ? new Date(validatedData.endDate) 
      : null;

    const newVolunteer = await (prisma as any).volunteer.create({
      data: {
        type: validatedData.type,
        department: validatedData.department,
        teacher: validatedData.teacher,
        activityName: validatedData.activityName,
        activityContent: validatedData.activityContent || null,
        volunteerArea: validatedData.volunteerArea || null,
        startDate: startDate,
        endDate: endDate,
        grade: validatedData.grade || null,
        selectionCount: validatedData.selectionCount || null,
        volunteerHours: validatedData.volunteerHours || null,
        location: validatedData.location || null,
        school: session.user.school || null,
      },
    });

    return NextResponse.json(
      {
        message: "봉사활동이 추가되었습니다.",
        volunteer: {
          id: newVolunteer.id,
          type: newVolunteer.type,
          department: newVolunteer.department,
          teacher: newVolunteer.teacher,
          activityName: newVolunteer.activityName,
          startDate: newVolunteer.startDate?.toISOString?.() || newVolunteer.startDate,
          endDate: newVolunteer.endDate?.toISOString?.() || newVolunteer.endDate,
          createdAt: newVolunteer.createdAt?.toISOString?.() || newVolunteer.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: error.errors[0]?.message || "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }
    console.error("Error creating volunteer:", error);
    return NextResponse.json(
      { error: "봉사활동 추가에 실패했습니다." },
      { status: 500 }
    );
  }
}

