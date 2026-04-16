import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const saveActivitySchema = z.object({
  clubId: z.string().trim().min(1, "동아리 ID가 필요합니다."),
  studentId: z.string().trim().min(1, "학생 ID가 필요합니다."),
  content: z.string().max(500, "활동 내용은 500자 이하로 입력해주세요."),
});

function normalize(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function isClubTeacherMatch(clubTeacher: string, teacherName?: string | null, teacherEmail?: string | null) {
  const target = normalize(clubTeacher);
  if (!target) return false;
  return target === normalize(teacherName) || target === normalize(teacherEmail);
}

async function getAuthorizedClub(clubId: string, session: any) {
  const prismaAny = prisma as any;
  const club = await prismaAny.club.findUnique({
    where: { id: clubId },
    select: {
      id: true,
      school: true,
      teacher: true,
      studentSelections: true,
    },
  });

  if (!club) {
    return { error: NextResponse.json({ error: "동아리를 찾을 수 없습니다." }, { status: 404 }) };
  }

  if (club.school !== session.user.school) {
    return { error: NextResponse.json({ error: "권한이 없습니다." }, { status: 403 }) };
  }

  if (!isClubTeacherMatch(club.teacher, session.user.name, session.user.email)) {
    return { error: NextResponse.json({ error: "담당 동아리만 관리할 수 있습니다." }, { status: 403 }) };
  }

  return { club };
}

function parseStudentSelections(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === "string" && value.trim() !== "");
    }

    if (parsed && typeof parsed === "object") {
      const allIds: string[] = [];
      Object.values(parsed).forEach((value) => {
        if (typeof value === "string" && value.trim() !== "") {
          allIds.push(value);
          return;
        }
        if (Array.isArray(value)) {
          value.forEach((id) => {
            if (typeof id === "string" && id.trim() !== "") {
              allIds.push(id);
            }
          });
        }
      });
      return allIds;
    }
    return [];
  } catch (error) {
    console.error("Error parsing club studentSelections:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clubId = (searchParams.get("clubId") || "").trim();
    if (!clubId) {
      return NextResponse.json({ error: "clubId가 필요합니다." }, { status: 400 });
    }

    const authResult = await getAuthorizedClub(clubId, session);
    if (authResult.error) return authResult.error;

    const prismaAny = prisma as any;
    const rows = await prismaAny.clubStudentActivity.findMany({
      where: { clubId },
      select: {
        studentId: true,
        content: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      activities: rows.map((row: any) => ({
        studentId: row.studentId,
        content: row.content || "",
        updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching club student activities:", error);
    return NextResponse.json(
      { error: "활동 내용을 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const validated = saveActivitySchema.parse(body);
    const content = validated.content.trim();

    const authResult = await getAuthorizedClub(validated.clubId, session);
    if (authResult.error) return authResult.error;
    const club = authResult.club!;

    const assignedStudentIds = new Set(parseStudentSelections(club.studentSelections));
    if (!assignedStudentIds.has(validated.studentId)) {
      return NextResponse.json({ error: "해당 학생은 이 동아리에 배정되어 있지 않습니다." }, { status: 400 });
    }

    const prismaAny = prisma as any;
    const saved = await prismaAny.clubStudentActivity.upsert({
      where: {
        clubId_studentId: {
          clubId: validated.clubId,
          studentId: validated.studentId,
        },
      },
      update: {
        content,
        updatedAt: new Date(),
      },
      create: {
        clubId: validated.clubId,
        studentId: validated.studentId,
        content,
        school: session.user.school || null,
        createdBy: session.user.email || session.user.name || null,
      },
      select: {
        studentId: true,
        content: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: "활동 내용이 저장되었습니다.",
      activity: {
        studentId: saved.studentId,
        content: saved.content || "",
        updatedAt: saved.updatedAt?.toISOString?.() || saved.updatedAt,
      },
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: error.errors?.[0]?.message || "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    console.error("Error saving club student activity:", error);
    return NextResponse.json(
      { error: "활동 내용 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
