import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createLinkSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요"),
  url: z.string().trim().url("올바른 URL을 입력하세요"),
});

async function getUserSchool(user: {
  id: string;
  role?: string | null;
  school?: string | null;
}): Promise<string | null> {
  if (user.school) {
    return user.school;
  }

  if (user.role === "teacher") {
    const profile = await (prisma as any).teacherProfile.findUnique({
      where: { userId: user.id },
      select: { school: true },
    });
    if (profile?.school) {
      return profile.school;
    }
  }

  return null;
}

export const dynamic = "force-dynamic";

// 협업 문서 링크 목록 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "teacher" && role !== "admin") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const school = await getUserSchool(session.user);

    if (!school) {
      return NextResponse.json(
        { error: "학교 정보가 설정되지 않아 협업 문서를 조회할 수 없습니다." },
        { status: 400 }
      );
    }

    const links = await prisma.collaborativeDocLink.findMany({
      where: {
        OR: [
          // 학교 단위로 공유되는 링크
          { school },
          // 과거에 개인 단위로 생성된 링크 (school 필드가 비어 있고, 본인이 생성한 링크)
          { school: null, teacherId: session.user.id },
        ],
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        url: true,
        order: true,
        createdAt: true,
      },
    });

    const formatted = links.map((l) => ({
      ...l,
      createdAt: l.createdAt?.toISOString?.() ?? l.createdAt,
    }));

    return NextResponse.json({ links: formatted });
  } catch (error: unknown) {
    console.error("Error fetching collaborative doc links:", error);
    return NextResponse.json(
      { error: "협업 문서 링크 목록을 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

// 협업 문서 링크 추가
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "teacher" && role !== "admin") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const school = await getUserSchool(session.user);

    if (!school) {
      return NextResponse.json(
        { error: "학교 정보가 설정되지 않아 협업 문서를 추가할 수 없습니다." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = createLinkSchema.parse(body);

    const count = await prisma.collaborativeDocLink.count({
      where: {
        // 학교 단위로 정렬 순서를 관리
        school,
      },
    });

    const newLink = await prisma.collaborativeDocLink.create({
      data: {
        teacherId: session.user.id,
        school,
        title: validatedData.title,
        url: validatedData.url,
        order: count,
      },
    });

    return NextResponse.json(
      {
        message: "링크가 추가되었습니다.",
        link: {
          id: newLink.id,
          title: newLink.title,
          url: newLink.url,
          order: newLink.order,
          createdAt: newLink.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
      const zodError = error as z.ZodError;
      const msg = zodError.errors[0]?.message ?? "입력값이 올바르지 않습니다.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("Error creating collaborative doc link:", error);
    return NextResponse.json(
      { error: "협업 문서 링크 추가에 실패했습니다." },
      { status: 500 }
    );
  }
}
