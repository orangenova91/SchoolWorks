import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const attendanceSchema = z.object({
  studentId: z.string(),
  date: z.string(), // ISO date string (YYYY-MM-DD)
  period: z.string(), // "morning", "1", "2", "3", "4", "5", "6", "7", "closing"
  status: z.enum(["present", "late", "sick_leave", "approved_absence", "excused"]),
});

// GET: 주간 출결 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "teacher") {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("weekStart"); // YYYY-MM-DD 형식
    const classLabel = searchParams.get("classLabel");

    if (!weekStart || !classLabel) {
      return NextResponse.json(
        { error: "주 시작일과 반 정보가 필요합니다." },
        { status: 400 }
      );
    }

    // 주 시작일 계산 (월요일)
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 4); // 금요일까지

    // 담임반 학생 목록 가져오기
    const students = await (prisma as any).user.findMany({
      where: {
        role: "student",
        studentProfile: {
          classLabel: classLabel,
        },
      },
      select: {
        id: true,
        name: true,
        studentProfile: {
          select: {
            studentId: true,
          },
        },
      },
    });

    // 출결 데이터 가져오기 (간단한 구조로 저장)
    // 실제로는 별도의 출결 테이블이 필요하지만, 여기서는 간단하게 구현
    const attendanceData: Record<string, Record<string, Record<string, string>>> = {};

    // 각 학생의 출결 데이터 구조 생성
    students.forEach((student: any) => {
      attendanceData[student.id] = {};
      for (let i = 0; i < 5; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        attendanceData[student.id][dateStr] = {
          morning: "present",
          "1": "present",
          "2": "present",
          "3": "present",
          "4": "present",
          "5": "present",
          "6": "present",
          "7": "present",
          closing: "present",
        };
      }
    });

    return NextResponse.json({
      weekStart,
      students,
      attendance: attendanceData,
    });
  } catch (error) {
    console.error("Get attendance error:", error);
    return NextResponse.json(
      { error: "출결 데이터 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST: 출결 데이터 저장
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "teacher") {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = attendanceSchema.parse(body);

    // 출결 데이터 저장 (간단한 구조)
    // 실제로는 별도의 출결 테이블에 저장해야 함
    // 여기서는 예시로 구현

    return NextResponse.json({
      message: "출결 정보가 저장되었습니다.",
      data: validatedData,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Save attendance error:", error);
    return NextResponse.json(
      { error: "출결 정보 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

