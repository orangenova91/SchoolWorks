import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateSchema = z
  .object({
    type: z.enum(["결석 (질병)", "결석 (인정)", "결석 (기타)", "조퇴", "지각", "결과"]),
    reason: z.string().min(1, "출결 사유를 입력해주세요."),
    periodFrom: z.string().optional(),
    periodTo: z.string().optional(),
    period: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    writtenAt: z.string(),
  })
  .refine(
    (data) => {
      if (data.type === "조퇴") return !!data.periodFrom;
      if (data.type === "지각") return !!data.periodTo;
      if (data.type === "결과") return !!data.period?.trim();
      return !!data.endDate;
    },
    {
      message:
        "조퇴인 경우 교시(부터)를, 지각인 경우 교시(까지)를, 결과인 경우 교시를, 그 외에는 종료 일자를 입력해주세요.",
    }
  );

// PUT: 출결 수정
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

    const startDate = new Date(parsed.startDate);
    const endDate =
      parsed.type === "조퇴" || parsed.type === "지각" || parsed.type === "결과"
        ? new Date(parsed.startDate)
        : new Date(parsed.endDate!);
    const writtenAt = new Date(parsed.writtenAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(writtenAt.getTime())) {
      return NextResponse.json(
        { error: "날짜 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }
    if (parsed.type !== "조퇴" && parsed.type !== "지각" && parsed.type !== "결과" && endDate < startDate) {
      return NextResponse.json(
        { error: "종료 일자는 시작 일자 이후여야 합니다." },
        { status: 400 }
      );
    }

    const existing = await (prisma as any).homeroomAttendance.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "출결 기록을 찾을 수 없습니다." }, { status: 404 });
    }
    if (existing.teacherId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const record = await (prisma as any).homeroomAttendance.update({
      where: { id },
      data: {
        type: parsed.type,
        reason: parsed.reason.trim() || null,
        periodFrom: parsed.type === "조퇴" ? parsed.periodFrom || null : null,
        periodTo: parsed.type === "지각" ? parsed.periodTo || null : null,
        period: parsed.type === "결과" ? parsed.period?.trim() || null : null,
        startDate,
        endDate,
        writtenAt,
      },
    });

    return NextResponse.json({
      message: "출결이 수정되었습니다.",
      record: {
        id: record.id,
        studentId: record.studentId,
        type: record.type,
        reason: record.reason,
        startDate: record.startDate,
        endDate: record.endDate,
        writtenAt: record.writtenAt,
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
    console.error("PUT homeroom-attendance error:", error);
    return NextResponse.json(
      { error: "출결 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: 출결 삭제
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

    const existing = await (prisma as any).homeroomAttendance.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "출결 기록을 찾을 수 없습니다." }, { status: 404 });
    }
    if (existing.teacherId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    await (prisma as any).homeroomAttendance.delete({
      where: { id },
    });

    return NextResponse.json({ message: "출결이 삭제되었습니다." });
  } catch (error) {
    console.error("DELETE homeroom-attendance error:", error);
    return NextResponse.json(
      { error: "출결 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
