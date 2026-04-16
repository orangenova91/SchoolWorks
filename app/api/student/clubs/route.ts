import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "student") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const prismaAny = prisma as any;
    const clubs = await prismaAny.club.findMany({
      where: {
        school: session.user.school || undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        clubName: true,
        teacher: true,
        category: true,
        clubType: true,
        studentSelections: true,
      },
    });

    const studentId = session.user.id;
    const myClubs = (clubs || []).filter((club: any) => {
      const selectedIds = new Set(parseStudentSelections(club.studentSelections));
      return selectedIds.has(studentId);
    });

    return NextResponse.json({
      clubs: myClubs,
    });
  } catch (error) {
    console.error("Error fetching student clubs:", error);
    return NextResponse.json(
      { error: "동아리 정보를 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
