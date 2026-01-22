import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findAccountSchema } from "@/lib/validations/auth";

// Rate limiting을 위한 간단한 메모리 저장소 (프로덕션에서는 Redis 사용 권장)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, maxRequests = 10, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validatedData = findAccountSchema.parse(body);

    let user = null;

    if (validatedData.role === "staff") {
      // 교직원: teacher, admin, superadmin 역할 중에서 학교명과 이름으로 찾기
      user = await prisma.user.findFirst({
        where: {
          role: {
            in: ["teacher", "admin", "superadmin"],
          },
          school: validatedData.school,
          name: validatedData.name,
        },
        select: {
          email: true,
        },
      });
    } else if (validatedData.role === "student") {
      // 학생: 학교명, 학번, 이름으로 찾기
      user = await prisma.user.findFirst({
        where: {
          role: "student",
          school: validatedData.school,
          name: validatedData.name,
          studentProfile: {
            studentId: validatedData.studentNumber,
          },
        },
        select: {
          email: true,
        },
      });
    } else if (validatedData.role === "parent") {
      // 학부모: 자녀의 학번과 이름으로 자녀를 찾고, 그 자녀의 부모 계정 찾기
      // 1. 먼저 자녀(학생) 계정 찾기
      const childStudent = await prisma.user.findFirst({
        where: {
          role: "student",
          school: validatedData.school,
          name: validatedData.name,
          studentProfile: {
            studentId: validatedData.studentNumber,
          },
        },
        select: {
          id: true,
        },
      });

      if (childStudent) {
        // 2. 자녀의 ID로 학부모 계정 찾기
        const parentProfile = await prisma.parentProfile.findFirst({
          where: {
            studentIds: {
              has: childStudent.id,
            },
          },
          select: {
            userId: true,
          },
        });

        if (parentProfile) {
          // 3. 학부모 User 계정 찾기
          user = await prisma.user.findUnique({
            where: {
              id: parentProfile.userId,
            },
            select: {
              email: true,
            },
          });
        }
      }
    }

    // 보안: 계정 존재 여부를 구분하지 않기 위해 항상 동일한 응답 형식 반환
    if (!user) {
      return NextResponse.json(
        { error: "일치하는 계정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        email: user.email,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Find account error:", error);
    return NextResponse.json(
      { error: "계정 찾기 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

