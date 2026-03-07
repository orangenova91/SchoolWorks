import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  studentId: z.string(),
  counseledAt: z.string(),
  type: z.enum(["학습", "생활", "진로", "학부모", "기타"]).optional(),
  summary: z.string().optional(),
  content: z.string().min(1, "상담 내용을 입력해주세요."),
  isPrivate: z.boolean().optional(),
  attachments: z.array(z.object({ url: z.string(), name: z.string() })).optional(),
});

// GET: 담임반 상담기록 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "teacher") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classLabel = searchParams.get("classLabel");
    const studentId = searchParams.get("studentId");

    if (!classLabel) {
      return NextResponse.json(
        { error: "classLabel이 필요합니다." },
        { status: 400 }
      );
    }

    const teacherId = session.user.id;

    const classStudents = await (prisma as any).user.findMany({
      where: {
        role: "student",
        ...(session.user.school ? { school: session.user.school } : {}),
        studentProfile: {
          classLabel: classLabel.trim(),
        },
      },
      select: {
        id: true,
        name: true,
        studentProfile: { select: { studentId: true } },
      },
    });
    const studentIds = classStudents.map((s: any) => s.id);
    const studentMap = Object.fromEntries(
      classStudents.map((s: any) => [s.id, s])
    );

    const filterStudentIds =
      studentId && studentIds.includes(studentId) ? [studentId] : studentIds;

    const records =
      filterStudentIds.length > 0
        ? await (prisma as any).counselingRecord.findMany({
            where: {
              teacherId,
              studentId: { in: filterStudentIds },
            },
            orderBy: { counseledAt: "desc" },
          })
        : [];

    return NextResponse.json({
      records: records.map((r: any) => ({
        id: r.id,
        studentId: r.studentId,
        studentName: studentMap[r.studentId]?.name ?? null,
        studentNumber: studentMap[r.studentId]?.studentProfile?.studentId ?? null,
        counseledAt: r.counseledAt,
        type: r.type ?? null,
        summary: r.summary ?? null,
        content: r.content,
        isPrivate: r.isPrivate ?? false,
        attachments: r.attachments ?? null,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET counseling-records error:", error);
    return NextResponse.json(
      { error: "상담기록 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST: 상담기록 등록
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "teacher") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSchema.parse(body);

    const counseledAt = new Date(parsed.counseledAt);
    if (isNaN(counseledAt.getTime())) {
      return NextResponse.json(
        { error: "상담 일시 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const record = await (prisma as any).counselingRecord.create({
      data: {
        studentId: parsed.studentId,
        teacherId: session.user.id,
        counseledAt,
        type: parsed.type ?? null,
        summary: parsed.summary?.trim() || null,
        content: parsed.content.trim(),
        isPrivate: parsed.isPrivate ?? false,
        attachments:
          parsed.attachments && parsed.attachments.length > 0
            ? JSON.stringify(parsed.attachments)
            : null,
      },
    });

    return NextResponse.json({
      message: "상담기록이 등록되었습니다.",
      record: {
        id: record.id,
        studentId: record.studentId,
        counseledAt: record.counseledAt,
        type: record.type,
        summary: record.summary,
        createdAt: record.createdAt,
      },
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }
    console.error("POST counseling-records error:", error);
    return NextResponse.json(
      { error: "상담기록 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
