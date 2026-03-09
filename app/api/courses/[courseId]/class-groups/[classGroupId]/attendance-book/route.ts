import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// DELETE: 방과후 출석부 삭제 (학반 시작일/날짜조정 초기화 + 출결/저장메타 삭제)
export async function DELETE(
  _request: NextRequest,
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

    await (prisma as any).classGroup.update({
      where: { id: params.classGroupId },
      data: { courseStartDate: null, dateOverrides: null, updatedAt: new Date() },
    });

    const deletedAttendances = await (prisma as any).attendance.deleteMany({
      where: { classGroupId: params.classGroupId },
    });

    const deletedSaveRecords = await (prisma as any).attendanceSaveRecord.deleteMany({
      where: { classGroupId: params.classGroupId },
    });

    return NextResponse.json(
      {
        message: "출석부가 삭제되었습니다.",
        deletedAttendances: deletedAttendances?.count ?? 0,
        deletedSaveRecords: deletedSaveRecords?.count ?? 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("attendance-book DELETE error:", error);
    return NextResponse.json(
      { error: "출석부 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

