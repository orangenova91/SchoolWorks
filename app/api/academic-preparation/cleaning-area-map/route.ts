import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const saveMapSchema = z
  .object({
    imageUrl: z.string().url("유효한 이미지 URL을 입력하세요").optional(),
    guideContent: z.string().nullable().optional(),
  })
  .refine((data) => data.imageUrl !== undefined || data.guideContent !== undefined, {
    message: "imageUrl 또는 guideContent 중 하나 이상을 입력하세요.",
  });

export const dynamic = "force-dynamic";

// 청소구역 배치도 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const school = session.user.school;
    if (!school) {
      return NextResponse.json({ imageUrl: null, guideContent: null });
    }

    const map = await (prisma as any).cleaningAreaMap.findUnique({
      where: { school },
    });

    return NextResponse.json({
      imageUrl: map?.imageUrl ?? null,
      guideContent: map?.guideContent ?? null,
    });
  } catch (error: unknown) {
    console.error("Error fetching cleaning area map:", error);
    return NextResponse.json(
      { error: "배치도를 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

// 청소구역 배치도 등록/수정 (upsert)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const school = session.user.school;
    if (!school) {
      return NextResponse.json(
        { error: "학교 정보가 없습니다." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = saveMapSchema.parse(body);

    const existing = await (prisma as any).cleaningAreaMap.findUnique({
      where: { school },
    });

    const updateData: { imageUrl?: string | null; guideContent?: string | null } = {};
    if (validatedData.imageUrl !== undefined) updateData.imageUrl = validatedData.imageUrl;
    if (validatedData.guideContent !== undefined) updateData.guideContent = validatedData.guideContent;

    if (existing) {
      await (prisma as any).cleaningAreaMap.update({
        where: { school },
        data: updateData,
      });
    } else {
      await (prisma as any).cleaningAreaMap.create({
        data: {
          school,
          imageUrl: updateData.imageUrl ?? null,
          guideContent: updateData.guideContent ?? null,
        },
      });
    }

    const message =
      updateData.imageUrl !== undefined && updateData.guideContent !== undefined
        ? "배치도와 청소안내가 저장되었습니다."
        : updateData.imageUrl !== undefined
          ? "배치도가 저장되었습니다."
          : "청소안내가 저장되었습니다.";

    return NextResponse.json({
      message,
      imageUrl: updateData.imageUrl ?? existing?.imageUrl ?? null,
      guideContent: updateData.guideContent ?? existing?.guideContent ?? null,
    });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && (error as { name: string }).name === "ZodError") {
      const zodError = error as { errors?: Array<{ message?: string }> };
      return NextResponse.json(
        { error: zodError.errors?.[0]?.message || "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }
    console.error("Error saving cleaning area map:", error);
    return NextResponse.json(
      { error: "배치도 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
