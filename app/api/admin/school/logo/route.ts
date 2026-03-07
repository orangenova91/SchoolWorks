import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put, del } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bodySchoolId = formData.get("schoolId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "이미지 크기는 5MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        school: true,
        adminProfile: {
          select: {
            schoolId: true,
            school: { select: { name: true } },
          },
        },
      },
    });

    const normalizedSchoolName =
      currentUser?.adminProfile?.school?.name?.trim() ||
      currentUser?.school?.trim() ||
      null;

    // 클라이언트에서 전달한 schoolId가 있으면 권한 검증 후 사용
    let school: { id: string } | null = null;
    if (bodySchoolId?.trim()) {
      const candidate = await prisma.school.findUnique({
        where: { id: bodySchoolId.trim() },
        select: { id: true, adminUserId: true, name: true },
      });
      const allowed =
        candidate &&
        (candidate.adminUserId === session.user.id ||
          candidate.id === currentUser?.adminProfile?.schoolId ||
          (!!normalizedSchoolName && candidate.name?.trim() === normalizedSchoolName));
      if (allowed) {
        school = { id: candidate.id };
      }
    }

    // 여러 경로로 학교 후보 탐색 (하나가 실패해도 다음 방법 시도)
    if (!school && currentUser?.adminProfile?.schoolId) {
      school = await prisma.school.findUnique({
        where: { id: currentUser.adminProfile.schoolId },
        select: { id: true },
      });
    }
    if (!school && normalizedSchoolName) {
      school = await prisma.school.findFirst({
        where: { name: normalizedSchoolName },
        select: { id: true },
      });
    }
    if (!school) {
      school = await prisma.school.findFirst({
        where: { adminUserId: session.user.id },
        select: { id: true },
      });
    }

    if (!school) {
      return NextResponse.json(
        { error: "연결된 학교 정보를 찾을 수 없습니다. 관리자 계정이 학교에 연결되어 있는지 확인해주세요." },
        { status: 404 }
      );
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const extension = file.name.split(".").pop() || "jpg";
    const filename = `schools/${school.id}/${timestamp}-${randomStr}.${extension}`;

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    });

    if (normalizedSchoolName) {
      await prisma.school.updateMany({
        where: { name: normalizedSchoolName },
        data: { logoUrl: blob.url },
      });
    } else {
      await prisma.school.update({
        where: { id: school.id },
        data: { logoUrl: blob.url },
      });
    }

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("School logo upload error:", error);
    return NextResponse.json(
      { error: "로고 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const querySchoolId = searchParams.get("schoolId");

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        school: true,
        adminProfile: {
          select: {
            schoolId: true,
            school: { select: { name: true } },
          },
        },
      },
    });

    const normalizedSchoolName =
      currentUser?.adminProfile?.school?.name?.trim() ||
      currentUser?.school?.trim() ||
      null;

    const schoolCandidates: Array<{
      id: string;
      logoUrl: string | null;
      updatedAt: Date;
    }> = [];

    // 쿼리로 전달된 schoolId가 있으면 권한 검증 후 후보에 추가
    if (querySchoolId?.trim()) {
      const candidate = await prisma.school.findUnique({
        where: { id: querySchoolId.trim() },
        select: { id: true, logoUrl: true, updatedAt: true, adminUserId: true, name: true },
      });
      const allowed =
        candidate &&
        (candidate.adminUserId === session.user.id ||
          candidate.id === currentUser?.adminProfile?.schoolId ||
          (!!normalizedSchoolName && candidate.name?.trim() === normalizedSchoolName));
      if (allowed) {
        schoolCandidates.push({
          id: candidate.id,
          logoUrl: candidate.logoUrl,
          updatedAt: candidate.updatedAt,
        });
      }
    }

    if (currentUser?.adminProfile?.schoolId) {
      const primarySchool = await prisma.school.findUnique({
        where: { id: currentUser.adminProfile.schoolId },
        select: { id: true, logoUrl: true, updatedAt: true },
      });
      if (primarySchool && !schoolCandidates.some((s) => s.id === primarySchool.id)) {
        schoolCandidates.push(primarySchool);
      }
    }

    if (normalizedSchoolName) {
      const nameSchools = await prisma.school.findMany({
        where: { name: normalizedSchoolName },
        select: { id: true, logoUrl: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      });
      for (const s of nameSchools) {
        if (!schoolCandidates.some((c) => c.id === s.id)) schoolCandidates.push(s);
      }
    }
    if (!schoolCandidates.length) {
      const adminSchools = await prisma.school.findMany({
        where: { adminUserId: session.user.id },
        select: { id: true, logoUrl: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      });
      schoolCandidates.push(...adminSchools);
    }

    const schoolWithLogo = schoolCandidates.find((item) => item.logoUrl);
    const school = schoolWithLogo ?? schoolCandidates[0] ?? null;

    if (!school) {
      return NextResponse.json(
        { error: "연결된 학교 정보를 찾을 수 없습니다. 관리자 계정이 학교에 연결되어 있는지 확인해주세요." },
        { status: 404 }
      );
    }

    if (school.logoUrl) {
      try {
        await del(school.logoUrl);
      } catch (error) {
        console.warn("School logo deletion warning:", error);
      }
    }

    if (normalizedSchoolName) {
      await prisma.school.updateMany({
        where: { name: normalizedSchoolName },
        data: { logoUrl: null },
      });
    } else {
      await prisma.school.update({
        where: { id: school.id },
        data: { logoUrl: null },
      });
    }

    return NextResponse.json({ url: null });
  } catch (error) {
    console.error("School logo delete error:", error);
    return NextResponse.json(
      { error: "로고 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
