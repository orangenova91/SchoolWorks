import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 방어 로직: 세션에 school 정보가 없으면 빈 배열 반환
    const school = session.user.school || null;
    if (!school) {
      console.warn("User session has no school set; returning empty classLabels");
      return NextResponse.json({ classLabels: [] });
    }

    // 학생 프로필에서 같은 학교의 고유한 classLabel 값들만 가져오기
    const studentProfiles = await prisma.studentProfile.findMany({
      where: {
        school,
        classLabel: {
          not: null,
        },
      },
      select: {
        classLabel: true,
      },
      distinct: ["classLabel"],
    });

    // null이 아닌 값들만 필터링하고 정렬
    const classLabels = studentProfiles
      .map((profile) => profile.classLabel)
      .filter((label): label is string => label !== null && label !== "")
      .sort();

    return NextResponse.json({ classLabels });
  } catch (error) {
    console.error("Get class labels error:", error);
    return NextResponse.json(
      { error: "학반 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

