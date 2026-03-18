import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

const parseSignatureDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (match) {
    return { contentType: match[1], base64: match[2] };
  }
  return { contentType: "image/png", base64: dataUrl };
};

const createSchema = z
  .object({
    studentId: z.string(),
    type: z.enum(["결석 (질병)", "결석 (인정)", "결석 (기타)", "조퇴", "지각", "결과"]),
    reason: z.string().min(1, "출결 사유를 입력해주세요."),
    periodFrom: z.string().optional(),
    periodTo: z.string().optional(),
    period: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    writtenAt: z.string(),
    studentSignImage: z.string().optional(),
    guardianSignImage: z.string().optional(),
    teacherSignImage: z.string().optional(),
    attachments: z
      .array(z.object({ name: z.string(), dataUrl: z.string() }))
      .optional(),
  })
  .refine(
    (data) => {
      if (data.type === "조퇴") return !!data.periodFrom;
      if (data.type === "지각") return !!data.periodTo;
      if (data.type === "결과") return !!data.period?.trim();
      return !!data.endDate;
    },
    {
      message:
        "조퇴인 경우 교시(부터)를, 지각인 경우 교시(까지)를, 결과인 경우 교시를, 그 외에는 종료 일자를 입력해주세요.",
    }
  );

// GET: 담임반 출결 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "teacher") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classLabel = searchParams.get("classLabel");
    const month = searchParams.get("month"); // "YYYY-MM"

    if (!classLabel) {
      return NextResponse.json(
        { error: "classLabel이 필요합니다." },
        { status: 400 }
      );
    }

    const teacherId = session.user.id;

    const classStudents = await (prisma as any).user.findMany({
      where: {
        role: "student",
        ...(session.user.school ? { school: session.user.school } : {}),
        studentProfile: {
          classLabel: classLabel.trim(),
        },
      },
      select: { id: true, name: true, studentProfile: { select: { studentId: true } } },
    });
    const studentIds = classStudents.map((s: any) => s.id);
    const studentMap = Object.fromEntries(
      classStudents.map((s: any) => [s.id, s])
    );

    let monthFilter: any = {};
    if (month) {
      const isValidMonth = /^\d{4}-\d{2}$/.test(month);
      if (!isValidMonth) {
        return NextResponse.json(
          { error: "month 형식이 올바르지 않습니다. (YYYY-MM)" },
          { status: 400 }
        );
      }
      const [yStr, mStr] = month.split("-");
      const y = Number(yStr);
      const m = Number(mStr);
      if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
        return NextResponse.json(
          { error: "month 값이 올바르지 않습니다." },
          { status: 400 }
        );
      }

      // UTC 기준 월 범위 [monthStart, monthEndExclusive)
      const monthStart = new Date(Date.UTC(y, m - 1, 1));
      const monthEndExclusive = new Date(Date.UTC(y, m, 1));

      // 해당 월과 "기간이 겹치는" 기록: startDate < monthEndExclusive AND endDate >= monthStart
      monthFilter = {
        startDate: { lt: monthEndExclusive },
        endDate: { gte: monthStart },
      };
    }

    const records =
      studentIds.length > 0
        ? await (prisma as any).homeroomAttendance.findMany({
            where: {
              teacherId,
              studentId: { in: studentIds },
              ...monthFilter,
            },
            orderBy: { createdAt: "desc" },
          })
        : [];

    const teacherName = (session.user as any).name ?? null;
    const school = (session.user as any).school ?? null;

    return NextResponse.json({
      records: records.map((r: any) => ({
        id: r.id,
        studentId: r.studentId,
        studentName: studentMap[r.studentId]?.name ?? null,
        studentNumber: studentMap[r.studentId]?.studentProfile?.studentId ?? null,
        type: r.type,
        reason: r.reason ?? null,
        periodFrom: r.periodFrom ?? null,
        periodTo: r.periodTo ?? null,
        period: r.period ?? null,
        startDate: r.startDate,
        endDate: r.endDate,
        writtenAt: r.writtenAt,
        studentSignUrl: r.studentSignUrl,
        guardianSignUrl: r.guardianSignUrl,
        teacherSignUrl: r.teacherSignUrl ?? null,
        attachments: r.attachments ?? null,
        teacherName,
        school,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET homeroom-attendance error:", error);
    return NextResponse.json(
      { error: "출결 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST: 담임반 출결 등록
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "teacher") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSchema.parse(body);

    const startDate = new Date(parsed.startDate);
    const endDate =
      parsed.type === "조퇴" || parsed.type === "지각" || parsed.type === "결과"
        ? new Date(parsed.startDate)
        : new Date(parsed.endDate!);
    const writtenAt = new Date(parsed.writtenAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(writtenAt.getTime())) {
      return NextResponse.json(
        { error: "날짜 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }
    if (parsed.type !== "조퇴" && parsed.type !== "지각" && parsed.type !== "결과" && endDate < startDate) {
      return NextResponse.json(
        { error: "종료 일자는 시작 일자 이후여야 합니다." },
        { status: 400 }
      );
    }

    let studentSignUrl: string | null = null;
    let guardianSignUrl: string | null = null;
    let teacherSignUrl: string | null = null;

    if (parsed.studentSignImage) {
      const { contentType, base64 } = parseSignatureDataUrl(parsed.studentSignImage);
      const buffer = Buffer.from(base64, "base64");
      const ext = contentType.split("/")[1] || "png";
      const filename = `homeroom-attendance/${parsed.studentId}-student-${Date.now()}.${ext}`;
      const blob = await put(filename, buffer, {
        access: "public",
        contentType,
      });
      studentSignUrl = blob.url;
    }

    if (parsed.guardianSignImage) {
      const { contentType, base64 } = parseSignatureDataUrl(parsed.guardianSignImage);
      const buffer = Buffer.from(base64, "base64");
      const ext = contentType.split("/")[1] || "png";
      const filename = `homeroom-attendance/${parsed.studentId}-guardian-${Date.now()}.${ext}`;
      const blob = await put(filename, buffer, {
        access: "public",
        contentType,
      });
      guardianSignUrl = blob.url;
    }

    if (parsed.teacherSignImage) {
      const { contentType, base64 } = parseSignatureDataUrl(parsed.teacherSignImage);
      const buffer = Buffer.from(base64, "base64");
      const ext = contentType.split("/")[1] || "png";
      const filename = `homeroom-attendance/${parsed.studentId}-teacher-${Date.now()}.${ext}`;
      const blob = await put(filename, buffer, {
        access: "public",
        contentType,
      });
      teacherSignUrl = blob.url;
    }

    const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
    const attachmentData: { url: string; name: string }[] = [];
    if (parsed.attachments && parsed.attachments.length > 0) {
      for (let i = 0; i < parsed.attachments.length; i++) {
        const att = parsed.attachments[i];
        const { contentType, base64 } = parseSignatureDataUrl(att.dataUrl);
        const buffer = Buffer.from(base64, "base64");
        if (buffer.length > MAX_ATTACHMENT_SIZE) {
          return NextResponse.json(
            { error: `첨부 파일 크기는 10MB 이하여야 합니다. (${att.name})` },
            { status: 400 }
          );
        }
        const ext = contentType.split("/")[1] || "bin";
        const safeName = att.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `homeroom-attendance/${parsed.studentId}-att-${Date.now()}-${i}-${safeName}`;
        const blob = await put(filename, buffer, {
          access: "public",
          contentType,
        });
        attachmentData.push({ url: blob.url, name: att.name });
      }
    }

    const record = await (prisma as any).homeroomAttendance.create({
      data: {
        studentId: parsed.studentId,
        teacherId: session.user.id,
        type: parsed.type,
        reason: parsed.reason.trim() || null,
        periodFrom: parsed.type === "조퇴" ? parsed.periodFrom || null : null,
        periodTo: parsed.type === "지각" ? parsed.periodTo || null : null,
        period: parsed.type === "결과" ? parsed.period?.trim() || null : null,
        startDate,
        endDate,
        writtenAt,
        studentSignUrl,
        guardianSignUrl,
        teacherSignUrl,
        attachments: attachmentData.length > 0 ? JSON.stringify(attachmentData) : null,
      },
    });

    return NextResponse.json({
      message: "출결이 등록되었습니다.",
      record: {
        id: record.id,
        studentId: record.studentId,
        type: record.type,
        reason: record.reason,
        startDate: record.startDate,
        endDate: record.endDate,
        writtenAt: record.writtenAt,
        studentSignUrl: record.studentSignUrl,
        guardianSignUrl: record.guardianSignUrl,
        teacherSignUrl: record.teacherSignUrl,
        createdAt: record.createdAt,
      },
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }
    console.error("POST homeroom-attendance error:", error);
    return NextResponse.json(
      { error: "출결 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
