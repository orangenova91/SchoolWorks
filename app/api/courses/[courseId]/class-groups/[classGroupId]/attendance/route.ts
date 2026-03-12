import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const saveAttendanceSchema = z.object({
  date: z.string().datetime(), // ISO 8601 형식의 날짜 문자열
  attendances: z.array(
    z.object({
      studentId: z.string(),
      status: z.enum([
        "present",
        "late",
        "sick_leave",
        "sick_result",
        "sick_early_leave",
        "approved_absence",
        "excused",
      ]),
    })
  ),
});

// 출결 저장
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: { courseId: string; classGroupId: string };
  }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "출결 저장 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 학반 존재 여부 및 소유권 확인
    const classGroup = await prisma.classGroup.findFirst({
      where: {
        id: params.classGroupId,
        courseId: params.courseId,
        teacherId: session.user.id,
      },
      include: {
        course: true,
      },
    });

    if (!classGroup) {
      return NextResponse.json(
        { error: "학반을 찾을 수 없거나 저장 권한이 없습니다." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = saveAttendanceSchema.parse(body);

    const attendanceDate = new Date(validatedData.date);
    const dateOnly = new Date(attendanceDate);
    dateOnly.setUTCHours(0, 0, 0, 0);

    // 출석(present)은 레코드로 저장하지 않음. 없으면 출석으로 처리.
    // 출석인 학생: 기존 레코드가 있으면 삭제
    const presentStudentIds = validatedData.attendances
      .filter((a) => a.status === "present")
      .map((a) => a.studentId);
    if (presentStudentIds.length > 0) {
      await (prisma as any).attendance.deleteMany({
        where: {
          classGroupId: params.classGroupId,
          studentId: { in: presentStudentIds },
          date: dateOnly,
        },
      });
    }

    // 출석이 아닌 경우만 upsert (지각, 병결, 인정결, 공결)
    const nonPresent = validatedData.attendances.filter((a) => a.status !== "present");
    const results = await Promise.all(
      nonPresent.map(async (attendance) => {
        return await (prisma as any).attendance.upsert({
          where: {
            classGroupId_studentId_date: {
              classGroupId: params.classGroupId,
              studentId: attendance.studentId,
              date: dateOnly,
            },
          },
          update: {
            status: attendance.status,
            updatedAt: new Date(),
          },
          create: {
            classGroupId: params.classGroupId,
            studentId: attendance.studentId,
            date: dateOnly,
            status: attendance.status,
            teacherId: session.user.id,
          },
        });
      })
    );

    // 해당 학반·날짜의 '출결 저장 완료' 메타데이터 기록 (진위 파악용)
    await (prisma as any).attendanceSaveRecord.upsert({
      where: {
        classGroupId_date: {
          classGroupId: params.classGroupId,
          date: dateOnly,
        },
      },
      update: {},
      create: {
        classGroupId: params.classGroupId,
        date: dateOnly,
      },
    });

    return NextResponse.json(
      {
        message: "출결이 성공적으로 저장되었습니다.",
        count: presentStudentIds.length + results.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("출결 저장 오류:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "입력 데이터가 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "출결 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 특정 날짜의 출결 조회
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: { courseId: string; classGroupId: string };
  }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "출결 조회 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 학반 존재 여부 및 소유권 확인
    const classGroup = await prisma.classGroup.findFirst({
      where: {
        id: params.classGroupId,
        courseId: params.courseId,
        teacherId: session.user.id,
      },
    });

    if (!classGroup) {
      return NextResponse.json(
        { error: "학반을 찾을 수 없거나 조회 권한이 없습니다." },
        { status: 404 }
      );
    }

    // 쿼리 파라미터에서 날짜 가져오기
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    if (!dateParam) {
      return NextResponse.json(
        { error: "날짜 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const attendanceDate = new Date(dateParam);
    const dateOnly = new Date(attendanceDate);
    dateOnly.setUTCHours(0, 0, 0, 0);

    // 해당 날짜의 출결 조회 (자정 기준 날짜로 통일)
    const attendances = await (prisma as any).attendance.findMany({
      where: {
        classGroupId: params.classGroupId,
        date: dateOnly,
      },
    });

    // 해당 학반·날짜의 '출결 저장 완료' 여부 (전원 출석 시에도 진위 파악)
    const saveRecord = await (prisma as any).attendanceSaveRecord.findUnique({
      where: {
        classGroupId_date: {
          classGroupId: params.classGroupId,
          date: dateOnly,
        },
      },
    });

    return NextResponse.json(
      { attendances, saved: !!saveRecord },
      { status: 200 }
    );
  } catch (error) {
    console.error("출결 조회 오류:", error);
    return NextResponse.json(
      { error: "출결 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 특정 날짜의 출결 저장 취소 (출결 레코드 + 저장 완료 메타데이터 삭제)
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: { courseId: string; classGroupId: string };
  }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "teacher") {
      return NextResponse.json(
        { error: "출결 저장 취소 권한이 없습니다." },
        { status: 403 }
      );
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
        { error: "학반을 찾을 수 없거나 취소 권한이 없습니다." },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    if (!dateParam) {
      return NextResponse.json(
        { error: "날짜 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const attendanceDate = new Date(dateParam);
    const dateOnly = new Date(attendanceDate);
    dateOnly.setUTCHours(0, 0, 0, 0);

    const deletedAttendance = await (prisma as any).attendance.deleteMany({
      where: {
        classGroupId: params.classGroupId,
        date: dateOnly,
      },
    });

    const deletedSaveRecord = await (prisma as any).attendanceSaveRecord.deleteMany({
      where: {
        classGroupId: params.classGroupId,
        date: dateOnly,
      },
    });

    return NextResponse.json(
      {
        message: "출결 저장이 취소되었습니다.",
        deletedAttendances: deletedAttendance?.count ?? 0,
        deletedSaveRecords: deletedSaveRecord?.count ?? 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("출결 저장 취소 오류:", error);
    return NextResponse.json(
      { error: "출결 저장 취소 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

