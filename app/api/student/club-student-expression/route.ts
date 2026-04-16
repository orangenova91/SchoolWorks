import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const saveExpressionSchema = z.object({
  clubId: z.string().trim().min(1, "동아리 ID가 필요합니다."),
  content: z.string().max(500, "활동 표현은 500자 이하로 입력해주세요."),
});

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

async function getAuthorizedClubForStudent(clubId: string, studentId: string, school?: string | null) {
  const prismaAny = prisma as any;
  const club = await prismaAny.club.findUnique({
    where: { id: clubId },
    select: {
      id: true,
      clubName: true,
      school: true,
      studentSelections: true,
    },
  });

  if (!club) {
    return { error: NextResponse.json({ error: "동아리를 찾을 수 없습니다." }, { status: 404 }) };
  }

  if (club.school !== school) {
    return { error: NextResponse.json({ error: "권한이 없습니다." }, { status: 403 }) };
  }

  const assignedStudentIds = new Set(parseStudentSelections(club.studentSelections));
  if (!assignedStudentIds.has(studentId)) {
    return { error: NextResponse.json({ error: "배정된 동아리만 입력할 수 있습니다." }, { status: 403 }) };
  }

  return { club };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "student") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clubId = (searchParams.get("clubId") || "").trim();
    if (!clubId) {
      return NextResponse.json({ error: "clubId가 필요합니다." }, { status: 400 });
    }

    const authResult = await getAuthorizedClubForStudent(clubId, session.user.id, session.user.school);
    if (authResult.error) return authResult.error;

    const prismaAny = prisma as any;
    const row = await prismaAny.clubStudentExpression.findUnique({
      where: {
        clubId_studentId: {
          clubId,
          studentId: session.user.id,
        },
      },
      select: {
        content: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      expression: {
        content: row?.content || "",
        updatedAt: row?.updatedAt?.toISOString?.() || row?.updatedAt || null,
      },
    });
  } catch (error) {
    console.error("Error fetching club student expression:", error);
    return NextResponse.json(
      { error: "학생 활동 표현을 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "student") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const validated = saveExpressionSchema.parse(body);
    const content = validated.content.trim();

    const authResult = await getAuthorizedClubForStudent(
      validated.clubId,
      session.user.id,
      session.user.school
    );
    if (authResult.error) return authResult.error;

    const prismaAny = prisma as any;
    const saved = await prismaAny.clubStudentExpression.upsert({
      where: {
        clubId_studentId: {
          clubId: validated.clubId,
          studentId: session.user.id,
        },
      },
      update: {
        content,
        updatedAt: new Date(),
      },
      create: {
        clubId: validated.clubId,
        studentId: session.user.id,
        content,
        school: session.user.school || null,
      },
      select: {
        studentId: true,
        content: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: "학생 활동 표현이 저장되었습니다.",
      expression: {
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

    console.error("Error saving club student expression:", error);
    return NextResponse.json(
      { error: "학생 활동 표현 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
