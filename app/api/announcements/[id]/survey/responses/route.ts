import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (session.user.role !== "teacher") {
      return NextResponse.json({ error: "조회 권한이 없습니다." }, { status: 403 });
    }

    const announcement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true, school: true, surveyData: true },
    });
    if (!announcement) {
      return NextResponse.json({ error: "안내문을 찾을 수 없습니다." }, { status: 404 });
    }

    // Only author teacher can view responses
    if (announcement.authorId !== session.user.id) {
      return NextResponse.json({ error: "작성한 교사만 확인할 수 있습니다." }, { status: 403 });
    }

    if (session.user.school && announcement.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    if (announcement.surveyData == null) {
      return NextResponse.json({ error: "설문 데이터가 없습니다." }, { status: 400 });
    }

    const responses = await (prisma as any).announcementSurveyResponse.findMany({
      where: { announcementId: params.id },
      orderBy: { createdAt: "desc" },
    });

    const userIds = responses.map((r: any) => r.userId);
    const users = userIds.length
      ? await (prisma as any).user.findMany({
          where: { id: { in: userIds } },
          include: { studentProfile: true, parentProfile: true },
        })
      : [];

    const usersById = new Map(users.map((u: any) => [u.id, u]));

    // For parent users, resolve their child users to get student numbers
    const parentChildIds = users
      .flatMap((u: any) => (u.parentProfile?.studentIds || []))
      .filter(Boolean);
    const uniqueChildIds = Array.from(new Set(parentChildIds));

    // Try to resolve parentProfile.studentIds as user IDs first
    const childrenById = new Map<string, any>();
    const childrenByStudentId = new Map<string, any>();

    if (uniqueChildIds.length) {
      // Find by user id
      const childrenByUserId = await (prisma as any).user.findMany({
        where: { id: { in: uniqueChildIds } },
        include: { studentProfile: true },
      });
      for (const c of childrenByUserId) {
        if (c?.id) childrenById.set(c.id, c);
        const sid = c?.studentProfile?.studentId;
        if (sid) childrenByStudentId.set(sid, c);
      }

      // Additionally, try to find users where studentProfile.studentId matches any of the uniqueChildIds
      // (covers case where parentProfile.studentIds stores actual studentId values)
      const childrenBySid = await (prisma as any).user.findMany({
        where: { studentProfile: { studentId: { in: uniqueChildIds } } },
        include: { studentProfile: true },
      });
      for (const c of childrenBySid) {
        const sid = c?.studentProfile?.studentId;
        if (sid && !childrenByStudentId.has(sid)) {
          childrenByStudentId.set(sid, c);
        }
        if (c?.id && !childrenById.has(c.id)) {
          childrenById.set(c.id, c);
        }
      }
    }

    // compute stats per question
    let questionList: any[] = [];
    try {
      questionList = typeof announcement.surveyData === "string" ? JSON.parse(announcement.surveyData) : announcement.surveyData;
    } catch {
      questionList = [];
    }

    const stats: any = {
      totalResponses: responses.length,
      questions: {},
    };

    // initialize counts
    for (const q of questionList || []) {
      if (q.type === "single" || q.type === "multiple") {
        stats.questions[q.id] = {
          id: q.id,
          question: q.question,
          type: q.type,
          optionCounts: (q.options || []).reduce((acc: any, opt: string) => {
            acc[opt] = 0;
            return acc;
          }, {} as Record<string, number>),
        };
      } else {
        stats.questions[q.id] = {
          id: q.id,
          question: q.question,
          type: q.type,
          responses: 0,
        };
      }
    }

    // tally responses
    for (const r of responses) {
      let answers: any[] = [];
      try {
        answers = typeof r.answers === "string" ? JSON.parse(r.answers) : r.answers;
      } catch {
        answers = [];
      }
      for (const a of answers || []) {
        const qStat = stats.questions[a.id];
        if (!qStat) continue;
        if (qStat.type === "single") {
          if (a.answer != null && typeof a.answer === "string") {
            qStat.optionCounts[a.answer] = (qStat.optionCounts[a.answer] || 0) + 1;
          }
        } else if (qStat.type === "multiple") {
          if (Array.isArray(a.answer)) {
            for (const sel of a.answer) {
              qStat.optionCounts[sel] = (qStat.optionCounts[sel] || 0) + 1;
            }
          }
        } else {
          if (a.answer != null && a.answer !== "") {
            qStat.responses = (qStat.responses || 0) + 1;
          }
        }
      }
    }

    // cache for resolving arbitrary ids -> studentId
    const resolveCache = new Map<string, string | null>();

    const resolveToStudentId = async (id: string): Promise<string | null> => {
      if (!id) return null;
      if (resolveCache.has(id)) return resolveCache.get(id) || null;

      // try prepopulated maps
      let child = childrenById.get(id) || childrenByStudentId.get(id);
      if (child && child.studentProfile?.studentId) {
        resolveCache.set(id, child.studentProfile.studentId);
        return child.studentProfile.studentId;
      }

      // try usersById (maybe child present there)
      const u = usersById.get(id) as any;
      if (u && u.studentProfile?.studentId) {
        resolveCache.set(id, u.studentProfile.studentId);
        return u.studentProfile.studentId;
      }

      // fallback: try DB lookup by studentProfile.studentId == id OR id == user.id
      try {
        const found = await (prisma as any).user.findFirst({
          where: {
            OR: [
              { id },
              { studentProfile: { studentId: id } },
            ],
          },
          include: { studentProfile: true },
        });
        const sid = found?.studentProfile?.studentId || null;
        resolveCache.set(id, sid);
        return sid;
      } catch (e) {
        resolveCache.set(id, null);
        return null;
      }
    };

    const mapped: any[] = [];
    for (const r of responses) {
      const user = usersById.get(r.userId) as any;
      let studentId: string | null = null;
      if (user) {
        if (user.role === "student") {
          studentId = user.studentProfile?.studentId || null;
        } else if (user.parentProfile?.studentIds?.length) {
          // try all children in order until we find a studentId
          for (const cid of user.parentProfile.studentIds) {
            const sid = await resolveToStudentId(String(cid));
            if (sid) {
              studentId = sid;
              break;
            }
          }
        }
      }

      mapped.push({
        id: r.id,
        userId: r.userId,
        user: user
          ? {
              id: user.id,
              name: user.name || null,
              email: user.email || null,
              role: user.role || null,
              studentProfile: user.studentProfile || null,
              parentProfile: user.parentProfile || null,
            }
          : null,
        answers: r.answers ? (typeof r.answers === "string" ? JSON.parse(r.answers) : r.answers) : [],
        createdAt: r.createdAt?.toISOString?.() || null,
        updatedAt: r.updatedAt?.toISOString?.() || null,
        studentId,
      });
    }

    return NextResponse.json({ responses: mapped, stats }, { status: 200 });
  } catch (error) {
    console.error("Get survey responses error:", error);
    return NextResponse.json({ error: "응답 목록을 불러오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

