import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  counseledAt: z.string(),
  type: z.enum(["학습", "생활", "진로", "학부모", "기타"]).optional(),
  summary: z.string().optional(),
  content: z.string().min(1, "상담 내용을 입력해주세요."),
  isPrivate: z.boolean().optional(),
  attachments: z.array(z.object({ url: z.string(), name: z.string() })).optional(),
});

// GET: 상담기록 한 건 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "teacher") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const id = params.id;
    const record = await (prisma as any).counselingRecord.findUnique({
      where: { id },
    });

    if (!record) {
      return NextResponse.json(
        { error: "상담기록을 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    if (record.teacherId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const student = await (prisma as any).user.findUnique({
      where: { id: record.studentId },
      select: {
        name: true,
        studentProfile: { select: { studentId: true } },
      },
    });

    return NextResponse.json({
      record: {
        id: record.id,
        studentId: record.studentId,
        studentName: student?.name ?? null,
        studentNumber: student?.studentProfile?.studentId ?? null,
        counseledAt: record.counseledAt,
        type: record.type,
        summary: record.summary,
        content: record.content,
        isPrivate: record.isPrivate,
        attachments: record.attachments,
        createdAt: record.createdAt,
      },
    });
  } catch (error) {
    console.error("GET counseling-records [id] error:", error);
    return NextResponse.json(
      { error: "상담기록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PUT: 상담기록 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "teacher") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const id = params.id;
    const body = await request.json();
    const parsed = updateSchema.parse(body);

    const counseledAt = new Date(parsed.counseledAt);
    if (isNaN(counseledAt.getTime())) {
      return NextResponse.json(
        { error: "상담 일시 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const existing = await (prisma as any).counselingRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "상담기록을 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    if (existing.teacherId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const record = await (prisma as any).counselingRecord.update({
      where: { id },
      data: {
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
      message: "상담기록이 수정되었습니다.",
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
    console.error("PUT counseling-records error:", error);
    return NextResponse.json(
      { error: "상담기록 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: 상담기록 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "teacher") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const id = params.id;
    const existing = await (prisma as any).counselingRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "상담기록을 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    if (existing.teacherId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    await (prisma as any).counselingRecord.delete({
      where: { id },
    });

    return NextResponse.json({ message: "상담기록이 삭제되었습니다." });
  } catch (error) {
    console.error("DELETE counseling-records error:", error);
    return NextResponse.json(
      { error: "상담기록 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
