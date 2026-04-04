import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateLinkSchema = z.object({
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

// 임시 업무 Link 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: "학교 정보가 설정되지 않아 협업 문서를 수정할 수 없습니다." },
        { status: 400 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateLinkSchema.parse(body);

    const existing = await prisma.collaborativeDocLink.findUnique({
      where: { id },
      select: { teacherId: true, school: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });
    }

    // 학교 단위로 공유되는 링크는 같은 학교 교사라면 수정 가능
    if (existing.school) {
      if (existing.school !== school) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
    } else {
      // 과거에 개인 단위로 생성된 링크는 생성자만 수정 가능
      if (existing.teacherId !== session.user.id) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
    }

    const updated = await prisma.collaborativeDocLink.update({
      where: { id },
      data: {
        title: validatedData.title,
        url: validatedData.url,
      },
    });

    return NextResponse.json({
      message: "링크가 수정되었습니다.",
      link: {
        id: updated.id,
        title: updated.title,
        url: updated.url,
        order: updated.order,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
      const zodError = error as z.ZodError;
      const msg = zodError.errors[0]?.message ?? "입력값이 올바르지 않습니다.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("Error updating collaborative doc link:", error);
    return NextResponse.json(
      { error: "임시 업무 Link 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// 협업 문서 링크 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: "학교 정보가 설정되지 않아 협업 문서를 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    const { id } = await params;

    const existing = await prisma.collaborativeDocLink.findUnique({
      where: { id },
      select: { teacherId: true, school: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });
    }

    // 학교 단위로 공유되는 링크는 같은 학교 교사라면 삭제 가능
    if (existing.school) {
      if (existing.school !== school) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
    } else {
      // 과거에 개인 단위로 생성된 링크는 생성자만 삭제 가능
      if (existing.teacherId !== session.user.id) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
    }

    await prisma.collaborativeDocLink.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "링크가 삭제되었습니다.",
    });
  } catch (error: unknown) {
    console.error("Error deleting collaborative doc link:", error);
    return NextResponse.json(
      { error: "협업 문서 링크 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
