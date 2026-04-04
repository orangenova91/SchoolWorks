import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  assertSameSchoolForAnnouncement,
  rejectUnauthenticated,
  requireSession,
} from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!requireSession(session)) {
      return rejectUnauthenticated();
    }

    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "조회 권한이 없습니다." }, { status: 403 });
    }

    const announcement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        authorId: true,
        school: true,
        selectedClasses: true,
        parentSelectedClasses: true,
      },
    });

    if (!announcement) {
      return NextResponse.json({ error: "안내문을 찾을 수 없습니다." }, { status: 404 });
    }

    const pendingSchoolErr = assertSameSchoolForAnnouncement(session, announcement.school);
    if (pendingSchoolErr) return pendingSchoolErr;

    if (announcement.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "작성한 교사만 확인할 수 있습니다." },
        { status: 403 }
      );
    }

    const normalizeNumber = (value: string) => value.trim().replace(/^0+/, "");
    const parseClassKey = (profile: { grade?: string | null; classLabel?: string | null; section?: string | null; }) => {
      let grade = profile.grade?.trim() || null;
      let classNumber = profile.section?.trim() || null;
      if (!classNumber) {
        const classLabel = profile.classLabel?.trim() || "";
        const match = classLabel.match(/(\d+)\s*[-학년\s]*(\d+)\s*반?/);
        if (match) {
          if (!grade) {
            grade = match[1];
          }
          classNumber = match[2];
        }
      }
      if (grade && classNumber) {
        return `${normalizeNumber(grade)}-${normalizeNumber(classNumber)}`;
      }
      return null;
    };

    const parseSelectedClasses = (value: any): Array<{ grade: string; classNumber: string }> => {
      if (!value) return [];
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item) => item?.grade && item?.classNumber);
      } catch (error) {
        return [];
      }
    };

    const studentTargets = parseSelectedClasses(announcement.selectedClasses);
    const parentTargets = parseSelectedClasses(announcement.parentSelectedClasses);

    const toClassKey = (item: { grade: string; classNumber: string }) => {
      return `${normalizeNumber(item.grade)}-${normalizeNumber(item.classNumber)}`;
    };

    const studentTargetKeys = new Set(studentTargets.map(toClassKey));
    const parentTargetKeys = new Set(parentTargets.map(toClassKey));

    const consents = await (prisma as any).announcementConsent.findMany({
      where: {
        announcementId: params.id,
        submittedAt: { not: null },
      },
      select: { userId: true },
    });

    const submittedUserIds = new Set(consents.map((item: any) => item.userId));

    const allStudentProfiles = await (prisma as any).studentProfile.findMany({
      where: announcement.school ? { school: announcement.school } : undefined,
      select: { userId: true, grade: true, classLabel: true, section: true },
    });

    const studentTargetsSet = new Set(
      allStudentProfiles
        .filter((profile: any) => {
          if (studentTargetKeys.size === 0) return false;
          const key = parseClassKey(profile);
          return key ? studentTargetKeys.has(key) : false;
        })
        .map((profile: any) => profile.userId)
    );

    const parentTargetsSet = new Set(
      allStudentProfiles
        .filter((profile: any) => {
          if (parentTargetKeys.size === 0) return false;
          const key = parseClassKey(profile);
          return key ? parentTargetKeys.has(key) : false;
        })
        .map((profile: any) => profile.userId)
    );

    const targetStudentIds = Array.from(studentTargetsSet);
    const parentTargetStudentIds = Array.from(parentTargetsSet);

    const pendingStudents =
      targetStudentIds.length === 0
        ? []
        : await (prisma as any).user.findMany({
            where: {
              id: { in: targetStudentIds },
              role: "student",
              id: { notIn: Array.from(submittedUserIds) },
            },
            select: {
              id: true,
              name: true,
              email: true,
              studentProfile: {
                select: { studentId: true },
              },
            },
          });

    const pendingParents =
      parentTargetStudentIds.length === 0
        ? []
        : await (prisma as any).user.findMany({
            where: {
              role: "parent",
              ...(announcement.school ? { school: announcement.school } : {}),
              id: { notIn: Array.from(submittedUserIds) },
              parentProfile: {
                studentIds: { hasSome: parentTargetStudentIds },
              },
            },
            select: {
              id: true,
              name: true,
              email: true,
              parentProfile: {
                select: { studentIds: true },
              },
            },
          });

    const targetChildIds = Array.from(
      new Set([
        ...pendingParents.flatMap((user: any) => user.parentProfile?.studentIds || []),
        ...parentTargetStudentIds,
      ])
    );

    const children = targetChildIds.length
      ? await (prisma as any).user.findMany({
          where: { id: { in: targetChildIds } },
          include: { studentProfile: true },
        })
      : [];

    const childrenById = new Map(
      children.map((child: any) => [child.id, child])
    );

    return NextResponse.json({
      pending: {
        students: pendingStudents.map((user: any) => ({
          userId: user.id,
          name: user.name || null,
          email: user.email || null,
          studentId: user.studentProfile?.studentId || null,
        })),
        parents: pendingParents.map((user: any) => {
          const studentId = (user.parentProfile?.studentIds || [])
            .map((id: string) => childrenById.get(id))
            .filter(Boolean)
            .map((child: any) => child.studentProfile?.studentId)
            .find((id: string | undefined) => id);
          return {
            userId: user.id,
            name: user.name || null,
            email: user.email || null,
            studentId: studentId || null,
          };
        }),
      },
    });
  } catch (error) {
    console.error("Get pending consents error:", error);
    return NextResponse.json(
      { error: "미제출자 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
