import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createLinkSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요"),
  url: z.string().trim().url("올바른 URL을 입력하세요"),
});

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

    const links = await prisma.collaborativeDocLink.findMany({
      where: { teacherId: session.user.id },
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

    const body = await request.json();
    const validatedData = createLinkSchema.parse(body);

    const count = await prisma.collaborativeDocLink.count({
      where: { teacherId: session.user.id },
    });

    const newLink = await prisma.collaborativeDocLink.create({
      data: {
        teacherId: session.user.id,
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
