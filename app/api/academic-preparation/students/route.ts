import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const students = await prisma.user.findMany({
      where: {
        role: "student",
        school: session.user.school || undefined,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // StudentProfile에서 studentId, grade, classLabel, classOfficer, officerAssists, studentCouncilRole 포함
    const studentIds = students.map(s => s.id);
    const prismaAny = prisma as any;
    const studentProfiles = studentIds.length > 0
      ? await prismaAny.studentProfile.findMany({
          where: { userId: { in: studentIds } },
          select: { userId: true, studentId: true, grade: true, classLabel: true, classOfficer: true, officerAssists: true, studentCouncilRole: true },
        })
      : [];

    const profileMap = new Map(
      studentProfiles.map((p: any) => [
        p.userId,
        {
          studentId: p.studentId,
          grade: p.grade ?? null,
          classLabel: p.classLabel ?? null,
          classOfficer: p.classOfficer ?? null,
          officerAssists: Array.isArray(p.officerAssists) ? p.officerAssists : [],
          studentCouncilRole: p.studentCouncilRole ?? null,
        },
      ])
    );

    const studentsWithId = students.map(student => {
      const profile = profileMap.get(student.id);
      return {
        id: student.id,
        name: student.name,
        email: student.email,
        studentId: profile?.studentId || null,
        grade: profile?.grade ?? null,
        classLabel: profile?.classLabel ?? null,
        classOfficer: profile?.classOfficer ?? null,
        officerAssists: profile?.officerAssists ?? [],
        studentCouncilRole: profile?.studentCouncilRole ?? null,
      };
    });

    return NextResponse.json({ students: studentsWithId });
  } catch (error: any) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "학생 목록을 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

