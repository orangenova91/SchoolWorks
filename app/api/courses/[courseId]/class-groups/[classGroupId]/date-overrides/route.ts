import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  dateOverrides: z.record(z.string(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export const dynamic = "force-dynamic";

/** PATCH: 학반별 차시 날짜 조정 저장 (JSON 문자열로 저장) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string; classGroupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const classGroup = await prisma.classGroup.findFirst({
      where: {
        id: params.classGroupId,
        courseId: params.courseId,
        teacherId: session.user.id,
      },
    });

    if (!classGroup) {
      return NextResponse.json(
        { error: "학반을 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = schema.parse(body);
    const dateOverrides = parsed.dateOverrides;
    const jsonString =
      Object.keys(dateOverrides).length === 0 ? null : JSON.stringify(dateOverrides);

    await (prisma as any).classGroup.update({
      where: { id: params.classGroupId },
      data: { dateOverrides: jsonString, updatedAt: new Date() },
    });

    return NextResponse.json(
      { message: "날짜 조정이 저장되었습니다.", dateOverrides: dateOverrides },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }
    console.error("date-overrides PATCH error:", error);
    return NextResponse.json(
      { error: "날짜 조정 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
