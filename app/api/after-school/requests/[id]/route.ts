import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  courseName: z.string().trim().min(1).max(200).optional(),
  desiredContent: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  companionAction: z.enum(["add", "remove"]).optional(),
  status: z.enum(["pending", "approved", "rejected", "ended"]).optional(),
});

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const existing = await (prisma as any).afterSchoolCourseRequest.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });

    const body = await request.json();
    const validated = updateSchema.parse(body);

    const isAuthor = existing.studentId === session.user.id;

    // Teacher can update status/content fields (but not companion list)
    if (session.user.role === "teacher") {
      if (validated.companionAction) {
        return NextResponse.json({ error: "교사는 함께 신청을 수정할 수 없습니다." }, { status: 400 });
      }
      const dataToUpdate: any = {};
      if (validated.status !== undefined) dataToUpdate.status = validated.status;
      if (validated.courseName !== undefined) dataToUpdate.courseName = validated.courseName;
      if (validated.desiredContent !== undefined) dataToUpdate.desiredContent = validated.desiredContent;
      if (validated.notes !== undefined) dataToUpdate.notes = validated.notes;

      if (Object.keys(dataToUpdate).length === 0) {
        return NextResponse.json({ error: "변경할 값이 필요합니다." }, { status: 400 });
      }
      const updated = await (prisma as any).afterSchoolCourseRequest.update({
        where: { id: params.id },
        data: dataToUpdate,
      });
      return NextResponse.json({ request: updated });
    }

    // Helper to compute display string "학번 이름, 학번 이름"
    const buildDisplay = async (userIds: string[]) => {
      if (userIds.length === 0) return null;
      const users = await (prisma as any).user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          studentProfile: { select: { studentId: true } },
        },
      });
      const byId = new Map(users.map((u: any) => [u.id, u]));
      const parts = userIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((u: any) => {
          const sid = u.studentProfile?.studentId?.trim() || "";
          const nm = (u.name || u.email || "").trim();
          return sid ? `${sid} ${nm}`.trim() : nm;
        })
        .filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : null;
    };

    // If caller is not the original author:
    // - allow join/leave actions only for students
    // - do NOT allow changing other fields
    if (existing.studentId !== session.user.id) {
      if (session.user.role !== "student" || !validated.companionAction) {
        return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
      }

      // cannot join your own post (author)
      if (existing.studentId === session.user.id) {
        return NextResponse.json({ error: "본인 신청에는 함께 신청할 수 없습니다." }, { status: 400 });
      }

      const currentIds: string[] = Array.isArray(existing.companionStudentUserIds) ? existing.companionStudentUserIds : [];
      const set = new Set(currentIds);
      if (validated.companionAction === "add") set.add(session.user.id);
      if (validated.companionAction === "remove") set.delete(session.user.id);
      const nextIds = Array.from(set);
      const display = await buildDisplay(nextIds);

      const updated = await (prisma as any).afterSchoolCourseRequest.update({
        where: { id: params.id },
        data: {
          companionStudentUserIds: nextIds,
          companionStudents: display,
        },
      });

      return NextResponse.json({ request: updated });
    }

    // Author can update content fields (not companion list)
    const updated = await (prisma as any).afterSchoolCourseRequest.update({
      where: { id: params.id },
      data: {
        courseName: validated.courseName ?? existing.courseName,
        desiredContent: validated.desiredContent ?? existing.desiredContent,
        notes: validated.notes ?? existing.notes,
      },
    });

    return NextResponse.json({ request: updated });
  } catch (err: any) {
    console.error("Update request error:", err);
    return NextResponse.json({ error: "수정 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const existing = await (prisma as any).afterSchoolCourseRequest.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });

    // author or teacher can delete
    if (existing.studentId !== session.user.id && session.user.role !== "teacher") {
      return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
    }

    await (prisma as any).afterSchoolCourseRequest.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "삭제되었습니다." });
  } catch (err) {
    console.error("Delete request error:", err);
    return NextResponse.json({ error: "삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}


